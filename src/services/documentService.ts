import { supabase } from "@/integrations/supabase/client";

const BUCKET = "documents";

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

export type DocumentRow = {
    id: string;
    organization_id: string;
    plant_id: string | null;
    machine_id: string | null;
    title: string;
    description: string | null;
    category: DocumentCategory | string;
    language: string | null;
    is_mandatory: boolean;
    regulatory_reference: string | null;
    current_version_id: string | null;
    version_count: number;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    is_archived: boolean;
    archived_at: string | null;
    external_url: string | null;
    storage_bucket: string | null;
    storage_path: string | null;
    mime_type: string | null;
    file_size: number | null;
};

export type DocumentVersionRow = {
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
    signature_data: any;
    created_at: string;
    created_by: string | null;
};

export type DocumentWithVersions = DocumentRow & {
    document_versions: DocumentVersionRow[];
};

async function sha256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function safeExt(name: string) {
    const ext = name.split(".").pop();
    return ext ? ext.toLowerCase() : "bin";
}

export function normalizeMimeType(file: File) {
    if (file.type && file.type.trim()) return file.type;

    const name = file.name.toLowerCase();

    if (name.endsWith(".txt")) return "text/plain";
    if (name.endsWith(".csv")) return "text/csv";
    if (name.endsWith(".pdf")) return "application/pdf";
    if (name.endsWith(".doc")) return "application/msword";
    if (name.endsWith(".docx")) {
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    if (name.endsWith(".xls")) return "application/vnd.ms-excel";
    if (name.endsWith(".xlsx")) {
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    if (name.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
    if (name.endsWith(".pptx")) {
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    }
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".gif")) return "image/gif";
    if (name.endsWith(".webp")) return "image/webp";
    if (name.endsWith(".zip")) return "application/zip";
    if (name.endsWith(".mp4")) return "video/mp4";
    if (name.endsWith(".mov")) return "video/quicktime";

    return "application/octet-stream";
}

export async function listMachineDocuments(
    machineId: string
): Promise<DocumentWithVersions[]> {
    const { data, error } = await supabase
        .from("documents")
        .select(`
            id,
            organization_id,
            plant_id,
            machine_id,
            title,
            description,
            category,
            language,
            is_mandatory,
            regulatory_reference,
            current_version_id,
            version_count,
            tags,
            created_at,
            updated_at,
            created_by,
            is_archived,
            archived_at,
            external_url,
            storage_bucket,
            storage_path,
            mime_type,
            file_size,
            document_versions:document_versions!document_versions_document_id_fkey (
                id,
                document_id,
                version_number,
                previous_version_id,
                file_path,
                file_name,
                file_size,
                mime_type,
                checksum_sha256,
                change_summary,
                signed_by,
                signed_at,
                signature_data,
                created_at,
                created_by
            )
        `)
        .eq("machine_id", machineId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
        ...row,
        document_versions: (row.document_versions ?? []).sort(
            (a: any, b: any) => (b.version_number ?? 0) - (a.version_number ?? 0)
        ),
    })) as DocumentWithVersions[];
}

export async function getSignedUrl(filePath: string, expiresInSec = 600) {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, expiresInSec);

    if (error) throw error;
    return data.signedUrl;
}

