import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Document {
    document_id: string;
    document_code: string | null;
    document_title: string;
    document_status: string;
    organization_id: string;
    organization_name: string;
    organization_type: string;
    category_id: string;
    category_code: string;
    category_name: any;
    mandatory_for_ce: boolean;
    version_id: string | null;
    version_number: number | null;
    filename: string | null;
    file_size_bytes: number | null;
    uploaded_at: string | null;
    uploaded_by_email: string | null;
    storage_path: string | null;
    checksum_sha256: string | null;
}

export interface UseDocumentsOptions {
    organizationId?: string;
    categoryCode?: string;
    mandatoryOnly?: boolean;
    status?: string;
}

export function useDocuments(options: UseDocumentsOptions = {}) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        loadDocuments();
    }, [options.organizationId, options.categoryCode, options.mandatoryOnly, options.status]);

    async function loadDocuments() {
        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('current_document_versions')
                .select('*');

            if (options.organizationId) {
                query = query.eq('organization_id', options.organizationId);
            }

            if (options.categoryCode) {
                query = query.eq('category_code', options.categoryCode);
            }

            if (options.mandatoryOnly) {
                query = query.eq('mandatory_for_ce', true);
            }

            if (options.status) {
                query = query.eq('document_status', options.status);
            }

            query = query.order('uploaded_at', { ascending: false });

            const { data, error: queryError } = await query;

            if (queryError) throw queryError;

            setDocuments(data || []);
        } catch (err: any) {
            setError(err);
            console.error('Error loading documents:', err);
        } finally {
            setLoading(false);
        }
    }

    return {
        documents,
        loading,
        error,
        refresh: loadDocuments
    };
}