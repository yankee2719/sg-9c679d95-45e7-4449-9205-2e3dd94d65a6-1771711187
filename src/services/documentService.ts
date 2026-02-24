import { supabase } from "@/integrations/supabase/client";

export async function uploadDocument({
    file,
    orgId,
    machineId,
    plantId,
    title,
    description,
    category,
}: {
    file: File;
    orgId: string;
    machineId?: string | null;
    plantId?: string | null;
    title: string;
    description?: string;
    category: string;
}) {
    if (!file) throw new Error("File mancante");

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const path = `${orgId}/${machineId || "no-machine"}/${fileName}`;

    // upload
    const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file);

    if (uploadError) throw uploadError;

    // checksum
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const checksum = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // RPC
    const { data, error } = await supabase.rpc("create_document_with_version", {
        p_organization_id: orgId,
        p_machine_id: machineId,
        p_plant_id: plantId,
        p_title: title,
        p_description: description || null,
        p_category: category,
        p_file_path: path,
        p_file_name: file.name,
        p_file_size: file.size,
        p_mime_type: file.type,
        p_checksum: checksum,
    });

    if (error) throw error;

    return data;
}

export async function getMachineDocuments(machineId: string) {
    const { data, error } = await supabase
        .from("documents")
        .select(`
      id,
      title,
      category,
      version_count,
      document_versions (
        file_path,
        file_name,
        version_number
      )
    `)
        .eq("machine_id", machineId)
        .eq("is_archived", false);

    if (error) throw error;
    return data;
}