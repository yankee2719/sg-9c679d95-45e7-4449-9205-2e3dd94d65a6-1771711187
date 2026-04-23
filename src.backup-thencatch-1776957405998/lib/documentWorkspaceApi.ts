import { apiFetch } from "@/services/apiClient";
import { authService } from "@/services/authService";

export type DocumentCategory =
    | "technical_manual"
    | "risk_assessment"
    | "ce_declaration"
    | "electrical_schema"
    | "maintenance_manual"
    | "spare_parts_catalog"
    | "training_material"
    | "inspection_report"
    | "certificate"
    | "photo"
    | "video"
    | "other";

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
    // compatibility fields still used in some components
    file_name?: string | null;
    file_path?: string | null;
    file_size?: number | null;
    change_summary?: string | null;
    created_at?: string;
    created_by?: string | null;
}

export type WorkspaceDocumentVersion = DocumentWorkspaceVersion;

export interface WorkspaceDocument {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    category: string | null;
    language?: string | null;
    regulatory_reference?: string | null;
    current_version_id: string | null;
    version_count: number | null;
    file_size?: number | null;
    updated_at?: string | null;
    created_at?: string | null;
    is_archived?: boolean;
    can_manage?: boolean;
    document_versions: WorkspaceDocumentVersion[];
}

export interface UploadMachineDocumentInput {
    machineId: string;
    title: string;
    description?: string | null;
    category: DocumentCategory;
    file: File;
}

function extractPayload<T>(payload: any, keys: string[] = ["data"]): T {
    for (const key of keys) {
        if (payload && key in payload) {
            return payload[key] as T;
        }
    }
    return payload as T;
}

function normalizeVersion(raw: any): DocumentWorkspaceVersion {
    const originalFilename = raw?.original_filename ?? raw?.file_name ?? null;
    const storagePath = raw?.storage_path ?? raw?.file_path ?? null;
    const fileSize = raw?.file_size_bytes ?? raw?.file_size ?? null;
    const uploadedAt = raw?.uploaded_at ?? raw?.created_at ?? new Date(0).toISOString();
    const uploadedBy = raw?.uploaded_by ?? raw?.created_by ?? null;
    const changeDescription = raw?.change_description ?? raw?.change_summary ?? null;

    return {
        id: String(raw?.id ?? ""),
        document_id: String(raw?.document_id ?? ""),
        version_number: Number(raw?.version_number ?? 1),
        storage_path: storagePath ? String(storagePath) : null,
        original_filename: originalFilename ? String(originalFilename) : null,
        file_size_bytes: typeof fileSize === "number" ? fileSize : fileSize != null ? Number(fileSize) : null,
        mime_type: raw?.mime_type ? String(raw.mime_type) : null,
        checksum_sha256: raw?.checksum_sha256 ? String(raw.checksum_sha256) : null,
        change_description: changeDescription ? String(changeDescription) : null,
        uploaded_at: String(uploadedAt),
        uploaded_by: uploadedBy ? String(uploadedBy) : null,
        file_name: originalFilename ? String(originalFilename) : null,
        file_path: storagePath ? String(storagePath) : null,
        file_size: typeof fileSize === "number" ? fileSize : fileSize != null ? Number(fileSize) : null,
        change_summary: changeDescription ? String(changeDescription) : null,
        created_at: String(uploadedAt),
        created_by: uploadedBy ? String(uploadedBy) : null,
    };
}

function normalizeWorkspaceDocument(raw: any): WorkspaceDocument {
    const versions = Array.isArray(raw?.document_versions)
        ? raw.document_versions.map(normalizeVersion).sort((a, b) => b.version_number - a.version_number)
        : [];

    return {
        id: String(raw?.id ?? ""),
        organization_id: String(raw?.organization_id ?? ""),
        machine_id: raw?.machine_id ? String(raw.machine_id) : null,
        title: String(raw?.title ?? ""),
        description: raw?.description ? String(raw.description) : null,
        category: raw?.category ? String(raw.category) : null,
        language: raw?.language ? String(raw.language) : null,
        regulatory_reference: raw?.regulatory_reference ? String(raw.regulatory_reference) : null,
        current_version_id: raw?.current_version_id ? String(raw.current_version_id) : null,
        version_count: raw?.version_count != null ? Number(raw.version_count) : versions.length,
        file_size: raw?.file_size != null ? Number(raw.file_size) : null,
        updated_at: raw?.updated_at ? String(raw.updated_at) : null,
        created_at: raw?.created_at ? String(raw.created_at) : null,
        is_archived: Boolean(raw?.is_archived),
        can_manage: Boolean(raw?.can_manage),
        document_versions: versions,
    };
}

async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const session = await authService.getCurrentSession();
    if (!session?.access_token) {
        throw new Error("Not authenticated");
    }

    const response = await fetch(input, {
        ...init,
        headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${session.access_token}`,
        },
    });

    const contentType = response.headers.get("content-type") || "";
    let payload: any = null;

    if (contentType.includes("application/json")) {
        payload = await response.json().catch(() => null);
    } else {
        const text = await response.text().catch(() => "");
        payload = text ? { message: text } : null;
    }

    if (!response.ok) {
        throw new Error(payload?.error || payload?.message || `API error ${response.status}`);
    }

    return payload;
}

export async function listMachineDocuments(machineId: string): Promise<WorkspaceDocument[]> {
    const payload = await apiFetch<any>(`/api/documents/machine/${machineId}`);
    const rows = extractPayload<any[]>(payload, ["data", "documents"]);
    return Array.isArray(rows) ? rows.map(normalizeWorkspaceDocument) : [];
}

export async function uploadMachineDocument(input: UploadMachineDocumentInput) {
    const formData = new FormData();
    formData.append("machineId", input.machineId);
    formData.append("title", input.title.trim());
    formData.append("description", input.description?.trim() ?? "");
    formData.append("category", input.category);
    formData.append("file", input.file);

    return authorizedFetch("/api/documents/upload/upload", {
        method: "POST",
        body: formData,
    });
}

export async function getDocumentDetail(documentId: string): Promise<DocumentWorkspaceDetail> {
    const payload = await apiFetch<any>(`/api/documents/${documentId}`);
    return extractPayload<DocumentWorkspaceDetail>(payload, ["document", "data"]);
}

export async function getDocumentVersions(documentId: string): Promise<DocumentWorkspaceVersion[]> {
    const payload = await apiFetch<any>(`/api/documents/${documentId}/versions`);
    const rows = extractPayload<any[]>(payload, ["data", "versions"]);
    return Array.isArray(rows) ? rows.map(normalizeVersion) : [];
}

export async function getDocumentSignedUrl(documentId: string, versionId?: string) {
    const query = new URLSearchParams({ redirect: "0" });
    if (versionId) query.set("versionId", versionId);

    const payload = await apiFetch<any>(`/api/documents/${documentId}/download?${query.toString()}`);
    return payload?.signedUrl ?? payload?.data?.signedUrl ?? null;
}

export async function openDocument(documentId: string, versionId?: string) {
    const signedUrl = await getDocumentSignedUrl(documentId, versionId);
    if (!signedUrl) {
        throw new Error("Signed URL non disponibile");
    }

    if (typeof window !== "undefined") {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
    }

    return signedUrl;
}

export async function archiveDocument(documentId: string) {
    return apiFetch<any>(`/api/documents/${documentId}/delete`, {
        method: "DELETE",
    });
}

export const documentWorkspaceApi = {
    listMachineDocuments,
    uploadMachineDocument,
    getDocumentDetail,
    getDocumentVersions,
    getDocumentSignedUrl,
    openDocument,
    archiveDocument,
};
