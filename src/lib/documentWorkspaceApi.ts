import { apiFetch } from "@/services/apiClient";
import { authService } from "@/services/authService";

export interface WorkspaceDocumentVersion {
    id: string;
    document_id: string;
    version_number: number | null;
    file_name: string | null;
    file_path: string | null;
    file_size: number | null;
    mime_type: string | null;
    checksum_sha256?: string | null;
    change_summary: string | null;
    created_at: string | null;
    created_by: string | null;
}

export interface WorkspaceDocument {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    category: string | null;
    language: string | null;
    regulatory_reference: string | null;
    current_version_id: string | null;
    version_count: number | null;
    file_size: number | null;
    updated_at: string | null;
    is_archived: boolean | null;
    can_manage?: boolean;
    document_versions: WorkspaceDocumentVersion[];
}

async function authHeaders(extra?: Record<string, string>) {
    const session = await authService.getCurrentSession();
    if (!session?.access_token) throw new Error("Authentication required.");
    return {
        Authorization: `Bearer ${session.access_token}`,
        ...(extra ?? {}),
    };
}

export const documentWorkspaceApi = {
    async listMachineDocuments(machineId: string): Promise<WorkspaceDocument[]> {
        const payload = await apiFetch < { success: true; data: WorkspaceDocument[] } > (`/api/documents/machine/${machineId}`);
        return payload.data ?? [];
    },

    async uploadMachineDocument(params: {
        machineId: string;
        title: string;
        description?: string;
        category: string;
        file: File;
    }) {
        const formData = new FormData();
        formData.append("machineId", params.machineId);
        formData.append("title", params.title);
        formData.append("description", params.description || "");
        formData.append("category", params.category);
        formData.append("file", params.file);

        const response = await fetch("/api/documents/upload/upload", {
            method: "POST",
            headers: await authHeaders(),
            body: formData,
        });
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};
        if (!response.ok) {
            throw new Error(payload?.error || `Upload failed (${response.status})`);
        }
        return payload;
    },

    async openDocument(documentId: string, versionId?: string) {
        const query = new URLSearchParams();
        query.set("redirect", "0");
        if (versionId) query.set("versionId", versionId);
        const payload = await apiFetch < { signedUrl?: string; data?: { signedUrl?: string } } > (
            `/api/documents/${documentId}/download?${query.toString()}`
        );
        const signedUrl = payload.signedUrl || payload.data?.signedUrl;
        if (!signedUrl) throw new Error("Signed URL not available.");
        window.open(signedUrl, "_blank", "noopener,noreferrer");
    },

    async archiveDocument(documentId: string) {
        return apiFetch(`/api/documents/${documentId}/delete`, { method: "DELETE" });
    },

    async getDocumentDetail(documentId: string) {
        return apiFetch < { success: true; document: any } > (`/api/documents/${documentId}`);
    },

    async getDocumentVersions(documentId: string) {
        return apiFetch < { success: true; data: any[] } > (`/api/documents/${documentId}/versions`);
    },
};
