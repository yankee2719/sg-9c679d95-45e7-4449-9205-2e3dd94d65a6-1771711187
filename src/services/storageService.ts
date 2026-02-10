// ============================================================================
// STEP 6: STORAGE SERVICE
// ============================================================================
// Storage service per gestire upload/download documenti con:
// - SHA-256 checksum calculation
// - Structured storage paths
// - File validation
// - Supabase Storage integration
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export type DocumentCategory =
    | 'technical_manual'
    | 'user_manual'
    | 'maintenance_manual'
    | 'spare_parts_catalog'
    | 'wiring_diagram'
    | 'pneumatic_diagram'
    | 'hydraulic_diagram'
    | 'ce_declaration'
    | 'ukca_declaration'
    | 'risk_assessment'
    | 'safety_datasheet'
    | 'atex_certificate'
    | 'iso_certificate'
    | 'contract'
    | 'warranty'
    | 'insurance_policy'
    | 'quality_certificate'
    | 'inspection_report'
    | 'training_certificate'
    | 'photo'
    | 'video'
    | 'other';

export interface UploadDocumentParams {
    file: File | Buffer;
    equipmentId: string;
    category: DocumentCategory;
    filename?: string; // Optional override
}

export interface UploadResult {
    storagePath: string;
    fileChecksum: string;
    fileSizeBytes: number;
    mimeType: string;
    originalFilename: string;
    publicUrl?: string;
}

export interface StoragePathConfig {
    equipmentId: string;
    category: DocumentCategory;
    version?: number;
    filename: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_BUCKET = 'documents'; // Supabase bucket name
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/plain',
    'text/csv',
];

// ============================================================================
// STORAGE SERVICE CLASS
// ============================================================================

export class DocumentStorageService {
    private supabase: ReturnType<typeof createClient>;