export async function createDocumentAndUploadV1(params: {
    organizationId: string;
    machineId?: string | null;
    plantId?: string | null;
    title: string;
    description?: string | null;
    category: DocumentCategory;
    file: File;
    changeSummary?: string | null;
    language?: string | null;
    isMandatory?: boolean;
    tags?: string[];
    regulatoryReference?: string | null;
    createdBy?: string | null;
}) {
    const {
        organizationId,
        machineId,
        plantId,
        title,
        description,
        category,
        file,
        changeSummary,
        language,
        isMandatory,
        tags,
        regulatoryReference,
        createdBy,
    } = params;

    const resolvedMimeType = normalizeMimeType(file);
    const ext = safeExt(file.name);
    const documentId = crypto.randomUUID();
    const objectName = `${organizationId}/${documentId}/v1_${Date.now()}.${ext}`;

    let uploaded = false;
    let createdDocument = false;

    try {
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(objectName, file, {
                upsert: false,
                contentType: resolvedMimeType,
            });

        if (uploadError) throw uploadError;
        uploaded = true;

        const checksum = await sha256(file);

        const { data: doc, error: docErr } = await supabase
            .from("documents")
            .insert({
                id: documentId,
                organization_id: organizationId,
                machine_id: machineId ?? null,
                plant_id: plantId ?? null,
                title: title.trim(),
                description: description?.trim() || null,
                category,
                language: language?.trim() || "it",
                is_mandatory: Boolean(isMandatory),
                regulatory_reference: regulatoryReference?.trim() || null,
                version_count: 0,
                current_version_id: null,
                tags: tags ?? [],
                created_by: createdBy ?? null,
                is_archived: false,
                archived_at: null,
                external_url: null,
                storage_bucket: BUCKET,
                storage_path: objectName,
                mime_type: resolvedMimeType,
                file_size: file.size,
            })
            .select("*")
            .single();

        if (docErr) throw docErr;
        createdDocument = true;

        const { data: version, error: verErr } = await supabase
            .from("document_versions")
            .insert({
                document_id: documentId,
                version_number: 1,
                previous_version_id: null,
                file_path: objectName,
                file_name: file.name,
                file_size: file.size,
                mime_type: resolvedMimeType,
                checksum_sha256: checksum,
                change_summary: changeSummary?.trim() || null,
                signature_data: null,
                created_by: createdBy ?? null,
            })
            .select("*")
            .single();

        if (verErr) throw verErr;

        const { error: updErr } = await supabase
            .from("documents")
            .update({
                current_version_id: version.id,
                version_count: 1,
                storage_bucket: BUCKET,
                storage_path: objectName,
                mime_type: resolvedMimeType,
                file_size: file.size,
                updated_at: new Date().toISOString(),
            })
            .eq("id", documentId);

        if (updErr) throw updErr;

        return {
            document: {
                ...doc,
                current_version_id: version.id,
                version_count: 1,
                storage_bucket: BUCKET,
                storage_path: objectName,
                mime_type: resolvedMimeType,
                file_size: file.size,
            },
            version,
        };
    } catch (error) {
        console.error("createDocumentAndUploadV1 error:", error);

        if (createdDocument) {
            await supabase
                .from("documents")
                .delete()
                .eq("id", documentId)
                .then(() => undefined)
                .catch((err) => {
                    console.error("Rollback document delete error:", err);
                });
        }

        if (uploaded) {
            await supabase.storage
                .from(BUCKET)
                .remove([objectName])
                .then(() => undefined)
                .catch((err) => {
                    console.error("Rollback storage remove error:", err);
                });
        }

        throw error;
    }
}

