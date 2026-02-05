import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Document = Database["public"]["Tables"]["documents"]["Row"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];

export async function uploadDocument(
  equipmentId: string,
  file: File,
  title: string
): Promise<Document> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${equipmentId}_${Date.now()}.${fileExt}`;
  const filePath = `documents/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      equipment_id: equipmentId,
      title,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDocumentsByEquipment(equipmentId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("equipment_id", equipmentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteDocument(id: string): Promise<void> {
  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  if (doc?.file_path) {
    await supabase.storage.from("documents").remove([doc.file_path]);
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getDocumentUrl(filePath: string): Promise<string> {
  const { data } = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  return data.publicUrl;
}