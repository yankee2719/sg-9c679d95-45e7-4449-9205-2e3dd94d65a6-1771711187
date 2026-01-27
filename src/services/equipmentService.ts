import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Equipment = Database["public"]["Tables"]["equipment"]["Row"];
type EquipmentInsert = Database["public"]["Tables"]["equipment"]["Insert"];
type EquipmentUpdate = Database["public"]["Tables"]["equipment"]["Update"];
type EquipmentCategory = Database["public"]["Tables"]["equipment_categories"]["Row"];

export const equipmentService = {
  // Get all equipment
  async getAll() {
    const { data, error } = await supabase
      .from("equipment")
      .select(`
        *,
        equipment_categories (
          id,
          name,
          description
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get equipment by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from("equipment")
      .select(`
        *,
        equipment_categories (
          id,
          name,
          description
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get equipment by QR code
  async getByQRCode(qrCode: string) {
    const { data, error } = await supabase
      .from("equipment")
      .select(`
        *,
        equipment_categories (
          id,
          name,
          description
        )
      `)
      .eq("qr_code", qrCode)
      .single();

    if (error) throw error;
    return data;
  },

  // Create equipment
  async create(equipment: EquipmentInsert) {
    const { data, error } = await supabase
      .from("equipment")
      .insert(equipment)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update equipment
  async update(id: string, equipment: EquipmentUpdate) {
    const { data, error } = await supabase
      .from("equipment")
      .update(equipment)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete equipment
  async delete(id: string) {
    const { error } = await supabase
      .from("equipment")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Get all categories
  async getCategories() {
    const { data, error } = await supabase
      .from("equipment_categories")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  },

  // Create category
  async createCategory(category: Database["public"]["Tables"]["equipment_categories"]["Insert"]) {
    const { data, error } = await supabase
      .from("equipment_categories")
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};