export async function uploadNewVersion(params: {
    documentId: string;
    organizationId: string;
    file: File;
    changeSummary?: string | null;
    createdBy?: string | null;
}) {
    const { documentId, organizationId, file, changeSummary, createdBy } = params;

    const { data: doc, error: docErr } = await supabase
        .from("documents")
        .select("id, current_version_id, version_count")
        .eq("id", documentId)
        .single();

    if (docErr) throw docErr;

    const nextVersion = (doc.version_count ?? 0) + 1;
    const resolvedMimeType = normalizeMimeType(file);
    const ext = safeExt(file.name);
    const objectName = `${organizationId}/${documentId}/v${nextVersion}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(objectName, file, {
            upsert: false,
            contentType: resolvedMimeType,
        });

    if (uploadError) throw uploadError;

    const checksum = await sha256(file);

    const { data: version, error: verErr } = await supabase
        .from("document_versions")
        .insert({
            document_id: documentId,
            version_number: nextVersion,
            previous_version_id: doc.current_version_id,
            file_path: objectName,
            file_name: file.name,
            file_size: file.size,
            mime_type: resolvedMimeType,
            checksum_sha256: checksum,
            change_summary: changeSummary?.trim() || null,
            signature_data: null,
            created_by: createdBy ?? null,
        })
        .select("*")
        .single();

    if (verErr) throw verErr;

    const { error: updErr } = await supabase
        .from("documents")
        .update({
            current_version_id: version.id,
            version_count: nextVersion,
            storage_bucket: BUCKET,
            storage_path: objectName,
            mime_type: resolvedMimeType,
            file_size: file.size,
            updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

    if (updErr) throw updErr;

    return version as DocumentVersionRow;
}

export async function archiveDocument(
    documentId: string,
    organizationId: string
) {
    const now = new Date().toISOString();

    const { error } = await supabase
        .from("documents")
        .update({
            is_archived: true,
            archived_at: now,
            updated_at: now,
        })
        .eq("id", documentId)
        .eq("organization_id", organizationId);

    if (error) throw error;
}

export async function restoreDocument(
    documentId: string,
    organizationId: string
) {
    const now = new Date().toISOString();

    const { error } = await supabase
        .from("documents")
        .update({
            is_archived: false,
            archived_at: null,
            updated_at: now,
        })
        .eq("id", documentId)
        .eq("organization_id", organizationId);

    if (error) throw error;
}

// ============================================================================
// COMPATIBILITY LAYER FOR LEGACY DOCUMENT MODULES
// Temporary bridge to keep older document pages/components compiling while the
// real API-first document flow is being consolidated.
// ============================================================================

export type DocumentVersion = {
    id: string;
    document_id: string;
    version_number: number;
    storage_path: string;
    original_filename: string;
    file_size_bytes: number;
    mime_type: string;
    checksum_sha256: string;
    change_description: string | null;
    uploaded_at: string;
    uploaded_by: string | null;
};

export type AuditLogEntry = {
    id: string;
    action: string;
    performed_at: string;
    performed_by: string;
    ip_address: string | null;
    user_agent: string | null;
    details: string | null;
    metadata?: Record<string, any> | null;
    success: boolean;
};

async function getDocumentByIdCompat(documentId: string) {
    const { data, error } = await supabase
        .from("documents")
        .select(`
            id,
            organization_id,
            plant_id,
            machine_id,
            title,
            description,
            category,
            language,
            is_mandatory,
            regulatory_reference,
            current_version_id,
            version_count,
            tags,
            created_at,
            updated_at,
            created_by,
            is_archived,
            archived_at,
            external_url,
            storage_bucket,
            storage_path,
            mime_type,
            file_size
        `)
        .eq("id", documentId)
        .maybeSingle();

    if (error) throw error;
    return data ?? null;
}

async function getVersionHistoryCompat(documentId: string): Promise<DocumentVersion[]> {
    const { data, error } = await supabase
        .from("document_versions")
        .select(`
            id,
            document_id,
            version_number,
            file_path,
            file_name,
            file_size,
            mime_type,
            checksum_sha256,
            change_summary,
            created_at,
            created_by
        `)
        .eq("document_id", documentId)
        .order("version_number", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
        id: row.id,
        document_id: row.document_id,
        version_number: row.version_number,
        storage_path: row.file_path,
        original_filename: row.file_name,
        file_size_bytes: row.file_size,
        mime_type: row.mime_type,
        checksum_sha256: row.checksum_sha256,
        change_description: row.change_summary ?? null,
        uploaded_at: row.created_at,
        uploaded_by: row.created_by ?? null,
    }));
}

async function getAuditLogCompat(documentId: string, limit = 100): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, performed_by, created_at, details, success")
        .eq("entity_type", "document")
        .eq("entity_id", documentId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
        id: row.id,
        action: row.action,
        performed_at: row.created_at,
        performed_by: row.performed_by ?? "unknown",
        ip_address: null,
        user_agent: null,
        details: typeof row.details === "string" ? row.details : row.details ? JSON.stringify(row.details) : null,
        metadata: typeof row.details === "object" && row.details ? row.details : null,
        success: row.success !== false,
    }));
}

async function logDocumentActionCompat(
    documentId: string,
    action: string,
    performedBy: string,
    details?: string | null
) {
    const document = await getDocumentByIdCompat(documentId);
    const { error } = await supabase.from("audit_logs").insert({
        organization_id: document?.organization_id ?? null,
        entity_type: "document",
        entity_id: documentId,
        action,
        performed_by: performedBy,
        details: details ?? null,
        success: true,
    } as any);

    if (error) throw error;
}

async function checkUserPermissionCompat(
    _userId: string,
    documentId: string,
    _permission: "view" | "download" | "sign" | "manage"
) {
    const document = await getDocumentByIdCompat(documentId);
    return !!document;
}

async function updateDocumentMetadataCompat(
    params: {
        documentId: string;
        title?: string;
        description?: string;
        complianceTags?: string[];
        tags?: string[];
        metadata?: Record<string, any>;
    },
    _userId: string
) {
    const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
    };

    if (params.title !== undefined) payload.title = params.title?.trim() || null;
    if (params.description !== undefined) payload.description = params.description?.trim() || null;
    if (params.tags !== undefined) payload.tags = params.tags ?? [];
    if (params.complianceTags !== undefined) {
        payload.regulatory_reference = params.complianceTags.join(", ") || null;
    }

    const { data, error } = await supabase
        .from("documents")
        .update(payload)
        .eq("id", params.documentId)
        .select(`
            id,
            organization_id,
            plant_id,
            machine_id,
            title,
            description,
            category,
            language,
            is_mandatory,
            regulatory_reference,
            current_version_id,
            version_count,
            tags,
            created_at,
            updated_at,
            created_by,
            is_archived,
            archived_at,
            external_url,
            storage_bucket,
            storage_path,
            mime_type,
            file_size
        `)
        .single();

    if (error) throw error;
    return data;
}

async function deleteDocumentCompat(documentId: string) {
    const { error } = await supabase.from("documents").delete().eq("id", documentId);
    if (error) throw error;
}

async function searchDocumentsCompat(params: {
    query?: string;
    category?: string;
    equipmentId?: string;
    complianceTags?: string[];
    limit?: number;
}) {
    let query = supabase
        .from("documents")
        .select(`
            id,
            organization_id,
            machine_id,
            title,
            description,
            category,
            tags,
            regulatory_reference,
            created_at,
            updated_at,
            storage_path,
            mime_type,
            file_size
        `)
        .eq("is_archived", false)
        .limit(params.limit ?? 50)
        .order("updated_at", { ascending: false });

    if (params.query) {
        query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`);
    }
    if (params.category) {
        query = query.eq("category", params.category);
    }
    if (params.equipmentId) {
        query = query.eq("machine_id", params.equipmentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    let rows = (data ?? []) as any[];
    if (params.complianceTags?.length) {
        rows = rows.filter((row) =>
            params.complianceTags?.some((tag) =>
                String(row.regulatory_reference ?? "").toLowerCase().includes(tag.toLowerCase())
            )
        );
    }

    return rows.map((row) => ({
        ...row,
        compliance_tags: row.regulatory_reference
            ? String(row.regulatory_reference).split(",").map((t) => t.trim()).filter(Boolean)
            : [],
    }));
}

async function createDocumentCompat(
    params: {
        equipmentId: string;
        title: string;
        description?: string;
        category: DocumentCategory | string;
        file: Buffer;
        complianceTags?: string[];
        documentNumber?: string;
        tags?: string[];
    },
    userId: string
) {
    const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select("id, organization_id, plant_id")
        .eq("id", params.equipmentId)
        .maybeSingle();
    if (machineError) throw machineError;
    if (!machine) throw new Error("Machine not found");

    const documentId = crypto.randomUUID();
    const objectName = `${(machine as any).organization_id}/${documentId}/v1_${Date.now()}.bin`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(objectName, params.file, {
            upsert: false,
            contentType: "application/octet-stream",
        });
    if (uploadError) throw uploadError;

    const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
            id: documentId,
            organization_id: (machine as any).organization_id,
            machine_id: params.equipmentId,
            plant_id: (machine as any).plant_id ?? null,
            title: params.title,
            description: params.description ?? null,
            category: params.category,
            regulatory_reference: params.complianceTags?.join(", ") ?? null,
            tags: params.tags ?? [],
            created_by: userId,
            storage_bucket: BUCKET,
            storage_path: objectName,
            mime_type: "application/octet-stream",
            file_size: params.file.byteLength,
            version_count: 1,
            is_archived: false,
        })
        .select("*")
        .single();
    if (docError) throw docError;

    const checksum = createHash("sha256").update(params.file).digest("hex");
    const { data: version, error: versionError } = await supabase
        .from("document_versions")
        .insert({
            document_id: documentId,
            version_number: 1,
            previous_version_id: null,
            file_path: objectName,
            file_name: params.documentNumber || `${params.title}.bin`,
            file_size: params.file.byteLength,
            mime_type: "application/octet-stream",
            checksum_sha256: checksum,
            change_summary: "Initial upload",
            created_by: userId,
        })
        .select("id")
        .single();
    if (versionError) throw versionError;

    const { error: updateError } = await supabase
        .from("documents")
        .update({ current_version_id: (version as any).id })
        .eq("id", documentId);
    if (updateError) throw updateError;

    return { ...doc, current_version_id: (version as any).id };
}

