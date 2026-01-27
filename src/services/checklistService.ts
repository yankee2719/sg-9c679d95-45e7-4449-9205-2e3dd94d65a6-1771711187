import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ChecklistTemplate = Database["public"]["Tables"]["checklist_templates"]["Row"];
type ChecklistTemplateInsert = Database["public"]["Tables"]["checklist_templates"]["Insert"];
type ChecklistItem = Database["public"]["Tables"]["checklist_items"]["Row"];
type ChecklistExecution = Database["public"]["Tables"]["checklist_executions"]["Row"];

export const checklistService = {
  // Get all templates
  async getTemplates() {
    const { data, error } = await supabase
      .from("checklist_templates")
      .select(`
        *,
        checklist_items (
          id,
          description,
          item_type,
          order_index
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get template by ID with items
  async getTemplateById(id: string) {
    const { data, error } = await supabase
      .from("checklist_templates")
      .select(`
        *,
        checklist_items (
          id,
          description,
          item_type,
          order_index
        )
      `)
      .eq("id", id)
      .order("checklist_items(order_index)", { ascending: true })
      .single();

    if (error) throw error;
    return data;
  },

  // Create template
  async createTemplate(template: ChecklistTemplateInsert) {
    const { data, error } = await supabase
      .from("checklist_templates")
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update template
  async updateTemplate(id: string, template: Partial<ChecklistTemplateInsert>) {
    const { data, error } = await supabase
      .from("checklist_templates")
      .update(template)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add item to template
  async createItem(item: Database["public"]["Tables"]["checklist_items"]["Insert"]) {
    const { data, error } = await supabase
      .from("checklist_items")
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update item
  async updateItem(id: string, item: Partial<Database["public"]["Tables"]["checklist_items"]["Insert"]>) {
    const { data, error } = await supabase
      .from("checklist_items")
      .update(item)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete item
  async deleteItem(id: string) {
    const { error } = await supabase
      .from("checklist_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Execute checklist
  async executeChecklist(execution: Database["public"]["Tables"]["checklist_executions"]["Insert"]) {
    const { data, error } = await supabase
      .from("checklist_executions")
      .insert(execution)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get executions by maintenance log
  async getExecutionsByLog(logId: string) {
    const { data, error } = await supabase
      .from("checklist_executions")
      .select(`
        *,
        checklist_item:checklist_items (
          id,
          description,
          item_type
        )
      `)
      .eq("maintenance_log_id", logId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }
};