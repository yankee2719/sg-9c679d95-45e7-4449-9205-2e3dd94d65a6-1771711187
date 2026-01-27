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
  }
};