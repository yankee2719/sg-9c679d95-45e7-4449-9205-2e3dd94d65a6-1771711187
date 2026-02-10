// ============================================================================
// STEP 7: DOCUMENT SERVICE (Business Logic)
// ============================================================================
// Orchestrazione completa di:
// - Storage (file upload/download)
// - Database (documents, versions)
// - Audit log (tracking automatico)
// - Access control (permissions check)
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DocumentStorageService, getStorageService, DocumentCategory } from './storageService';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateDocumentParams {
    equipmentId: string;
    title: string;
    description?: string;
    category: DocumentCategory;
    file: File | Buffer;
    regulatoryFramework?: string;
    complianceTags?: string[];
    documentNumber?: string;
    validFrom?: Date;
    validUntil?: Date;
    languageCode?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface UpdateDocumentMetadataParams {
    documentId: string;
    title?: string;
    description?: string;
    complianceTags?: string[];
    validFrom?: Date;
    validUntil?: Date;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface CreateVersionParams {
    documentId: string;
    file: File | Buffer;
    changeReason: string;
    changeSummary?: string;
    newTitle?: string;
    newDescription?: string;
}

export interface Document {
    id: string;
    equipment_id: string;
    title: string;
    description?: string;
    category: DocumentCategory;
    version_number: number;
    is_current_version: boolean;
    file_checksum: string;
    file_size_bytes: number;
    storage_path: string;
    mime_type: string;
    original_filename: string;
    regulatory_framework?: string;
    compliance_tags?: string[];
    document_number?: string;
    valid_from?: string;
    valid_until?: string;
    language_code: string;
    uploaded_by: string;
    uploaded_at: string;
    metadata: Record<string, any>;
    tags?: string[];
    created_at: string;
    updated_at: string;
}

export interface DocumentVersion {
    id: string;
    document_id: string;
    version_number: number;
    file_checksum: string;
    file_size_bytes: number;
    storage_path: string;
    mime_type: string;
    original_filename: string;
    changed_by: string;
    change_reason?: string;
    change_summary?: string;
    title: string;
    description?: string;
    category: DocumentCategory;
    created_at: string;
}

export interface AuditLogEntry {
    id: string;
    document_id: string;
    action: string;
    performed_by: string;
    performed_at: string;
    ip_address?: string;
    user_agent?: string;
    details?: string;
    metadata?: Record<string, any>;
    success: boolean;
}

// ============================================================================
// DOCUMENT SERVICE CLASS
// ============================================================================

export class DocumentService {
    private supabase: SupabaseClient;
    private storage: DocumentStorageService;

    constructor(supabaseUrl: string, supabaseKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.storage = getStorageService();
    }

    // --------------------------------------------------------------------------
    // CREATE DOCUMENT
    // --------------------------------------------------------------------------

    /**
     * Create new document with automatic:
     * - File upload to storage
     * - SHA-256 checksum calculation
     * - Database record creation
     * - Initial version creation (via trigger)
     * - Audit log entry (via trigger)
     */
    async createDocument(
        params: CreateDocumentParams,
        userId: string
    ): Promise<Document> {
        try {
            // 1. Upload file to storage
            const uploadResult = await this.storage.uploadDocument({
                file: params.file,
                equipmentId: params.equipmentId,
                category: params.category,
                filename: params.file instanceof File ? params.file.name : undefined,
            });

            // 2. Insert into database
            const { data, error } = await this.supabase
                .from('documents')
                .insert({
                    equipment_id: params.equipmentId,
                    title: params.title,
                    description: params.description,
                    category: params.category,
                    file_checksum: uploadResult.fileChecksum,
                    file_size_bytes: uploadResult.fileSizeBytes,
                    storage_path: uploadResult.storagePath,
                    mime_type: uploadResult.mimeType,
                    original_filename: uploadResult.originalFilename,
                    regulatory_framework: params.regulatoryFramework,
                    compliance_tags: params.complianceTags,
                    document_number: params.documentNumber,
                    valid_from: params.validFrom?.toISOString(),
                    valid_until: params.validUntil?.toISOString(),
                    language_code: params.languageCode || 'it',
                    uploaded_by: userId,
                    metadata: params.metadata || {},
                    tags: params.tags || [],
                })
                .select()
                .single();

            if (error) {
                // Rollback: delete uploaded file
                await this.storage.deleteDocument(uploadResult.storagePath).catch(() => { });
                throw new Error(`Database insert failed: ${error.message}`);
            }

            return data as Document;

        } catch (error) {
            console.error('Create document failed:', error);
            throw error;
        }
    }

    // --------------------------------------------------------------------------
    // CREATE NEW VERSION
    // --------------------------------------------------------------------------

    /**
     * Create new version of existing document
     * Uses database function for atomic version increment
     */
    async createNewVersion(
        params: CreateVersionParams,
        userId: string
    ): Promise<Document> {
        try {
            // 1. Get current document info
            const { data: currentDoc, error: fetchError } = await this.supabase
                .from('documents')
                .select('equipment_id, category, version_number')
                .eq('id', params.documentId)
                .eq('is_current_version', true)
                .single();

            if (fetchError || !currentDoc) {
                throw new Error('Current document not found');
            }

            // 2. Upload new version to storage
            const uploadResult = await this.storage.uploadNewVersion(
                {
                    file: params.file,
                    equipmentId: currentDoc.equipment_id,
                    category: currentDoc.category,
                    filename: params.file instanceof File ? params.file.name : undefined,
                },
                currentDoc.version_number
            );

            // 3. Call database function to create new version
            const { data, error } = await this.supabase.rpc('create_document_new_version', {
                p_document_id: params.documentId,
                p_new_file_checksum: uploadResult.fileChecksum,
                p_new_file_size_bytes: uploadResult.fileSizeBytes,
                p_new_storage_path: uploadResult.storagePath,
                p_new_mime_type: uploadResult.mimeType,
                p_new_original_filename: uploadResult.originalFilename,
                p_uploaded_by: userId,
                p_change_reason: params.changeReason,
                p_change_summary: params.changeSummary,
                p_new_title: params.newTitle,
                p_new_description: params.newDescription,
            });

            if (error) {
                // Rollback: delete uploaded file
                await this.storage.deleteDocument(uploadResult.storagePath).catch(() => { });
                throw new Error(`Version creation failed: ${error.message}`);
            }

            // 4. Fetch the new document
            const { data: newDoc, error: newDocError } = await this.supabase
                .from('documents')
                .select()
                .eq('id', data)
                .single();

            if (newDocError) {
                throw new Error('Failed to fetch new version');
            }

            return newDoc as Document;

        } catch (error) {
            console.error('Create version failed:', error);
            throw error;
        }
    }

    // --------------------------------------------------------------------------
    // GET DOCUMENT BY ID
    // --------------------------------------------------------------------------

    async getDocumentById(documentId: string): Promise<Document | null> {
        const { data, error } = await this.supabase
            .from('documents')
            .select()
            .eq('id', documentId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw new Error(`Get document failed: ${error.message}`);
        }

        return data as Document;
    }

    // --------------------------------------------------------------------------
    // GET DOCUMENTS BY EQUIPMENT
    // --------------------------------------------------------------------------

    async getDocumentsByEquipment(
        equipmentId: string,
        currentVersionOnly: boolean = true
    ): Promise<Document[]> {
        let query = this.supabase
            .from('documents')
            .select()
            .eq('equipment_id', equipmentId);

        if (currentVersionOnly) {
            query = query.eq('is_current_version', true);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Get documents failed: ${error.message}`);
        }

        return data as Document[];
    }

    // --------------------------------------------------------------------------
    // GET VERSION HISTORY
    // --------------------------------------------------------------------------

    async getVersionHistory(documentId: string): Promise<DocumentVersion[]> {
        const { data, error } = await this.supabase
            .from('document_versions')
            .select()
            .eq('document_id', documentId)
            .order('version_number', { ascending: false });

        if (error) {
            throw new Error(`Get version history failed: ${error.message}`);
        }

        return data as DocumentVersion[];
    }

    // --------------------------------------------------------------------------
    // UPDATE DOCUMENT METADATA
    // --------------------------------------------------------------------------

    /**
     * Update document metadata only (file is immutable)
     */
    async updateDocumentMetadata(
        params: UpdateDocumentMetadataParams,
        userId: string
    ): Promise<Document> {
        const updateData: any = {};

        if (params.title) updateData.title = params.title;
        if (params.description !== undefined) updateData.description = params.description;
        if (params.complianceTags) updateData.compliance_tags = params.complianceTags;
        if (params.validFrom) updateData.valid_from = params.validFrom.toISOString();
        if (params.validUntil) updateData.valid_until = params.validUntil.toISOString();
        if (params.tags) updateData.tags = params.tags;
        if (params.metadata) updateData.metadata = params.metadata;

        const { data, error } = await this.supabase
            .from('documents')
            .update(updateData)
            .eq('id', params.documentId)
            .select()
            .single();

        if (error) {
            throw new Error(`Update metadata failed: ${error.message}`);
        }

        return data as Document;
    }

    // --------------------------------------------------------------------------
    // LOG DOCUMENT ACTION (Manual - per viewed/downloaded)
    // --------------------------------------------------------------------------

    async logDocumentAction(
        documentId: string,
        action: 'viewed' | 'downloaded' | 'signed',
        userId: string,
        details?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        const { error } = await this.supabase.rpc('log_document_action', {
            p_document_id: documentId,
            p_action: action,
            p_performed_by: userId,
            p_details: details,
            p_metadata: metadata || {},
        });

        if (error) {
            console.error('Log action failed:', error);
            // Non throw - audit log failure shouldn't block operation
        }
    }

    // --------------------------------------------------------------------------
    // GET AUDIT LOG
    // --------------------------------------------------------------------------

    async getAuditLog(documentId: string, limit: number = 100): Promise<AuditLogEntry[]> {
        const { data, error } = await this.supabase
            .from('document_audit_log')
            .select()
            .eq('document_id', documentId)
            .order('performed_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw new Error(`Get audit log failed: ${error.message}`);
        }

        return data as AuditLogEntry[];
    }

    // --------------------------------------------------------------------------
    // DOWNLOAD DOCUMENT
    // --------------------------------------------------------------------------

    async downloadDocument(documentId: string, userId: string): Promise<{
        blob: Blob;
        filename: string;
        mimeType: string;
    }> {
        // 1. Get document info
        const document = await this.getDocumentById(documentId);
        if (!document) {
            throw new Error('Document not found');
        }

        // 2. Download from storage
        const blob = await this.storage.downloadDocument(document.storage_path);

        // 3. Log download action
        await this.logDocumentAction(
            documentId,
            'downloaded',
            userId,
            `Downloaded version ${document.version_number}`
        );

        return {
            blob,
            filename: document.original_filename,
            mimeType: document.mime_type,
        };
    }

    // --------------------------------------------------------------------------
    // GET SIGNED URL (temporary access)
    // --------------------------------------------------------------------------

    async getSignedUrl(
        documentId: string,
        expiresIn: number = 3600
    ): Promise<string> {
        const document = await this.getDocumentById(documentId);
        if (!document) {
            throw new Error('Document not found');
        }

        return await this.storage.getSignedUrl(document.storage_path, expiresIn);
    }

    // --------------------------------------------------------------------------
    // DELETE DOCUMENT (soft delete recommended)
    // --------------------------------------------------------------------------

    async deleteDocument(documentId: string): Promise<void> {
        // Nota: Considera soft-delete aggiungendo campo deleted_at invece
        const { error } = await this.supabase
            .from('documents')
            .delete()
            .eq('id', documentId);

        if (error) {
            throw new Error(`Delete document failed: ${error.message}`);
        }

        // Storage cleanup can be done with a scheduled job
    }

    // --------------------------------------------------------------------------
    // CHECK USER PERMISSION
    // --------------------------------------------------------------------------

    async checkUserPermission(
        userId: string,
        documentId: string,
        requiredPermission: 'view' | 'download' | 'sign' | 'manage'
    ): Promise<boolean> {
        const { data, error } = await this.supabase.rpc('check_user_document_permission', {
            p_user_id: userId,
            p_document_id: documentId,
            p_required_permission: requiredPermission,
        });

        if (error) {
            console.error('Permission check failed:', error);
            return false;
        }

        return data === true;
    }

    // --------------------------------------------------------------------------
    // SEARCH DOCUMENTS
    // --------------------------------------------------------------------------

    async searchDocuments(params: {
        query?: string;
        category?: DocumentCategory;
        equipmentId?: string;
        complianceTags?: string[];
        limit?: number;
    }): Promise<Document[]> {
        let query = this.supabase
            .from('documents')
            .select()
            .eq('is_current_version', true);

        if (params.equipmentId) {
            query = query.eq('equipment_id', params.equipmentId);
        }

        if (params.category) {
            query = query.eq('category', params.category);
        }

        if (params.complianceTags && params.complianceTags.length > 0) {
            query = query.overlaps('compliance_tags', params.complianceTags);
        }

        if (params.query) {
            query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(params.limit || 50);

        if (error) {
            throw new Error(`Search failed: ${error.message}`);
        }

        return data as Document[];
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let documentServiceInstance: DocumentService | null = null;

export function getDocumentService(): DocumentService {
    if (!documentServiceInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL and Key must be configured');
        }

        documentServiceInstance = new DocumentService(supabaseUrl, supabaseKey);
    }

    return documentServiceInstance;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
import { getDocumentService } from '@/services/documentService';

// Example 1: Create document
const docService = getDocumentService();

const newDoc = await docService.createDocument({
  equipmentId: 'equipment-uuid',
  title: 'Technical Manual Rev.2',
  description: 'Updated technical specifications',
  category: 'technical_manual',
  file: uploadedFile,
  complianceTags: ['CE', 'ISO9001'],
  languageCode: 'it',
  tags: ['machinery', 'safety'],
}, userId);

console.log('Document created:', newDoc.id);

// Example 2: Create new version
const newVersion = await docService.createNewVersion({
  documentId: existingDocId,
  file: newFile,
  changeReason: 'Updated safety warnings',
  changeSummary: 'Added chapter 5 about emergency procedures',
}, userId);

// Example 3: Download document (with audit log)
const { blob, filename } = await docService.downloadDocument(docId, userId);

// Trigger browser download
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
a.click();

// Example 4: Get version history
const versions = await docService.getVersionHistory(docId);
console.log(`Document has ${versions.length} versions`);

// Example 5: Check permission before action
const canDownload = await docService.checkUserPermission(
  userId,
  docId,
  'download'
);

if (canDownload) {
  // Allow download
}

// Example 6: Search documents
const results = await docService.searchDocuments({
  query: 'safety',
  category: 'technical_manual',
  complianceTags: ['CE'],
  limit: 20,
});
*/