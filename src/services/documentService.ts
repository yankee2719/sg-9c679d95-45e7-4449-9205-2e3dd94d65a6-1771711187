// src/services/documentService.ts
// ============================================================================
// DOCUMENT SERVICE — replaces old documentService.ts + storageService.ts
// ============================================================================
// Changes:
//   - Backed by real documents + document_versions + document_audit_logs tables
//   - SHA-256 checksum calculated client-side, stored in document_versions
//   - Immutable version chain (document_versions is append-only)
//   - Storage path: /{org_id}/{plant_id}/{machine_id}/{category}/{filename}
//   - Removed: all references to non-existent tables
//   - Merged: storageService logic into this single service
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

export type DocumentCategory =
    | 'technical_manual'
    | 'risk_assessment'
    | 'ce_declaration'
    | 'electrical_schema'
    | 'maintenance_manual'
    | 'spare_parts_catalog'
    | 'training_material'
    | 'inspection_report'
    | 'certificate'
    | 'photo'
    | 'video'
    | 'other';

export interface Document {
    id: string;
    organization_id: string;
    plant_id: string | null;
    machine_id: string | null;
    title: string;
    description: string | null;
    category: DocumentCategory;
    language: string;
    is_mandatory: boolean;
    regulatory_reference: string | null;
    current_version_id: string | null;
    version_count: number;
    tags: string[];
    is_archived: boolean;
    created_at: string;
    updated_at: string;
}

export interface DocumentVersion {
    id: string;
    document_id: string;
    version_number: number;
    previous_version_id: string | null;
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    checksum_sha256: string;
    change_summary: string | null;
    signed_by: string | null;
    signed_at: string | null;
    created_at: string;
    created_by: string;
}

export interface DocumentWithVersion extends Document {
    current_version?: DocumentVersion;
    machine?: { id: string; name: string };
    plant?: { id: string; name: string };
}

export interface UploadDocumentParams {
    organizationId: string;
    plantId?: string;
    machineId?: string;
    title: string;
    description?: string;
    category: DocumentCategory;
    file: File;
    isMandatory?: boolean;
    regulatoryReference?: string;
    tags?: string[];
    language?: string;
}

export interface AddVersionParams {
    documentId: string;
    file: File;
    changeSummary?: string;
}

// ============================================================================
// CHECKSUM UTILITY
// ============================================================================

async function calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildStoragePath(
    orgId: string,
    plantId: string | null,
    machineId: string | null,
    category: string,
    fileName: string
): string {
    const parts = [orgId];
    if (plantId) parts.push(plantId);
    if (machineId) parts.push(machineId);
    parts.push(category);
    // Add timestamp to prevent collisions
    const ext = fileName.split('.').pop() || '';
    const base = fileName.replace(/\.[^.]+$/, '');
    const timestamp = Date.now();
    parts.push(`${base}_${timestamp}.${ext}`);
    return parts.join('/');
}

// ============================================================================
// SERVICE
// ============================================================================

