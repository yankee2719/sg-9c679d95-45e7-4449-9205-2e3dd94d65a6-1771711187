import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Custom interface to handle technical_specs type correctly
export interface Equipment {
  id: string;
  name: string;
  equipment_code: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  location: string | null;
  installation_date: string | null;
  status: "active" | "inactive" | "under_maintenance" | "retired";
  notes: string | null;
  technical_specs: Record<string, any> | null;
  created_at: string;
}

export const equipmentService = {
  // Get all equipment
  async getAll() {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get equipment by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get equipment by QR code
  async getByQRCode(qrCode: string) {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("qr_code", qrCode)
      .single();

    if (error) throw error;
    return data;
  },

  // Create equipment
  async create(equipment: Partial<Equipment>) {
    const { data, error } = await supabase
      .from("equipment")
      .insert(equipment as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update equipment
  async update(id: string, equipment: Partial<Equipment>) {
    const { data, error } = await supabase
      .from("equipment")
      .update(equipment as any)
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

  // Get technical specifications (Legacy support - likely moving to JSONB)
  async getSpecifications(equipmentId: string) {
    // Return empty array if using JSONB column in equipment table
    return []; 
  },

  async getCategories() {
    // Return standard categories for now
    return [
      { id: 'machinery', category: 'Machinery' },
      { id: 'vehicles', category: 'Vehicles' },
      { id: 'tools', category: 'Tools' },
      { id: 'electronics', category: 'Electronics' }
    ];
  }
};