import { supabase } from "@/integrations/supabase/client";

export interface ChecklistTemplate {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    is_active: boolean | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChecklistItem {
    id: string;
    checklist_id: string;
    title: string;
    description: string | null;
    is_required: boolean | null;
    order_index: number;
    input_type: string | null;
    created_at: string;
}

export type ChecklistWithItems = ChecklistTemplate & {
    items?: ChecklistItem[];
};

export async function getChecklists(): Promise<ChecklistWithItems[]> {
    const { data, error } = await supabase
        .from("checklists")
        .select(`
            *,
            items:checklist_items(*)
        `)
        .order("created_at", { ascending: false });

    console.log("Checklists loaded:", { data, error });
    if (error) throw error;
    return (data || []) as ChecklistWithItems[];
}

export async function getChecklistById(id: string): Promise<ChecklistWithItems | null> {
    const { data, error } = await supabase
        .from("checklists")
        .select(`
            *,
            items:checklist_items(*)
        `)
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as ChecklistWithItems;
}

export async function createChecklist(
    checklist: {
        name: string;
        description?: string | null;
        category?: string | null;
        is_active?: boolean;
        created_by?: string | null;
    },
    items: Array<{
        title: string;
        description?: string | null;
        is_required?: boolean;
        order_index?: number;
        input_type?: string;
    }>
): Promise<ChecklistWithItems | null> {
    const { data: newChecklist, error: checklistError } = await supabase
        .from("checklists")
        .insert({
            name: checklist.name,
            description: checklist.description || null,
            category: checklist.category || null,
            is_active: checklist.is_active ?? true,
            created_by: checklist.created_by || null
        })
        .select()
        .single();

    if (checklistError) throw checklistError;

    if (items.length > 0) {
        const itemsWithChecklistId = items.map((item, index) => ({
            checklist_id: newChecklist.id,
            title: item.title,
            description: item.description || null,
            is_required: item.is_required ?? true,
            order_index: item.order_index ?? index,
            input_type: item.input_type || "checkbox"
        }));

        const { error: itemsError } = await supabase
            .from("checklist_items")
            .insert(itemsWithChecklistId);

        if (itemsError) throw itemsError;
    }

    return getChecklistById(newChecklist.id);
}

export async function updateChecklist(
    id: string,
    checklist: {
        name?: string;
        description?: string | null;
        category?: string | null;
        is_active?: boolean;
    },
    items?: Array<{
        title: string;
        description?: string | null;
        is_required?: boolean;
        order_index?: number;
        input_type?: string;
    }>
): Promise<ChecklistWithItems | null> {
    const { error: checklistError } = await supabase
        .from("checklists")
        .update(checklist)
        .eq("id", id);

    if (checklistError) throw checklistError;

    if (items) {
        await supabase
            .from("checklist_items")
            .delete()
            .eq("checklist_id", id);

        if (items.length > 0) {
            const itemsWithChecklistId = items.map((item, index) => ({
                checklist_id: id,
                title: item.title,
                description: item.description || null,
                is_required: item.is_required ?? true,
                order_index: item.order_index ?? index,
                input_type: item.input_type || "checkbox"
            }));

            const { error: itemsError } = await supabase
                .from("checklist_items")
                .insert(itemsWithChecklistId);

            if (itemsError) throw itemsError;
        }
    }

    return getChecklistById(id);
}

export async function deleteChecklist(id: string): Promise<void> {
    const { error } = await supabase
        .from("checklists")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

export async function getChecklistsByCategory(category: string): Promise<ChecklistWithItems[]> {
    const { data, error } = await supabase
        .from("checklists")
        .select(`
            *,
            items:checklist_items(*)
        `)
        .eq("category", category)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as ChecklistWithItems[];
}