import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Equipment = Database["public"]["Tables"]["equipment"]["Row"];
export type EquipmentInsert = Database["public"]["Tables"]["equipment"]["Insert"];
export type EquipmentUpdate = Database["public"]["Tables"]["equipment"]["Update"];

// Campi di tipo date nel database
const DATE_FIELDS = ["purchase_date", "warranty_expiry", "last_maintenance", "next_maintenance"];

// Funzione helper per pulire i campi data vuoti (converte "" in null)
function cleanDateFields<T extends Record<string, unknown>>(data: T): T {
  const cleaned = { ...data };
  for (const field of DATE_FIELDS) {
    if (field in cleaned && cleaned[field] === "") {
      (cleaned as Record<string, unknown>)[field] = null;
    }
  }
  return cleaned;
}

export async function getAllEquipment() {
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Equipment[];
}

export async function getEquipmentById(id: string) {
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function createEquipment(equipment: EquipmentInsert) {
  // Pulisci i campi data vuoti prima dell'inserimento
  const cleanedEquipment = cleanDateFields(equipment);

  const { data, error } = await supabase
    .from("equipment")
    .insert(cleanedEquipment)
    .select()
    .single();

  if (error) throw error;
  return data as Equipment;
}

export async function updateEquipment(id: string, equipment: EquipmentUpdate) {
  // Pulisci i campi data vuoti prima dell'aggiornamento
  const cleanedEquipment = cleanDateFields(equipment);

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
  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getEquipmentByQrCode(qrCode: string) {
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
  // Usa equipment_code se disponibile, altrimenti usa l'ID o un fallback
  const codePart = equipment.equipment_code || equipment.id.substring(0, 8);
  const qrCode = `EQ-${codePart}-${Date.now()}`;

  await updateEquipment(id, { qr_code: qrCode });
  return qrCode;
}