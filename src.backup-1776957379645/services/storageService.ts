// ============================================================================
// STORAGE SERVICE - FIXED
// ============================================================================
// Fixes:
// - Removed Node.js crypto import (crashes in browser)
// - Uses Web Crypto API for SHA-256 checksums
// - Compatible with both browser and server environments
// ============================================================================

import { createClient } from '@supabase/supabase-js';

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
    filename?: string;
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

const STORAGE_BUCKET = 'equipment-documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
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
    // SHA-256 CHECKSUM CALCULATION (Web Crypto API - browser compatible)
    // --------------------------------------------------------------------------

    async calculateChecksum(file: File | Buffer): Promise<string> {
        let buffer: ArrayBuffer;

        if (file instanceof File) {
            buffer = await file.arrayBuffer();
        } else if (Buffer.isBuffer(file)) {
            // Convert Node.js Buffer to ArrayBuffer
            buffer = file.buffer.slice(
                file.byteOffset,
                file.byteOffset + file.byteLength
            );
        } else {
            throw new Error('Unsupported file type for checksum calculation');
        }

        // Use Web Crypto API (works in both modern browsers and Node.js 18+)
        const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // --------------------------------------------------------------------------
    // STORAGE PATH GENERATION
    // --------------------------------------------------------------------------

    generateStoragePath(config: StoragePathConfig): string {
        const { equipmentId, category, version, filename } = config;

        const sanitizedFilename = filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_{2,}/g, '_');

        const versionSuffix = version ? `_v${version}` : '';
        const parts = sanitizedFilename.split(/\.(?=[^.]+$)/);
        const name = parts[0];
        const ext = parts[1];
        const finalFilename = ext
            ? `${name}${versionSuffix}.${ext}`
            : `${sanitizedFilename}${versionSuffix}`;

        return `${equipmentId}/${category}/${Date.now()}_${finalFilename}`;
    }

    // --------------------------------------------------------------------------
    // FILE VALIDATION
    // --------------------------------------------------------------------------

    validateFile(file: File | Buffer, _filename: string): void {
        const fileSize = file instanceof File ? file.size : file.length;
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error(
                `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`
            );
        }

        if (fileSize === 0) {
            throw new Error('File is empty');
        }

        if (file instanceof File) {
            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                throw new Error(`File type ${file.type} not allowed`);
            }
        }
    }

    // --------------------------------------------------------------------------
    // UPLOAD DOCUMENT
    // --------------------------------------------------------------------------

    async uploadDocument(params: UploadDocumentParams): Promise<UploadResult> {
        const { file, equipmentId, category, filename } = params;

        const originalFilename =
            filename || (file instanceof File ? file.name : 'document');

        this.validateFile(file, originalFilename);

        const fileChecksum = await this.calculateChecksum(file);

        const storagePath = this.generateStoragePath({
            equipmentId,
            category,
            filename: originalFilename,
        });

        const fileSizeBytes = file instanceof File ? file.size : file.length;
        const mimeType =
            file instanceof File ? file.type : 'application/octet-stream';

        const { error } = await this.supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, {
                contentType: mimeType,
                upsert: false,
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
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
    // UPLOAD NEW VERSION
    // --------------------------------------------------------------------------

    async uploadNewVersion(
        params: UploadDocumentParams,
        currentVersionNumber: number
    ): Promise<UploadResult> {
        const { file, equipmentId, category, filename } = params;

        const originalFilename =
            filename || (file instanceof File ? file.name : 'document');

        this.validateFile(file, originalFilename);

        const fileChecksum = await this.calculateChecksum(file);

        const storagePath = this.generateStoragePath({
            equipmentId,
            category,
            version: currentVersionNumber + 1,
            filename: originalFilename,
        });

        const fileSizeBytes = file instanceof File ? file.size : file.length;
        const mimeType =
            file instanceof File ? file.type : 'application/octet-stream';

        const { error } = await this.supabase.storage
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
    // GET SIGNED URL
    // --------------------------------------------------------------------------

    async getSignedUrl(
        storagePath: string,
        expiresIn: number = 3600
    ): Promise<string> {
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
    // DELETE DOCUMENT
    // --------------------------------------------------------------------------

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

    async fileExists(storagePath: string): Promise<boolean> {
        const parts = storagePath.split('/');
        const folder = parts.slice(0, -1).join('/');
        const filename = parts[parts.length - 1];

        const { data, error } = await this.supabase.storage
            .from(STORAGE_BUCKET)
            .list(folder);

        if (error) {
            return false;
        }

        return data?.some((file) => file.name === filename) ?? false;
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let storageServiceInstance: DocumentStorageService | null = null;

export function getStorageService(): DocumentStorageService {
    if (!storageServiceInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL and Key must be configured');
        }

        storageServiceInstance = new DocumentStorageService(
            supabaseUrl,
            supabaseKey
        );
    }

    return storageServiceInstance;
}