async function createNewVersionCompat(
    params: {
        documentId: string;
        file: Buffer;
        changeReason: string;
        changeSummary?: string;
        newTitle?: string;
        newDescription?: string;
    },
    userId: string
) {
    const document = await getDocumentByIdCompat(params.documentId);
    if (!document) throw new Error("Document not found");

    const nextVersion = Number(document.version_count || 0) + 1;
    const objectName = `${document.organization_id}/${params.documentId}/v${nextVersion}_${Date.now()}.bin`;

    const { error: uploadError } = await supabase.storage
        .from(document.storage_bucket || BUCKET)
        .upload(objectName, params.file, {
            upsert: false,
            contentType: document.mime_type || "application/octet-stream",
        });
    if (uploadError) throw uploadError;

    const checksum = createHash("sha256").update(params.file).digest("hex");
    const { data: version, error: versionError } = await supabase
        .from("document_versions")
        .insert({
            document_id: params.documentId,
            version_number: nextVersion,
            previous_version_id: document.current_version_id,
            file_path: objectName,
            file_name: `${document.title}.bin`,
            file_size: params.file.byteLength,
            mime_type: document.mime_type || "application/octet-stream",
            checksum_sha256: checksum,
            change_summary: params.changeSummary || params.changeReason,
            created_by: userId,
        })
        .select("id, version_number")
        .single();
    if (versionError) throw versionError;

    const { error: updateError } = await supabase
        .from("documents")
        .update({
            current_version_id: (version as any).id,
            version_count: nextVersion,
            storage_path: objectName,
            file_size: params.file.byteLength,
            title: params.newTitle ?? document.title,
            description: params.newDescription ?? document.description,
            updated_at: new Date().toISOString(),
        })
        .eq("id", params.documentId);
    if (updateError) throw updateError;

    return {
        ...document,
        current_version_id: (version as any).id,
        version_number: (version as any).version_number,
        storage_path: objectName,
    };
}

export function getDocumentService() {
    return {
        storage: {
            downloadDocument: async (storagePath: string) => {
                const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
                if (error) throw error;
                return data;
            },
            getSignedUrl: async (storagePath: string, expiresIn = 600) => {
                const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
                if (error) throw error;
                return data?.signedUrl;
            },
        },
        checkUserPermission: checkUserPermissionCompat,
        getDocumentById: getDocumentByIdCompat,
        getVersionHistory: getVersionHistoryCompat,
        getAuditLog: getAuditLogCompat,
        logDocumentAction: logDocumentActionCompat,
        updateDocumentMetadata: updateDocumentMetadataCompat,
        deleteDocument: deleteDocumentCompat,
        searchDocuments: searchDocumentsCompat,
        createDocument: createDocumentCompat,
        createNewVersion: createNewVersionCompat,
    };
}
