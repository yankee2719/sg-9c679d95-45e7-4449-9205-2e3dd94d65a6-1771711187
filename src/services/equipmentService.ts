import { supabase } from "@/integrations/supabase/client";

// Maps to 'machines' table in DB
export interface Machine {
    id: string;
    name: string;
    internal_code: string;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
    category: string | null;
    subcategory: string | null;
    area: string | null;
    position: string | null;
    lifecycle_state: string | null;
    organization_id: string | null;
    plant_id: string | null;
    qr_code_token: string | null;
    qr_code_generated_at: string | null;
    specifications: any;
    notes: string | null;
    photo_url: string | null;
    tags: string[] | null;
    year_of_manufacture: number | null;
    commissioned_at: string | null;
    decommissioned_at: string | null;
    manufacturer_id: string | null;
    created_at: string;
    updated_at: string;
}

// Keep backward-compatible alias
export type Equipment = Machine;
export type EquipmentInsert = Partial<Machine>;
export type EquipmentUpdate = Partial<Machine>;

// Get current user's organization_id
async function getCurrentOrgId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    return profile?.default_organization_id || null;
}

// Get current user's role in their org
export async function getCurrentUserRole(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "technician";

    const orgId = await getCurrentOrgId();
    if (!orgId) return "technician";

    const { data: membership } = await supabase
        .from("organization_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .single();

    return membership?.role || "technician";
}

export async function getAllEquipment() {
    const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("name");

    if (error) throw error;
    return data as Machine[];
}

export async function getEquipmentById(id: string) {
    const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as Machine;
}

export async function createEquipment(machine: Partial<Machine>) {
    const orgId = await getCurrentOrgId();

    const payload = {
        ...machine,
        organization_id: orgId,
    };

    const { data, error } = await supabase
        .from("machines")
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return data as Machine;
}

export async function updateEquipment(id: string, updates: Partial<Machine>) {
    const { data, error } = await supabase
        .from("machines")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Machine;
}

export async function deleteEquipment(id: string) {
    const { error } = await supabase
        .from("machines")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

