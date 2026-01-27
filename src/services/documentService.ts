import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type EquipmentDocument = Database["public"]["Tables"]["equipment_documents"]["Row"];
type EquipmentDocumentInsert = Database["public"]["Tables"]["equipment_documents"]["Insert"];
type EquipmentDocumentUpdate = Database["public"]["Tables"]["equipment_documents"]["Update"];

export const documentService = {
  // Get all documents for an equipment
  async getByEquipmentId(equipmentId: string) {
    const { data, error } = await supabase
      .from("equipment_documents")
      .select(`
        *,
        uploaded_by:profiles!equipment_documents_uploaded_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get documents by category
  async getByCategory(equipmentId: string, category: string) {
    const { data, error } = await supabase
      .from("equipment_documents")
      .select("*")
      .eq("equipment_id", equipmentId)
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Upload file to Supabase Storage
  async uploadFile(file: File, equipmentId: string): Promise<{ path: string; publicUrl: string }> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${equipmentId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `equipment-documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("equipment-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("equipment-documents")
      .getPublicUrl(filePath);

    return { path: filePath, publicUrl };
  },

  // Create document record
  async create(document: EquipmentDocumentInsert) {
    const { data, error } = await supabase
      .from("equipment_documents")
      .insert(document)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update document
  async update(id: string, document: EquipmentDocumentUpdate) {
    const { data, error } = await supabase
      .from("equipment_documents")
      .update(document)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete document
  async delete(id: string, storagePath?: string) {
    // Delete from storage if it's an uploaded file
    if (storagePath) {
      const path = storagePath.split("/equipment-documents/")[1];
      if (path) {
        await supabase.storage
          .from("equipment-documents")
          .remove([path]);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from("equipment_documents")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Get storage bucket info
  async getStorageBucket() {
    const { data, error } = await supabase.storage.getBucket("equipment-documents");
    if (error) {
      // Bucket doesn't exist, try to create it
      const { data: newBucket, error: createError } = await supabase.storage.createBucket("equipment-documents", {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/dwg",
          "application/dxf"
        ]
      });
      
      if (createError) throw createError;
      return newBucket;
    }
    return data;
  },

  // Download file
  async downloadFile(storagePath: string, fileName: string) {
    const path = storagePath.split("/equipment-documents/")[1];
    if (!path) throw new Error("Invalid storage path");

    const { data, error } = await supabase.storage
      .from("equipment-documents")
      .download(path);

    if (error) throw error;

    // Create download link
    const url = window.URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};