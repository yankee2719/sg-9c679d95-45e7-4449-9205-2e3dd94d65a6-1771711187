import { supabase } from "@/integrations/supabase/client";

// Get current user's organization_id
async function getMyOrgId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    return profile?.default_organization_id || null;
}

export async function getChecklists() {
    const { data, error } = await supabase
        .from("checklists")
        .select("*, checklist_items(count)")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

export async function getChecklistById(id: string) {
    const { data, error } = await supabase
        .from("checklists")
        .select("*, checklist_items(*)")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
}

export async function createChecklist(checklist: {
    title: string;
    description?: string;
    checklist_type?: string;
    machine_id?: string | null;
    is_template?: boolean;
}) {
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = await getMyOrgId();

    const { data, error } = await supabase
        .from("checklists")
        .insert({
            ...checklist,
            created_by: user?.id,
            organization_id: orgId,
            is_active: true,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function addChecklistItem(item: {
    checklist_id: string;
    title: string;
    description?: string;
    item_order?: number;
    is_required?: boolean;
    expected_value?: string;
    min_value?: number;
    max_value?: number;
    measurement_unit?: string;
}) {
    const { data, error } = await supabase
        .from("checklist_items")
        .insert(item)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function createExecution(execution: {
    checklist_id: string;
    machine_id?: string | null;
    work_order_id?: string | null;
}) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("checklist_executions")
        .insert({
            ...execution,
            executed_by: user?.id,
            executed_at: new Date().toISOString(),
            overall_status: "in_progress",
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function completeExecution(executionId: string, results: any, notes?: string) {
    const { data, error } = await supabase
        .from("checklist_executions")
        .update({
            overall_status: "completed",
            completed_at: new Date().toISOString(),
            results,
            notes,
        })
        .eq("id", executionId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteChecklist(id: string) {
    await supabase.from("checklist_items").delete().eq("checklist_id", id);
    const { error } = await supabase.from("checklists").delete().eq("id", id);
    if (error) throw error;
}
