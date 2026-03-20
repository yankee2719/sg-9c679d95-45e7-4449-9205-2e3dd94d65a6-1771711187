import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "@/services/auditService";

const BUCKET = "documents";

function safeExt(name: string) {
  const ext = name.split(".").pop();
  return ext ? ext.toLowerCase() : "bin";
}

async function sha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeMimeType(file: File) {
  if (file.type && file.type.trim()) return file.type;
  return "application/octet-stream";
}

/**
 * ✅ FIX ARCHITETTURA:
 * upload PRIMA → poi insert documento (constraint OK)
 */
export async function createDocumentAndUploadV1(params: {
  organizationId: string;
  machineId?: string | null;
  plantId?: string | null;
  title: string;
  description?: string | null;
  category: string;
  file: File;
  changeSummary?: string | null;
  language?: string | null;
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
    regulatoryReference,
    createdBy,
  } = params;

  const resolvedMimeType = normalizeMimeType(file);
  const ext = safeExt(file.name);

  // 🔥 ID PRIMA
  const documentId = crypto.randomUUID();

  const objectName = `${organizationId}/${documentId}/v1_${Date.now()}.${ext}`;

  // 1️⃣ upload file
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectName, file, {
      upsert: false,
      contentType: resolvedMimeType,
    });

  if (uploadError) throw uploadError;

  const checksum = await sha256(file);

  // 2️⃣ insert documento (constraint OK)
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
      language: language ?? "it",
      regulatory_reference: regulatoryReference ?? null,
      version_count: 1,
      current_version_id: null,
      is_archived: false,

      // 🔥 QUESTO RISOLVE IL TUO ERRORE
      storage_bucket: BUCKET,
      storage_path: objectName,

      mime_type: resolvedMimeType,
      file_size: file.size,
      created_by: createdBy ?? null,
    })
    .select("*")
    .single();

  if (docErr) throw docErr;

  // 3️⃣ insert versione
  const { data: version, error: verErr } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      version_number: 1,
      file_path: objectName,
      file_name: file.name,
      file_size: file.size,
      mime_type: resolvedMimeType,
      checksum_sha256: checksum,
      change_summary: changeSummary ?? null,
      created_by: createdBy ?? null,
    })
    .select("*")
    .single();

  if (verErr) throw verErr;

  // 4️⃣ aggiorna documento
  await supabase
    .from("documents")
    .update({
      current_version_id: version.id,
    })
    .eq("id", documentId);

  await createAuditLog({
    organizationId,
    actorUserId: createdBy ?? null,
    entityType: "document",
    entityId: documentId,
    action: "create",
  });

  return { document: doc, version };
}