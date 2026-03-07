// src/lib/domain/equipmentService.ts
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";

export interface EquipmentRecord {
    id: string;
    name: string;
    internal_code?: string | null;
    serial_number?: string | null;
    model?: string | null;
    brand?: string | null;
    organization_id?: string | null;
    plant_id?: string | null;
    production_line_id?: string | null;
    lifecycle_state?: string | null;
    notes?: string | null;
    is_archived?: boolean | null;
}

export async function listMachinesForActiveOrganization() {
    const ctx = await getUserContext();
    if (!ctx?.orgId) throw new Error("Contesto organizzativo non valido.");

    const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("organization_id", ctx.orgId)
        .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as EquipmentRecord[];
}

export async function getMachineById(machineId: string) {
    const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("id", machineId)
        .maybeSingle();

    if (error) throw error;
    return (data ?? null) as EquipmentRecord | null;
}

export async function createMachine(payload: Partial<EquipmentRecord>) {
    const { data, error } = await supabase
        .from("machines")
        .insert(payload)
        .select("*")
        .single();

    if (error) throw error;
    return data as EquipmentRecord;
}

export async function updateMachine(machineId: string, payload: Partial<EquipmentRecord>) {
    const { data, error } = await supabase
        .from("machines")
        .update(payload)
        .eq("id", machineId)
        .select("*")
        .single();

    if (error) throw error;
    return data as EquipmentRecord;
}

export async function archiveMachine(machineId: string) {
    const { error } = await supabase
        .from("machines")
        .update({ is_archived: true })
        .eq("id", machineId);

    if (error) throw error;
}

const equipmentService = {
    listMachinesForActiveOrganization,
    getMachineById,
    createMachine,
    updateMachine,
    archiveMachine,
};

export default equipmentService;
