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
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("equipment")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Get technical specifications
  async getSpecifications(equipmentId: string) {
    const { data, error } = await supabase
      .from("equipment_specifications")
      .select("*")
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Update technical specifications
  async updateSpecifications(equipmentId: string, specs: { id?: string; spec_key: string; spec_value: string; unit?: string }[]) {
    // 1. Get current specs to identify what to delete
    const { data: currentSpecs } = await supabase
      .from("equipment_specifications")
      .select("id")
      .eq("equipment_id", equipmentId);
      
    const currentIds = currentSpecs?.map(s => s.id) || [];
    const newIds = specs.filter(s => s.id).map(s => s.id);
    
    // 2. Delete removed specs
    const idsToDelete = currentIds.filter(id => !newIds.includes(id));
    if (idsToDelete.length > 0) {
      await supabase
        .from("equipment_specifications")
        .delete()
        .in("id", idsToDelete);
    }
    
    // 3. Insert or Update specs
    for (const spec of specs) {
      if (spec.id) {
        // Update existing
        await supabase
          .from("equipment_specifications")
          .update({
            spec_key: spec.spec_key,
            spec_value: spec.spec_value,
            unit: spec.unit
          })
          .eq("id", spec.id);
      } else {
        // Insert new
        await supabase
          .from("equipment_specifications")
          .insert({
            equipment_id: equipmentId,
            spec_key: spec.spec_key,
            spec_value: spec.spec_value,
            unit: spec.unit
          });
      }
    }
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