export const documentService = {

    // ─── LIST ────────────────────────────────────────────────────────────

    async getDocuments(
        organizationId: string,
        filters?: {
            machineId?: string;
            plantId?: string;
            category?: DocumentCategory;
            isMandatory?: boolean;
            searchQuery?: string;
        }
    ): Promise<DocumentWithVersion[]> {
        let query = supabase
            .from('documents')
            .select(`
                *,
                current_version:document_versions!fk_documents_current_version (*),
                machine:machines (id, name),
                plant:plants (id, name)
            `)
            .eq('organization_id', organizationId)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false });

        if (filters?.machineId) query = query.eq('machine_id', filters.machineId);
        if (filters?.plantId) query = query.eq('plant_id', filters.plantId);
        if (filters?.category) query = query.eq('category', filters.category);
        if (filters?.isMandatory !== undefined) query = query.eq('is_mandatory', filters.isMandatory);
        if (filters?.searchQuery) query = query.ilike('title', `%${filters.searchQuery}%`);

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching documents:', error);
            return [];
        }
        return (data as unknown as DocumentWithVersion[]) || [];
    },

    // ✅ NUOVO: Helper per ottenere documenti per equipment (machine)
    async getDocumentsByEquipment(equipmentId: string): Promise<DocumentWithVersion[]> {
        // Ottieni l'organization_id dalla macchina
        const { data: machine, error: machineError } = await supabase
            .from('machines')
            .select('organization_id')
            .eq('id', equipmentId)
            .single();

        if (machineError || !machine) {
            console.error('Error fetching machine:', machineError);
            return [];
        }

        // Usa il metodo esistente con il filtro machineId
        return this.getDocuments(machine.organization_id, { machineId: equipmentId });
    },

    async getDocumentById(id: string): Promise<DocumentWithVersion | null> {
        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                current_version:document_versions!fk_documents_current_version (*),
                machine:machines (id, name),
                plant:plants (id, name)
            `)
            .eq('id', id)
            .single();

        if (error) return null;

        // Log view in audit
        await this.logAudit(id, null, 'viewed');

        return data as unknown as DocumentWithVersion;
    },

    // ─── UPLOAD (create document + first version) ────────────────────────

    async uploadDocument(params: UploadDocumentParams): Promise<Document | null> {
        try {
            // 1. Calculate checksum
            const checksum = await calculateChecksum(params.file);

            // 2. Build storage path
            const storagePath = buildStoragePath(
                params.organizationId,
                params.plantId || null,
                params.machineId || null,
                params.category,
                params.file.name
            );

            // 3. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(storagePath, params.file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            // 4. Create document record
            const { data: doc, error: docError } = await supabase
                .from('documents')
                .insert({
                    organization_id: params.organizationId,
                    plant_id: params.plantId || null,
                    machine_id: params.machineId || null,
                    title: params.title,
                    description: params.description || null,
                    category: params.category,
                    language: params.language || 'it',
                    is_mandatory: params.isMandatory || false,
                    regulatory_reference: params.regulatoryReference || null,
                    tags: params.tags || [],
                })
                .select()
                .single();

            if (docError) throw docError;

            // 5. Create first version
            const { data: { user } } = await supabase.auth.getUser();

            const { error: versionError } = await supabase
                .from('document_versions')
                .insert({
                    document_id: doc.id,
                    version_number: 1,
                    file_path: storagePath,
                    file_name: params.file.name,
                    file_size: params.file.size,
                    mime_type: params.file.type || 'application/octet-stream',
                    checksum_sha256: checksum,
                    change_summary: 'Versione iniziale',
                    created_by: user!.id,
                });

            if (versionError) throw versionError;

            // 6. Log audit
            await this.logAudit(doc.id, null, 'created');

            return doc;
        } catch (error) {
            console.error('Error uploading document:', error);
            return null;
        }
    },

    // ─── ADD VERSION ─────────────────────────────────────────────────────

    async addVersion(params: AddVersionParams): Promise<DocumentVersion | null> {
        try {
            // 1. Get current document
            const { data: doc } = await supabase
                .from('documents')
                .select('*, current_version:document_versions!fk_documents_current_version (id, file_path)')
                .eq('id', params.documentId)
                .single();

            if (!doc) throw new Error('Document not found');

            // 2. Calculate checksum
            const checksum = await calculateChecksum(params.file);

            // 3. Build storage path (reuse org/plant/machine structure)
            const oldPath = (doc as any).current_version?.file_path || '';
            const pathParts = oldPath.split('/');
            pathParts.pop(); // Remove old filename
            const ext = params.file.name.split('.').pop() || '';
            const base = params.file.name.replace(/\.[^.]+$/, '');
            pathParts.push(`${base}_${Date.now()}.${ext}`);
            const storagePath = pathParts.join('/');

            // 4. Upload file
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(storagePath, params.file, { upsert: false });

            if (uploadError) throw uploadError;

            // 5. Create version record
            const { data: { user } } = await supabase.auth.getUser();

            const { data: version, error } = await supabase
                .from('document_versions')
                .insert({
                    document_id: params.documentId,
                    version_number: doc.version_count + 1,
                    previous_version_id: doc.current_version_id,
                    file_path: storagePath,
                    file_name: params.file.name,
                    file_size: params.file.size,
                    mime_type: params.file.type || 'application/octet-stream',
                    checksum_sha256: checksum,
                    change_summary: params.changeSummary || null,
                    created_by: user!.id,
                })
                .select()
                .single();

            // Note: trigger update_document_version_count auto-updates document

            if (error) throw error;

            // 6. Log audit
            await this.logAudit(params.documentId, version.id, 'version_added');

            return version;
        } catch (error) {
            console.error('Error adding version:', error);
            return null;
        }
    },

    // ─── VERSION HISTORY ─────────────────────────────────────────────────

    async getVersionHistory(documentId: string): Promise<DocumentVersion[]> {
        const { data, error } = await supabase
            .from('document_versions')
            .select('*')
            .eq('document_id', documentId)
            .order('version_number', { ascending: false });

        if (error) return [];
        return data || [];
    },

    // ─── DOWNLOAD ────────────────────────────────────────────────────────

    async downloadVersion(versionId: string): Promise<string | null> {
        const { data: version } = await supabase
            .from('document_versions')
            .select('file_path, document_id')
            .eq('id', versionId)
            .single();

        if (!version) return null;

        const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(version.file_path, 3600); // 1 hour

        if (error) return null;

        // Log download
        await this.logAudit(version.document_id, versionId, 'downloaded');

        return data.signedUrl;
    },

    // ─── ARCHIVE ─────────────────────────────────────────────────────────

    async archiveDocument(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('documents')
            .update({ is_archived: true, archived_at: new Date().toISOString() })
            .eq('id', id);

        if (!error) await this.logAudit(id, null, 'archived');
        return !error;
    },

    // ─── AUDIT LOG ───────────────────────────────────────────────────────

    async logAudit(
        documentId: string,
        versionId: string | null,
        action: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('document_audit_logs').insert({
            document_id: documentId,
            version_id: versionId,
            action,
            actor_id: user?.id || null,
            metadata: metadata || {},
        });
    },

    async getAuditLog(documentId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('document_audit_logs')
            .select(`
                *,
                actor:profiles (id, display_name, email)
            `)
            .eq('document_id', documentId)
            .order('created_at', { ascending: false });

        if (error) return [];
        return data || [];
    },

    // ─── COMPLIANCE CHECK ────────────────────────────────────────────────

    async getMandatoryDocumentStatus(
        organizationId: string,
        machineId?: string
    ): Promise<{ category: DocumentCategory; exists: boolean; documentId?: string }[]> {
        const mandatoryCategories: DocumentCategory[] = [
            'technical_manual',
            'risk_assessment',
            'ce_declaration',
            'electrical_schema',
            'maintenance_manual',
        ];

        let query = supabase
            .from('documents')
            .select('id, category')
            .eq('organization_id', organizationId)
            .eq('is_mandatory', true)
            .eq('is_archived', false);

        if (machineId) query = query.eq('machine_id', machineId);

        const { data } = await query;
        const existingCategories = new Set((data || []).map(d => d.category));

        return mandatoryCategories.map(cat => ({
            category: cat,
            exists: existingCategories.has(cat),
            documentId: (data || []).find(d => d.category === cat)?.id,
        }));
    },
};