import { supabase } from "@/integrations/supabase/client";

export interface Equipment {
  id: string;
  name: string;
  equipment_code: string;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  installation_date: string | null;
  location: string | null;
  status: "active" | "under_maintenance" | "out_of_service";
  technical_specs: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to safely cast status
const parseEquipment = (data: any): Equipment => ({
  ...data,
  status: (["active", "under_maintenance", "out_of_service"].includes(data.status) 
    ? data.status 
    : "active") as "active" | "under_maintenance" | "out_of_service"
});

export async function getAllEquipment(): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(parseEquipment);
}

export async function getEquipmentById(id: string): Promise<Equipment> {
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return parseEquipment(data);
}

export async function createEquipment(equipment: Omit<Equipment, "id" | "created_at" | "updated_at">): Promise<Equipment> {
  const { data, error } = await supabase
    .from("equipment")
    .insert(equipment)
    .select()
    .single();

  if (error) throw error;
  return parseEquipment(data);
}

export async function updateEquipment(id: string, equipment: Partial<Omit<Equipment, "id" | "created_at" | "updated_at">>): Promise<Equipment> {
  const { data, error } = await supabase
    .from("equipment")
    .update(equipment)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return parseEquipment(data);
}

export async function deleteEquipment(id: string): Promise<void> {
  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
