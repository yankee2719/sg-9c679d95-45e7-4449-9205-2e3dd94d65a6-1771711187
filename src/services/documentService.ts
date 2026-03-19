import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "@/services/auditService";

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

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
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
      external_url: null,
      storage_bucket: BUCKET,
      storage_path: null,
      mime_type: resolvedMimeType,
      file_size: file.size,
    })
    .select("*")
    .single();

  if (docErr) throw docErr;

  try {
    const objectName = `${organizationId}/${doc.id}/v1_${Date.now()}.${ext}`;

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
        document_id: doc.id,
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
      .eq("id", doc.id);

    if (updErr) throw updErr;

    await createAuditLog({
      organizationId,
      actorUserId: createdBy ?? null,
      entityType: "document",
      entityId: doc.id,
      action: "create",
      machineId: machineId ?? null,
      documentId: doc.id,
      newData: {
        title: doc.title,
        category: doc.category,
        language: doc.language,
        version_count: 1,
        file_name: file.name,
        file_size: file.size,
      },
      metadata: {
        source: "documentService.createDocumentAndUploadV1",
        storage_path: objectName,
      },
    });

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
    await supabase.from("documents").delete().eq("id", doc.id);
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
    .select("id, current_version_id, version_count, machine_id")
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

  await createAuditLog({
    organizationId,
    actorUserId: createdBy ?? null,
    entityType: "document",
    entityId: documentId,
    action: "new_version",
    documentId: documentId,
    machineId: doc.machine_id ?? null,
    newData: {
      version_number: nextVersion,
      file_name: file.name,
      file_size: file.size,
      change_summary: changeSummary?.trim() || null,
    },
    metadata: {
      source: "documentService.uploadNewVersion",
      storage_path: objectName,
    },
  });

  return version as DocumentVersionRow;
}

export async function archiveDocument(
  documentId: string,
  organizationId: string,
  actorUserId?: string | null,
  machineId?: string | null
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

  await createAuditLog({
    organizationId,
    actorUserId: actorUserId ?? null,
    entityType: "document",
    entityId: documentId,
    action: "archive",
    documentId,
    machineId: machineId ?? null,
    metadata: {
      source: "documentService.archiveDocument",
    },
    newData: {
      is_archived: true,
      archived_at: now,
    },
  });
}

export async function restoreDocument(
  documentId: string,
  organizationId: string,
  actorUserId?: string | null,
  machineId?: string | null
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

  await createAuditLog({
    organizationId,
    actorUserId: actorUserId ?? null,
    entityType: "document",
    entityId: documentId,
    action: "restore",
    documentId,
    machineId: machineId ?? null,
    metadata: {
      source: "documentService.restoreDocument",
    },
    newData: {
      is_archived: false,
      archived_at: null,
    },
  });
}