import { supabase } from "@/integrations/supabase/client";

async function getMyTenantId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
    return data?.tenant_id || null;
}

export const checklistService = {
    async getAllChecklists() {
        const { data, error } = await supabase
            .from("checklists")
            .select(`
        *,
        items:checklist_items(*)
      `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching checklists:", error);
            throw error;
        }

        return data || [];
    },

    async getChecklistById(id: string) {
        const { data, error } = await supabase
            .from("checklists")
            .select(`
        *,
        items:checklist_items(*)
      `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching checklist:", error);
            throw error;
        }

        return data;
    },

    async createChecklist(checklist: {
        name: string;
        description?: string;
        is_active?: boolean;
    }) {
        const tenantId = await getMyTenantId();
        const { data, error } = await supabase
            .from("checklists")
            .insert({ ...checklist, tenant_id: tenantId })
            .select()
            .single();

        if (error) {
            console.error("Error creating checklist:", error);
            throw error;
        }

        return data;
    },

    async updateChecklist(id: string, updates: {
        name?: string;
        description?: string;
        is_active?: boolean;
    }) {
        const { data, error } = await supabase
            .from("checklists")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating checklist:", error);
            throw error;
        }

        return data;
    },

    async deleteChecklist(id: string) {
        await supabase
            .from("checklist_items")
            .delete()
            .eq("checklist_id", id);

        const { error } = await supabase
            .from("checklists")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting checklist:", error);
            throw error;
        }
    },

    async addChecklistItem(item: {
        checklist_id: string;
        title: string;
        description?: string;
        item_type: string;
        is_required?: boolean;
        order_index: number;
    }) {
        const tenantId = await getMyTenantId();
        const { data, error } = await supabase
            .from("checklist_items")
            .insert({ ...item, tenant_id: tenantId })
            .select()
            .single();

        if (error) {
            console.error("Error adding checklist item:", error);
            throw error;
        }

        return data;
    },

    async updateChecklistItem(id: string, updates: {
        title?: string;
        description?: string;
        item_type?: string;
        is_required?: boolean;
        order_index?: number;
    }) {
        const { data, error } = await supabase
            .from("checklist_items")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating checklist item:", error);
            throw error;
        }

        return data;
    },

    async deleteChecklistItem(id: string) {
        const { error } = await supabase
            .from("checklist_items")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting checklist item:", error);
            throw error;
        }
    },

    async createExecution(execution: {
        checklist_id: string;
        executed_by: string;
        equipment_id?: string;
        status: string;
    }) {
        const tenantId = await getMyTenantId();
        const { data, error } = await supabase
            .from("checklist_executions")
            .insert({ ...execution, tenant_id: tenantId })
            .select()
            .single();

        if (error) {
            console.error("Error creating execution:", error);
            throw error;
        }

        return data;
    },

    async getExecutionById(id: string) {
        const { data, error } = await supabase
            .from("checklist_executions")
            .select(`
        *,
        checklist:checklists(*),
        equipment:equipment(*),
        executor:profiles(*)
      `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching execution:", error);
            throw error;
        }

        return data;
    },

    async updateExecution(id: string, updates: any) {
        const { data, error } = await supabase
            .from("checklist_executions")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating execution:", error);
            throw error;
        }

        return data;
    }
};

export default checklistService;