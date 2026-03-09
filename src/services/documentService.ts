import { supabase } from "@/integrations/supabase/client";

const BUCKET = "documents";

export type DocumentCategory = "MANUAL" | "DRAWING" | "CERTIFICATE" | "REPORT" | "OTHER";

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
    created_by: string;
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

export async function listMachineDocuments(machineId: string) {
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

    return (data ?? []).map((d: any) => ({
        ...d,
        document_versions: (d.document_versions ?? []).sort(
            (a: any, b: any) => (b.version_number ?? 0) - (a.version_number ?? 0)
        ),
    })) as Array<DocumentRow & { document_versions: DocumentVersionRow[] }>;
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
    } = params;

    const { data: doc, error: docErr } = await supabase
        .from("documents")
        .insert({
            organization_id: organizationId,
            machine_id: machineId ?? null,
            plant_id: plantId ?? null,
            title: title.trim(),
            description: description?.trim() || null,
            category,
            language: language ?? "it",
            is_mandatory: Boolean(isMandatory),
            tags: tags ?? [],
            version_count: 0,
            current_version_id: null,
            is_archived: false,
        })
        .select("*")
        .single();

    if (docErr) throw docErr;

    const ext = safeExt(file.name);
    const objectName = `${organizationId}/${doc.id}/v1_${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectName, file);
    if (upErr) throw upErr;

    const checksum = await sha256(file);

    const { data: ver, error: verErr } = await supabase
        .from("document_versions")
        .insert({
            document_id: doc.id,
            version_number: 1,
            previous_version_id: null,
            file_path: objectName,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || "application/octet-stream",
            checksum_sha256: checksum,
            change_summary: changeSummary?.trim() || null,
            signature_data: null,
        })
        .select("*")
        .single();

    if (verErr) throw verErr;

    const { error: updErr } = await supabase
        .from("documents")
        .update({
            current_version_id: ver.id,
            version_count: 1,
        })
        .eq("id", doc.id);

    if (updErr) throw updErr;

    return { document: doc as any, version: ver as any };
}

export async function uploadNewVersion(params: {
    documentId: string;
    organizationId: string;
    file: File;
    changeSummary?: string | null;
}) {
    const { documentId, organizationId, file, changeSummary } = params;

    const { data: doc, error: docErr } = await supabase
        .from("documents")
        .select("id,current_version_id,version_count")
        .eq("id", documentId)
        .single();

    if (docErr) throw docErr;

    const nextVersion = (doc.version_count ?? 0) + 1;
    const ext = safeExt(file.name);
    const objectName = `${organizationId}/${documentId}/v${nextVersion}_${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectName, file);
    if (upErr) throw upErr;

    const checksum = await sha256(file);

    const { data: ver, error: verErr } = await supabase
        .from("document_versions")
        .insert({
            document_id: documentId,
            version_number: nextVersion,
            previous_version_id: doc.current_version_id,
            file_path: objectName,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || "application/octet-stream",
            checksum_sha256: checksum,
            change_summary: changeSummary?.trim() || null,
            signature_data: null,
        })
        .select("*")
        .single();

    if (verErr) throw verErr;

    const { error: updErr } = await supabase
        .from("documents")
        .update({
            current_version_id: ver.id,
            version_count: nextVersion,
            updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

    if (updErr) throw updErr;

    return ver as any;
}

export async function signDocumentVersion(params: {
    versionId: string;
    signatureData: any;
}) {
    const { versionId, signatureData } = params;

    const { data, error } = await supabase
        .from("document_versions")
        .update({
            signed_at: new Date().toISOString(),
            signature_data: signatureData,
        })
        .eq("id", versionId)
        .select("*")
        .single();

    if (error) throw error;
    return data as any;
}