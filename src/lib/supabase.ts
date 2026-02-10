import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export type Database = {
    public: {
        Tables: {
            documents: {
                Row: {
                    id: string;
                    organization_id: string;
                    category_id: string;
                    document_code: string | null;
                    title: string;
                    description: string | null;
                    language_code: string;
                    status: 'draft' | 'active' | 'superseded' | 'archived' | 'deleted';
                    current_version_id: string | null;
                    regulatory_reference: string | null;
                    validity_start: string | null;
                    validity_end: string | null;
                    created_by: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at'>;
            };
            document_versions: {
                Row: {
                    id: string;
                    document_id: string;
                    version_number: number;
                    version_label: string | null;
                    storage_path: string;
                    bucket_name: string;
                    filename: string;
                    mime_type: string;
                    file_size_bytes: number;
                    checksum_sha256: string;
                    change_description: string | null;
                    is_major_revision: boolean;
                    uploaded_by: string;
                    uploaded_at: string;
                    superseded_at: string | null;
                    signature_metadata: any | null;
                };
            };
        };
    };
};