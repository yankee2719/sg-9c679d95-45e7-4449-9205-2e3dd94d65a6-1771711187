import { apiFetch } from "@/services/apiClient";

export interface DocumentWorkspaceDetail {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    language: string | null;
    regulatory_reference: string | null;
    machine_id: string | null;
    machine_label?: string | null;
    version_count?: number | null;
    file_size?: number | null;
    updated_at?: string | null;
    created_at: string;
    can_manage?: boolean;
}

export interface DocumentWorkspaceVersion {
    id: string;
    document_id: string;
    version_number: number;
    storage_path: string | null;
    original_filename: string | null;
    file_size_bytes: number | null;
    mime_type: string | null;
    checksum_sha256: string | null;
    change_description: string | null;
    uploaded_at: string;
    uploaded_by: string | null;
}

export async function getDocumentDetail(documentId: string): Promise<DocumentWorkspaceDetail> {
    const payload = await apiFetch < any > (`/api/documents/${documentId}`);
    return (payload.document ?? payload.data?.document ?? payload.data ?? payload) as DocumentWorkspaceDetail;
}

export async function getDocumentVersions(documentId: string): Promise<DocumentWorkspaceVersion[]> {
    const payload = await apiFetch < any > (`/api/documents/${documentId}/versions`);
    return (payload.data ?? payload.versions ?? payload) as DocumentWorkspaceVersion[];
}

export async function getDocumentSignedUrl(documentId: string, versionId?: string) {
    const query = new URLSearchParams({ redirect: "0" });
    if (versionId) query.set("versionId", versionId);
    const payload = await apiFetch < any > (`/api/documents/${documentId}/download?${query.toString()}`);
    return payload.signedUrl ?? payload.data?.signedUrl ?? null;
}
