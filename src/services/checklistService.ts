import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChecklistTemplate = Database["public"]["Tables"]["checklist_templates"]["Row"];
export type ChecklistTask = Database["public"]["Tables"]["checklist_tasks"]["Row"];

export interface ChecklistTemplateWithTasks extends ChecklistTemplate {
  checklist_tasks: ChecklistTask[];
}

export interface CreateChecklistTemplateData {
  name: string;
  description?: string;
  category: string;
  estimated_time: number;
  equipment?: string;
  status: "draft" | "active" | "archived";
  tasks: {
    title: string;
    description?: string;
    required: boolean;
    task_order: number;
  }[];
}

export const checklistService = {
  /**
   * Crea un nuovo template checklist con i suoi task
   */
  async createTemplate(data: CreateChecklistTemplateData): Promise<ChecklistTemplateWithTasks | null> {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error("Non autenticato");
      }

      // 1. Crea il template
      const { data: template, error: templateError } = await supabase
        .from("checklist_templates")
        .insert({
          name: data.name,
          description: data.description,
          category: data.category,
          estimated_time: data.estimated_time,
          equipment: data.equipment,
          status: data.status,
          created_by: session.data.session.user.id,
        })
        .select()
        .single();

      if (templateError || !template) {
        console.error("Errore creazione template:", templateError);
        throw templateError;
      }

      // 2. Crea i task associati
      if (data.tasks.length > 0) {
        const tasksToInsert = data.tasks.map((task) => ({
          template_id: template.id,
          title: task.title,
          description: task.description,
          required: task.required,
          task_order: task.task_order,
        }));

        const { error: tasksError } = await supabase
          .from("checklist_tasks")
          .insert(tasksToInsert);

        if (tasksError) {
          console.error("Errore creazione task:", tasksError);
          // Rollback: elimina il template se i task falliscono
          await supabase.from("checklist_templates").delete().eq("id", template.id);
          throw tasksError;
        }
      }

      // 3. Ritorna il template completo
      return await this.getTemplateById(template.id);
    } catch (error) {
      console.error("Errore createTemplate:", error);
      return null;
    }
  },

  /**
   * Recupera tutti i template checklist con i loro task
   */
  async getAllTemplates(): Promise<ChecklistTemplateWithTasks[]> {
    try {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select(`
          *,
          checklist_tasks (*)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Errore getAllTemplates:", error);
        return [];
      }

      // Casting manuale sicuro perché sappiamo che la query include la relazione
      return (data || []) as unknown as ChecklistTemplateWithTasks[];
    } catch (error) {
      console.error("Errore getAllTemplates:", error);
      return [];
    }
  },

  /**
   * Recupera un template specifico con i suoi task
   */
  async getTemplateById(id: string): Promise<ChecklistTemplateWithTasks | null> {
    try {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select(`
          *,
          checklist_tasks (*)
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Errore getTemplateById:", error);
        return null;
      }

      return data as unknown as ChecklistTemplateWithTasks;
    } catch (error) {
      console.error("Errore getTemplateById:", error);
      return null;
    }
  },

  /**
   * Aggiorna lo status di un template
   */
  async updateTemplateStatus(id: string, status: "draft" | "active" | "archived"): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("checklist_templates")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        console.error("Errore updateTemplateStatus:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Errore updateTemplateStatus:", error);
      return false;
    }
  },

  /**
   * Elimina un template checklist
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("checklist_templates")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Errore deleteTemplate:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Errore deleteTemplate:", error);
      return false;
    }
  },
  
  /**
   * Recupera i template attivi (per i tecnici)
   */
  async getActiveTemplates(): Promise<ChecklistTemplateWithTasks[]> {
    try {
        const { data, error } = await supabase
          .from("checklist_templates")
          .select(`
            *,
            checklist_tasks (*)
          `)
          .eq("status", "active")
          .order("created_at", { ascending: false });
  
        if (error) {
          console.error("Errore getActiveTemplates:", error);
          return [];
        }
  
        return (data || []) as unknown as ChecklistTemplateWithTasks[];
      } catch (error) {
        console.error("Errore getActiveTemplates:", error);
        return [];
      }
  },

  // Get template by ID with all its tasks
  async getTemplateWithTasks(templateId: string): Promise<ChecklistTemplateWithTasks | null> {
    try {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select(`
          *,
          checklist_tasks (*)
        `)
        .eq("id", templateId)
        .single();

      if (error) throw error;
      
      if (!data) return null;

      return {
        ...data,
        checklist_tasks: Array.isArray(data.checklist_tasks) 
          ? data.checklist_tasks.sort((a, b) => a.task_order - b.task_order)
          : []
      };
    } catch (error) {
      console.error("Error getTemplateWithTasks:", error);
      return null;
    }
  },

  // Get statistics for a template (task count, execution count)
  async getTemplateStats(templateId: string): Promise<{ tasksCount: number; executionsCount: number }> {
    try {
      // Count tasks
      const { count: tasksCount, error: tasksError } = await supabase
        .from("checklist_tasks")
        .select("*", { count: "exact", head: true })
        .eq("template_id", templateId);

      if (tasksError) throw tasksError;

      // Count executions
      // Note: we check both checklist_template_id (legacy) and template_id (new)
      const { count: executionsCount, error: execError } = await supabase
        .from("checklist_executions")
        .select("*", { count: "exact", head: true })
        .or(`checklist_template_id.eq.${templateId},template_id.eq.${templateId}`);

      if (execError) throw execError;

      return {
        tasksCount: tasksCount || 0,
        executionsCount: executionsCount || 0
      };
    } catch (error) {
      console.error("Error getTemplateStats:", error);
      return { tasksCount: 0, executionsCount: 0 };
    }
  },

  // Create checklist execution linked to maintenance schedule
  async createExecutionForSchedule(templateId: string, scheduleId: string, technicianId: string) {
    try {
      const { data, error } = await supabase
        .from("checklist_executions")
        .insert({
          template_id: templateId,
          checklist_template_id: templateId, // Required for legacy compatibility
          schedule_id: scheduleId,
          technician_id: technicianId,
          status: "in_progress",
          started_at: new Date().toISOString(),
          items_data: {} // Required field
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error creating execution for schedule:", error);
      throw error;
    }
  },

  // Get execution by ID with full details
  async getExecutionById(executionId: string) {
    try {
      const { data, error } = await supabase
        .from("checklist_executions")
        .select(`
          *,
          template:checklist_templates (
            id,
            name,
            description,
            category,
            estimated_time
          ),
          technician:profiles!checklist_executions_technician_id_fkey (
            id,
            full_name,
            email
          ),
          schedule:maintenance_schedules (
            id,
            title,
            equipment_id,
            equipment (
              id,
              name,
              code
            )
          )
        `)
        .eq("id", executionId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting execution by ID:", error);
      return null;
    }
  },

  // Complete execution and update maintenance schedule status
  async completeExecutionForSchedule(executionId: string) {
    try {
      // Get execution details
      const execution = await this.getExecutionById(executionId);
      
      if (!execution) {
        throw new Error("Execution not found");
      }

      // Update execution status
      const { error: updateError } = await supabase
        .from("checklist_executions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", executionId);

      if (updateError) throw updateError;

      // If linked to schedule, update maintenance status
      if (execution.schedule_id) {
        const { maintenanceService } = await import("./maintenanceService");
        await maintenanceService.updateScheduleStatusAuto(execution.schedule_id);
      }

      return true;
    } catch (error) {
      console.error("Error completing execution:", error);
      throw error;
    }
  },

  // Get all executions for a specific schedule
  async getExecutionsBySchedule(scheduleId: string) {
    try {
      const { data, error } = await supabase
        .from("checklist_executions")
        .select(`
          *,
          template:checklist_templates (
            id,
            name,
            description,
            estimated_time
          ),
          technician:profiles!checklist_executions_technician_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq("schedule_id", scheduleId)
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting executions by schedule:", error);
      return [];
    }
  },

  /**
   * Update existing template
   */
  async updateTemplate(
    templateId: string,
    data: {
      name: string;
      description?: string;
      category: string;
      estimated_time: number;
      equipment?: string;
      status: "draft" | "active" | "archived";
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("checklist_templates")
        .update({
          name: data.name,
          description: data.description,
          category: data.category,
          estimated_time: data.estimated_time,
          equipment: data.equipment,
          status: data.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);

      if (error) {
        console.error("Error updating template:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error updateTemplate:", error);
      return false;
    }
  },

  /**
   * Delete all tasks for a template (used before updating)
   */
  async deleteTemplateTasks(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("checklist_tasks")
        .delete()
        .eq("template_id", templateId);

      if (error) {
        console.error("Error deleting template tasks:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error deleteTemplateTasks:", error);
      return false;
    }
  },

  /**
   * Update template with tasks (delete old, insert new)
   */
  async updateTemplateWithTasks(
    templateId: string,
    templateData: {
      name: string;
      description?: string;
      category: string;
      estimated_time: number;
      equipment?: string;
      status: "draft" | "active" | "archived";
    },
    tasks: {
      title: string;
      description?: string;
      required: boolean;
      task_order: number;
    }[]
  ): Promise<boolean> {
    try {
      // 1. Update template
      const updateSuccess = await this.updateTemplate(templateId, templateData);
      if (!updateSuccess) {
        throw new Error("Failed to update template");
      }

      // 2. Delete old tasks
      const deleteSuccess = await this.deleteTemplateTasks(templateId);
      if (!deleteSuccess) {
        throw new Error("Failed to delete old tasks");
      }

      // 3. Insert new tasks
      if (tasks.length > 0) {
        const tasksToInsert = tasks.map((task) => ({
          template_id: templateId,
          title: task.title,
          description: task.description,
          required: task.required,
          task_order: task.task_order,
        }));

        const { error: tasksError } = await supabase
          .from("checklist_tasks")
          .insert(tasksToInsert);

        if (tasksError) {
          console.error("Error inserting new tasks:", error);
          throw tasksError;
        }
      }

      return true;
    } catch (error) {
      console.error("Error updateTemplateWithTasks:", error);
      return false;
    }
  }
};