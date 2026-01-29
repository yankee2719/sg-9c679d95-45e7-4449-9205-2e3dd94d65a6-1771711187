import { supabase } from "@/integrations/supabase/client";

export interface EquipmentDocument {
  id: string;
  equipment_id: string;
  title: string;
  file_url: string;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

export const documentService = {
  async uploadDocument(file: File, equipmentId: string, title: string) {
    // 1. Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('equipment_documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment_documents')
      .getPublicUrl(filePath);

    // 3. Create database record
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("equipment_documents")
      .insert({
        equipment_id: equipmentId,
        title: title,
        file_url: publicUrl,
        file_type: fileExt || 'unknown',
        uploaded_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDocuments(equipmentId: string) {
    const { data, error } = await supabase
      .from("equipment_documents")
      .select("*")
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    // Force cast to avoid strict type checks on created_at which might be string vs Date issue
    return data as any as EquipmentDocument[];
  },

  async deleteDocument(id: string) {
    const { error } = await supabase
      .from("equipment_documents")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};