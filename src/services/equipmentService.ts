import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Equipment = Database["public"]["Tables"]["equipment"]["Row"];
export type EquipmentInsert = Database["public"]["Tables"]["equipment"]["Insert"];
export type EquipmentUpdate = Database["public"]["Tables"]["equipment"]["Update"];

// Date fields in the database
const DATE_FIELDS = ["purchase_date", "warranty_expiry", "last_maintenance", "next_maintenance"];

// Helper function to clean empty date fields (converts "" to null)
function cleanDateFields<T extends Record<string, unknown>>(data: T): T {
  const cleaned = { ...data };
  for (const field of DATE_FIELDS) {
    if (field in cleaned && cleaned[field] === "") {
      (cleaned as Record<string, unknown>)[field] = null;
    }
  }
  return cleaned;
}

// Get current user's tenant_id
async function getCurrentTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  
  return profile?.tenant_id || null;
}

// Note: RLS policies automatically filter equipment by tenant_id
// All queries will only return equipment belonging to the current user's tenant

export async function getAllEquipment() {
  // RLS automatically filters by tenant_id
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Equipment[];
}

export async function getEquipmentById(id: string) {
  // RLS automatically ensures user can only access their tenant's equipment
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function createEquipment(equipment: EquipmentInsert) {
  // Get current user's tenant_id and add it to the equipment
  const tenantId = await getCurrentTenantId();
  
  const equipmentWithTenant = {
    ...equipment,
    tenant_id: tenantId,
  };
  
  // Clean empty date fields before insertion
  const cleanedEquipment = cleanDateFields(equipmentWithTenant);

  const { data, error } = await supabase
    .from("equipment")
    .insert(cleanedEquipment)
    .select()
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function updateEquipment(id: string, equipment: EquipmentUpdate) {
  // Clean empty date fields before update
  const cleanedEquipment = cleanDateFields(equipment);

  // RLS automatically ensures user can only update their tenant's equipment
  const { data, error } = await supabase
    .from("equipment")
    .update(cleanedEquipment)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function deleteEquipment(id: string) {
  // RLS automatically ensures user can only delete their tenant's equipment
  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getEquipmentByQrCode(qrCode: string) {
  // RLS automatically filters by tenant_id
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("qr_code", qrCode)
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function generateEquipmentQrCode(id: string) {
  const equipment = await getEquipmentById(id);
  // Use equipment_code if available, otherwise use ID or a fallback
  const codePart = equipment.equipment_code || equipment.id.substring(0, 8);
  const qrCode = `EQ-${codePart}-${Date.now()}`;

  await updateEquipment(id, { qr_code: qrCode });
  return qrCode;
}