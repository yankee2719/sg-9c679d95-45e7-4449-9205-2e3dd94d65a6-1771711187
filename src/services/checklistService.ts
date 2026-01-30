import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Checklist = Database["public"]["Tables"]["checklists"]["Row"];

export type ChecklistWithItems = Checklist & {
    items?: any[];
};

export async function getChecklists(): Promise<ChecklistWithItems[]> {
    const { data, error } = await supabase
        .from("checklists")
        .select(`
      *,
      items:checklist_items(*)
    `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getChecklistById(id: string): Promise<ChecklistWithItems> {
    const { data, error } = await supabase
        .from("checklists")
        .select(`
      *,
      items:checklist_items(*)
    `)
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
}

export async function createChecklist(
    checklist: Partial<Checklist>,
    items: any[]
): Promise<ChecklistWithItems> {
    const { data: newChecklist, error: checklistError } = await supabase
        .from("checklists")
        .insert(checklist)
        .select()
        .single();

    if (checklistError) throw checklistError;

    if (items.length > 0) {
        const itemsWithChecklistId = items.map((item, index) => ({
            ...item,
            checklist_id: newChecklist.id,
            order_index: index
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
    checklist: Partial<Checklist>,
    items?: any[]
): Promise<ChecklistWithItems> {
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
                ...item,
                checklist_id: id,
                order_index: index
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
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}