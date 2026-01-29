import { supabase } from "@/integrations/supabase/client";

export interface ChecklistTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  equipment_type: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: ChecklistItem[];
}

export type ChecklistTemplateWithTasks = ChecklistTemplate;

export interface ChecklistItem {
  id: string;
  template_id: string;
  description: string;
  item_order: number;
  is_required: boolean;
  requires_photo: boolean;
  requires_note: boolean;
  expected_value: string | null;
  created_at: string;
}

export const checklistService = {
  /**
   * Get all templates
   */
  async getAllTemplates() {
    const { data, error } = await supabase
      .from("checklist_templates")
      .select(`
        *,
        checklist_template_items (
          *
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as ChecklistTemplate[];
  },

  /**
   * Get active templates
   */
  async getActiveTemplates() {
    const { data, error } = await supabase
      .from("checklist_templates")
      .select(`
        *,
        checklist_template_items (
          *
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as ChecklistTemplate[];
  },

  /**
   * Get template by ID
   */
  async getTemplateById(id: string) {
    const { data, error } = await supabase
      .from("checklist_templates")
      .select(`
        *,
        checklist_template_items (
          *
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as ChecklistTemplate;
  },

  /**
   * Create template
   */
  async createTemplate(data: Partial<ChecklistTemplate>, items: Partial<ChecklistItem>[] = []) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Create template
    const { data: template, error: templateError } = await supabase
      .from("checklist_templates")
      .insert({
        title: data.title!,
        description: data.description,
        category: data.category!,
        equipment_type: data.equipment_type,
        is_active: data.is_active ?? true,
        created_by: user?.id
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // 2. Create items
    if (items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        template_id: template.id,
        description: item.description!,
        item_order: index + 1,
        is_required: item.is_required ?? false,
        requires_photo: item.requires_photo ?? false,
        requires_note: item.requires_note ?? false,
        expected_value: item.expected_value
      }));

      const { error: itemsError } = await supabase
        .from("checklist_template_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return template;
  },

  /**
   * Delete template
   */
  async deleteTemplate(id: string) {
    const { error } = await supabase
      .from("checklist_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  /**
   * Create Execution
   */
  async createExecution(templateId: string, equipmentId: string, scheduleId?: string) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("checklist_executions")
      .insert({
        template_id: templateId,
        equipment_id: equipmentId,
        schedule_id: scheduleId,
        executed_by: user?.id,
        status: "in_progress",
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get Execution
   */
  async getExecutionById(id: string) {
    const { data, error } = await supabase
      .from("checklist_executions")
      .select(`
        *,
        template:checklist_templates(*),
        equipment:equipment(*),
        items:checklist_execution_items(*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update Execution Item
   */
  async updateExecutionItem(executionId: string, templateItemId: string, updates: any) {
    // Check if item exists
    const { data: existing } = await supabase
      .from("checklist_execution_items")
      .select("id")
      .eq("execution_id", executionId)
      .eq("template_item_id", templateItemId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("checklist_execution_items")
        .update(updates)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("checklist_execution_items")
        .insert({
          execution_id: executionId,
          template_item_id: templateItemId,
          ...updates
        });
      if (error) throw error;
    }
  },

  /**
   * Complete Execution
   */
  async completeExecution(id: string, notes?: string, signatureData?: string) {
    const { error } = await supabase
      .from("checklist_executions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        notes,
        signature_data: signatureData
      })
      .eq("id", id);

    if (error) throw error;
    return true;
  }
};