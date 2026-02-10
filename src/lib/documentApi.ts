import { supabase } from './supabase';
import { calculateChecksum } from './documentUtils';

export interface UploadDocumentParams {
    organizationId: string;
    categoryCode: string;
    file: File;
    title: string;
    description?: string;
    documentCode?: string;
    regulatoryReference?: string;
    languageCode?: string;
}

export interface UploadProgress {
    stage: 'checksum' | 'database' | 'storage' | 'version' | 'complete';
    progress: number;
    message: string;
}

/**
 * Upload completo di un documento con versioning
 */
export async function uploadDocument(
    params: UploadDocumentParams,
    onProgress?: (progress: UploadProgress) => void
): Promise<{ documentId: string; versionId: string }> {

    const {
        organizationId,
        categoryCode,
        file,
        title,
        description,
        documentCode,
        regulatoryReference,
        languageCode = 'it'
    } = params;

    try {
        // 1. Calcola checksum
        onProgress?.({ stage: 'checksum', progress: 10, message: 'Calcolo checksum...' });
        const checksum = await calculateChecksum(file);

        // 2. Ottieni categoria ID
        onProgress?.({ stage: 'database', progress: 20, message: 'Verifica categoria...' });
        const { data: category, error: catError } = await supabase
            .from('document_categories')
            .select('id')
            .eq('code', categoryCode)
            .single();

        if (catError || !category) {
            throw new Error(`Categoria ${categoryCode} non trovata`);
        }

        // 3. Ottieni user ID corrente
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utente non autenticato');

        // 4. Crea documento
        onProgress?.({ stage: 'database', progress: 30, message: 'Creazione documento...' });
        const { data: document, error: docError } = await supabase
            .from('documents')
            .insert({
                organization_id: organizationId,
                category_id: category.id,
                title,
                description,
                document_code: documentCode,
                regulatory_reference: regulatoryReference,
                language_code: languageCode,
                status: 'active',
                created_by: user.id
            })
            .select()
            .single();

        if (docError) throw docError;

        // 5. Genera storage path
        onProgress?.({ stage: 'database', progress: 40, message: 'Generazione path...' });
        const { data: storagePath, error: pathError } = await supabase
            .rpc('generate_storage_path', {
                p_document_id: document.id,
                p_version_number: 1,
                p_checksum: checksum,
                p_filename: file.name
            });

        if (pathError) throw pathError;

        // 6. Upload file a Supabase Storage
        onProgress?.({ stage: 'storage', progress: 60, message: 'Upload file...' });
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, file, {
                upsert: false,
                contentType: file.type
            });

        if (uploadError) throw uploadError;

        // 7. Crea versione
        onProgress?.({ stage: 'version', progress: 80, message: 'Creazione versione...' });
        const { data: version, error: versionError } = await supabase
            .from('document_versions')
            .insert({
                document_id: document.id,
                storage_path: storagePath,
                filename: file.name,
                mime_type: file.type,
                file_size_bytes: file.size,
                checksum_sha256: checksum,
                uploaded_by: user.id
            })
            .select()
            .single();

        if (versionError) throw versionError;

        // 8. Completo
        onProgress?.({ stage: 'complete', progress: 100, message: 'Upload completato!' });

        return {
            documentId: document.id,
            versionId: version.id
        };

    } catch (error: any) {
        console.error('Upload error:', error);
        throw new Error(error.message || 'Errore durante l\'upload');
    }
}

/**
 * Aggiungi nuova versione a documento esistente
 */
export async function addDocumentVersion(
    documentId: string,
    file: File,
    changeDescription?: string,
    isMajorRevision: boolean = false,
    onProgress?: (progress: UploadProgress) => void
): Promise<string> {

    try {
        // 1. Calcola checksum
        onProgress?.({ stage: 'checksum', progress: 10, message: 'Calcolo checksum...' });
        const checksum = await calculateChecksum(file);

        // 2. Ottieni user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utente non autenticato');

        // 3. Ottieni prossimo numero versione
        onProgress?.({ stage: 'database', progress: 20, message: 'Verifica versioni...' });
        const { data: latestVersion } = await supabase
            .from('document_versions')
            .select('version_number')
            .eq('document_id', documentId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        const nextVersion = (latestVersion?.version_number || 0) + 1;

        // 4. Genera storage path
        onProgress?.({ stage: 'database', progress: 30, message: 'Generazione path...' });
        const { data: storagePath, error: pathError } = await supabase
            .rpc('generate_storage_path', {
                p_document_id: documentId,
                p_version_number: nextVersion,
                p_checksum: checksum,
                p_filename: file.name
            });

        if (pathError) throw pathError;

        // 5. Upload file
        onProgress?.({ stage: 'storage', progress: 60, message: 'Upload file...' });
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, file, { upsert: false });

        if (uploadError) throw uploadError;

        // 6. Crea versione
        onProgress?.({ stage: 'version', progress: 80, message: 'Creazione versione...' });
        const { data: version, error: versionError } = await supabase
            .from('document_versions')
            .insert({
                document_id: documentId,
                storage_path: storagePath,
                filename: file.name,
                mime_type: file.type,
                file_size_bytes: file.size,
                checksum_sha256: checksum,
                change_description: changeDescription,
                is_major_revision: isMajorRevision,
                uploaded_by: user.id
            })
            .select()
            .single();

        if (versionError) throw versionError;

        onProgress?.({ stage: 'complete', progress: 100, message: 'Versione aggiunta!' });

        return version.id;

    } catch (error: any) {
        console.error('Add version error:', error);
        throw new Error(error.message || 'Errore durante l\'aggiunta della versione');
    }
}

/**
 * Download documento con verifica integrità
 */
export async function downloadDocument(
    versionId: string,
    verifyIntegrity: boolean = true
): Promise<Blob> {

    try {
        // 1. Ottieni metadata versione
        const { data: version, error: versionError } = await supabase
            .from('document_versions')
            .select('storage_path, checksum_sha256, filename, document_id')
            .eq('id', versionId)
            .single();

        if (versionError) throw versionError;

        // 2. Download da storage
        const { data: blob, error: downloadError } = await supabase.storage
            .from('documents')
            .download(version.storage_path);

        if (downloadError) throw downloadError;

        // 3. Verifica integrità (opzionale)
        if (verifyIntegrity) {
            const buffer = await blob.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const actualChecksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (actualChecksum !== version.checksum_sha256) {
                throw new Error('Integrità file compromessa! Checksum non corrispondente.');
            }
        }

        // 4. Log download
        await supabase.from('document_audit_log').insert({
            document_id: version.document_id,
            version_id: versionId,
            event_type: 'downloaded',
            event_data: { filename: version.filename }
        });

        return blob;

    } catch (error: any) {
        console.error('Download error:', error);
        throw new Error(error.message || 'Errore durante il download');
    }
}

/**
 * Download e trigger browser download
 */
export async function downloadAndSave(versionId: string, filename?: string): Promise<void> {
    const blob = await downloadDocument(versionId);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}