    constructor(supabaseUrl: string, supabaseKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    // --------------------------------------------------------------------------
    // SHA-256 CHECKSUM CALCULATION
    // --------------------------------------------------------------------------

    /**
     * Calculate SHA-256 checksum of file
     * Browser: Uses Web Crypto API
     * Node: Uses crypto module
     */
    async calculateChecksum(file: File | Buffer): Promise<string> {
        if (typeof window !== 'undefined' && file instanceof File) {
            // Browser environment
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else if (Buffer.isBuffer(file)) {
            // Node.js environment
            return crypto.createHash('sha256').update(file).digest('hex');
        } else {
            throw new Error('Unsupported file type for checksum calculation');
        }
    }

    // --------------------------------------------------------------------------
    // STORAGE PATH GENERATION
    // --------------------------------------------------------------------------

    /**
     * Generate structured storage path
     * Pattern: /equipment/{equipmentId}/documents/{category}/{filename}
     * 
     * Quando implementeremo Organization Engine, diventerà:
     * /manufacturer/{mId}/customer/{cId}/plant/{pId}/machine/{mId}/documents/{category}/{filename}
     */
    generateStoragePath(config: StoragePathConfig): string {
        const { equipmentId, category, version, filename } = config;

        // Sanitize filename (remove special chars, spaces)
        const sanitizedFilename = filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_{2,}/g, '_');

        // Add version suffix if provided
        const versionSuffix = version ? `_v${version}` : '';
        const [name, ext] = sanitizedFilename.split(/\.(?=[^.]+$)/);
        const finalFilename = ext
            ? `${name}${versionSuffix}.${ext}`
            : `${sanitizedFilename}${versionSuffix}`;

        return `/equipment/${equipmentId}/documents/${category}/${finalFilename}`;
    }

    // --------------------------------------------------------------------------
    // FILE VALIDATION
    // --------------------------------------------------------------------------

    validateFile(file: File | Buffer, filename: string): void {
        // Check file size
        const fileSize = file instanceof File ? file.size : file.length;
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
        }

        if (fileSize === 0) {
            throw new Error('File is empty');
        }

        // Check MIME type
        if (file instanceof File) {
            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                throw new Error(`File type ${file.type} not allowed`);
            }
        }
    }

    // --------------------------------------------------------------------------
    // UPLOAD DOCUMENT
    // --------------------------------------------------------------------------

    /**
     * Upload document to Supabase Storage
     * Returns storage path, checksum, and metadata
     */
    async uploadDocument(params: UploadDocumentParams): Promise<UploadResult> {
        const { file, equipmentId, category, filename } = params;

        // Determine filename
        const originalFilename = filename || (file instanceof File ? file.name : 'document');

        // Validate file
        this.validateFile(file, originalFilename);

        // Calculate checksum
        const fileChecksum = await this.calculateChecksum(file);

        // Generate storage path
        const storagePath = this.generateStoragePath({
            equipmentId,
            category,
            filename: originalFilename,
        });

        // Get file size and MIME type
        const fileSizeBytes = file instanceof File ? file.size : file.length;
        const mimeType = file instanceof File ? file.type : 'application/octet-stream';

        // Upload to Supabase Storage
        const { data, error } = await this.supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, {
                contentType: mimeType,
                upsert: false, // Don't overwrite - enforce immutability
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL (optional - dipende da bucket settings)
        const { data: urlData } = this.supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(storagePath);

        return {
            storagePath,
            fileChecksum,
            fileSizeBytes,
            mimeType,
            originalFilename,
            publicUrl: urlData?.publicUrl,
        };
    }

    // --------------------------------------------------------------------------
    // UPLOAD NEW VERSION
    // --------------------------------------------------------------------------

    /**
     * Upload new version of existing document
     * Automatically increments version number in filename
     */
    async uploadNewVersion(
        params: UploadDocumentParams,
        currentVersionNumber: number
    ): Promise<UploadResult> {
        const { file, equipmentId, category, filename } = params;

        const originalFilename = filename || (file instanceof File ? file.name : 'document');

        this.validateFile(file, originalFilename);

        const fileChecksum = await this.calculateChecksum(file);

        // Generate path with version number
        const storagePath = this.generateStoragePath({
            equipmentId,
            category,
            version: currentVersionNumber + 1,
            filename: originalFilename,
        });

        const fileSizeBytes = file instanceof File ? file.size : file.length;
        const mimeType = file instanceof File ? file.type : 'application/octet-stream';

        const { data, error } = await this.supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, {
                contentType: mimeType,
                upsert: false,
            });

        if (error) {
            throw new Error(`Version upload failed: ${error.message}`);
        }

        const { data: urlData } = this.supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(storagePath);

        return {
            storagePath,
            fileChecksum,
            fileSizeBytes,
            mimeType,
            originalFilename,
            publicUrl: urlData?.publicUrl,
        };
    }

    // --------------------------------------------------------------------------
    // DOWNLOAD DOCUMENT
    // --------------------------------------------------------------------------

    /**
     * Download document from storage
     */
    async downloadDocument(storagePath: string): Promise<Blob> {
        const { data, error } = await this.supabase.storage
            .from(STORAGE_BUCKET)
            .download(storagePath);

        if (error) {
            throw new Error(`Download failed: ${error.message}`);
        }

        if (!data) {
            throw new Error('No data returned from download');
        }

        return data;
    }

    // --------------------------------------------------------------------------
    // GET SIGNED URL (for temporary access)
    // --------------------------------------------------------------------------

    /**
     * Generate temporary signed URL for document access
     * Useful for sharing documents with expiration
     */
    async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
        const { data, error } = await this.supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(storagePath, expiresIn);

        if (error) {
            throw new Error(`Failed to create signed URL: ${error.message}`);
        }

        if (!data?.signedUrl) {
            throw new Error('No signed URL returned');
        }

        return data.signedUrl;
    }

    // --------------------------------------------------------------------------
    // DELETE DOCUMENT (admin only - use with caution)
    // --------------------------------------------------------------------------

    /**
     * Delete document from storage
     * WARNING: This is permanent! Consider soft-delete in database instead.
     */
    async deleteDocument(storagePath: string): Promise<void> {
        const { error } = await this.supabase.storage
            .from(STORAGE_BUCKET)
            .remove([storagePath]);

        if (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    // --------------------------------------------------------------------------
    // CHECK IF FILE EXISTS
    // --------------------------------------------------------------------------

    /**
     * Check if file exists at storage path
     */
    async fileExists(storagePath: string): Promise<boolean> {
        const { data, error } = await this.supabase.storage
            .from(STORAGE_BUCKET)
            .list(storagePath.split('/').slice(0, -1).join('/'));

        if (error) {
            return false;
        }

        const filename = storagePath.split('/').pop();
        return data?.some(file => file.name === filename) ?? false;
    }
}

// ============================================================================
// SINGLETON INSTANCE (for convenience)
// ============================================================================

let storageServiceInstance: DocumentStorageService | null = null;

export function getStorageService(): DocumentStorageService {
    if (!storageServiceInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL and Key must be configured');
        }

        storageServiceInstance = new DocumentStorageService(supabaseUrl, supabaseKey);
    }

    return storageServiceInstance;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Upload document
const storageService = getStorageService();

const result = await storageService.uploadDocument({
  file: uploadedFile,
  equipmentId: 'equipment-uuid-123',
  category: 'technical_manual',
});

console.log('Checksum:', result.fileChecksum);
console.log('Path:', result.storagePath);

// Example 2: Upload new version
const newVersionResult = await storageService.uploadNewVersion(
  {
    file: newFile,
    equipmentId: 'equipment-uuid-123',
    category: 'technical_manual',
  },
  2 // current version number
);

// Example 3: Download document
const blob = await storageService.downloadDocument('/equipment/123/documents/technical_manual/manual.pdf');

// Example 4: Get temporary access URL
const signedUrl = await storageService.getSignedUrl(
  '/equipment/123/documents/technical_manual/manual.pdf',
  3600 // 1 hour
);

// Example 5: Check checksum match (verify integrity)
const uploadedChecksum = result.fileChecksum;
const recalculatedChecksum = await storageService.calculateChecksum(file);
if (uploadedChecksum === recalculatedChecksum) {
  console.log('✅ File integrity verified');
}
*/