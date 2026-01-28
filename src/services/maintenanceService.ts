import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MaintenanceSchedule = Database["public"]["Tables"]["maintenance_schedules"]["Row"];
type MaintenanceScheduleInsert = Database["public"]["Tables"]["maintenance_schedules"]["Insert"];
type MaintenanceLog = Database["public"]["Tables"]["maintenance_logs"]["Row"];
type MaintenanceLogInsert = Database["public"]["Tables"]["maintenance_logs"]["Insert"];

// Define explicit types to avoid deep recursion errors
interface MaintenanceScheduleWithDetails {
  id: string;
  equipment_id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "critical" | null;
  status: "scheduled" | "in_progress" | "completed" | "overdue" | "cancelled" | null;
  equipment: {
    id: string;
    name: string;
    code: string;
  } | null;
  assigned_to: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export const maintenanceService = {
  // Get all maintenance schedules
  async getSchedules() {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment (
          id,
          name,
          code,
          qr_code
        ),
        assigned_to:profiles!maintenance_schedules_assigned_to_fkey (
          id,
          full_name,
          email
        ),
        checklist_template:checklist_templates (
          id,
          name,
          description
        )
      `)
      .order("scheduled_date", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get schedules by technician
  async getSchedulesByTechnician(technicianId: string) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment (
          id,
          name,
          code,
          qr_code
        ),
        checklist_template:checklist_templates (
          id,
          name,
          description
        )
      `)
      .eq("assigned_to", technicianId)
      .order("scheduled_date", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create maintenance schedule
  async createSchedule(schedule: MaintenanceScheduleInsert) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .insert(schedule)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update maintenance schedule
  async updateSchedule(id: string, schedule: Partial<MaintenanceScheduleInsert>) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .update(schedule)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get maintenance logs
  async getLogs(equipmentId?: string) {
    let query = supabase
      .from("maintenance_logs")
      .select(`
        *,
        equipment (
          id,
          name,
          code
        ),
        technician:profiles!maintenance_logs_technician_id_fkey (
          id,
          full_name,
          email
        ),
        schedule:maintenance_schedules (
          id,
          maintenance_type
        )
      `)
      .order("created_at", { ascending: false });

    if (equipmentId) {
      query = query.eq("equipment_id", equipmentId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Create maintenance log
  async createLog(log: MaintenanceLogInsert) {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .insert(log)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get upcoming maintenance (next 7 days)
  async getUpcomingMaintenance() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data, error } = await (supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment (
          id,
          name,
          code
        ),
        assigned_to:profiles!maintenance_schedules_assigned_to_fkey (
          id,
          full_name,
          email
        )
      `) as any)
      .gte("scheduled_date", today.toISOString())
      .lte("scheduled_date", nextWeek.toISOString())
      .eq("status", "scheduled")
      .order("scheduled_date", { ascending: true });

    if (error) throw error;
    return (data as unknown) as MaintenanceScheduleWithDetails[];
  },

  // Get overdue maintenance
  async getOverdueMaintenance() {
    const today = new Date().toISOString();

    const { data, error } = await (supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment (
          id,
          name,
          code
        ),
        assigned_to:profiles!maintenance_schedules_assigned_to_fkey (
          id,
          full_name,
          email
        )
      `) as any)
      .lt("due_date", today)
      .in("status", ["scheduled", "in_progress"])
      .order("due_date", { ascending: true });

    if (error) throw error;
    return (data as unknown) as MaintenanceScheduleWithDetails[];
  },

  // Get maintenance history by equipment ID
  async getByEquipmentId(equipmentId: string) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment (
          id,
          name,
          code
        ),
        assigned_to:profiles!maintenance_schedules_assigned_to_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq("equipment_id", equipmentId)
      .order("scheduled_date", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Link checklists to maintenance schedule
  async linkChecklistsToSchedule(
    scheduleId: string, 
    checklistLinks: Array<{ templateId: string; isRequired: boolean; executionOrder: number }>
  ) {
    const linksToInsert = checklistLinks.map((link, index) => ({
      schedule_id: scheduleId,
      template_id: link.templateId,
      is_required: link.isRequired,
      execution_order: link.executionOrder || index + 1
    }));

    const { data, error } = await supabase
      .from("maintenance_schedule_checklists")
      .insert(linksToInsert)
      .select();

    if (error) throw error;
    return data;
  },

  // Get checklists associated with a maintenance schedule
  async getScheduleChecklists(scheduleId: string) {
    const { data, error } = await supabase
      .from("maintenance_schedule_checklists")
      .select(`
        *,
        template:checklist_templates (
          id,
          name,
          description,
          category,
          estimated_time,
          status
        )
      `)
      .eq("schedule_id", scheduleId)
      .order("execution_order", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get checklist execution status for a maintenance schedule
  async getChecklistExecutionStatus(scheduleId: string) {
    const { data, error } = await supabase
      .from("checklist_executions")
      .select(`
        id,
        template_id,
        status,
        completed_at,
        technician_id,
        total_duration
      `)
      .eq("schedule_id", scheduleId);

    if (error) throw error;
    return data || [];
  },

  // Get maintenance schedule with checklists and execution status
  async getScheduleWithChecklists(scheduleId: string) {
    // Get schedule details
    const { data: schedule, error: scheduleError } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment (
          id,
          name,
          code,
          category,
          location
        ),
        assigned_to:profiles!maintenance_schedules_assigned_to_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq("id", scheduleId)
      .single();

    if (scheduleError) throw scheduleError;
    if (!schedule) return null;

    // Get associated checklists
    const checklists = await this.getScheduleChecklists(scheduleId);

    // Get execution status for each checklist
    const executions = await this.getChecklistExecutionStatus(scheduleId);

    // Merge data
    const checklistsWithStatus = checklists.map((checklistLink) => {
      const execution = executions.find(
        (ex) => ex.template_id === checklistLink.template_id
      );

      return {
        ...checklistLink,
        execution: execution || null,
        isCompleted: execution?.status === "completed",
        isInProgress: execution?.status === "in_progress",
        completedAt: execution?.completed_at || null
      };
    });

    return {
      ...schedule,
      checklists: checklistsWithStatus,
      checklistStats: {
        total: checklistsWithStatus.length,
        completed: checklistsWithStatus.filter((c) => c.isCompleted).length,
        inProgress: checklistsWithStatus.filter((c) => c.isInProgress).length,
        notStarted: checklistsWithStatus.filter((c) => !c.execution).length
      }
    };
  },

  // Update maintenance schedule status based on checklist completion
  async updateScheduleStatusAuto(scheduleId: string) {
    try {
      // Get checklist status
      const scheduleWithChecklists = await this.getScheduleWithChecklists(scheduleId);
      
      if (!scheduleWithChecklists) {
        throw new Error("Schedule not found");
      }

      const { checklists, checklistStats } = scheduleWithChecklists;

      // Determine new status
      let newStatus = scheduleWithChecklists.status;

      if (checklistStats.total === 0) {
        // No checklists, keep current status
        return scheduleWithChecklists;
      }

      // Check if all required checklists are completed
      const requiredChecklists = checklists.filter((c) => c.is_required);
      const completedRequired = requiredChecklists.filter((c) => c.isCompleted).length;

      if (completedRequired === requiredChecklists.length && requiredChecklists.length > 0) {
        // All required checklists completed
        newStatus = "completed";
      } else if (checklistStats.completed > 0 || checklistStats.inProgress > 0) {
        // At least one checklist started or completed
        newStatus = "in_progress";
      } else {
        // No checklists started yet
        newStatus = "scheduled";
      }

      // Update only if status changed
      if (newStatus !== scheduleWithChecklists.status) {
        const { error } = await supabase
          .from("maintenance_schedules")
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", scheduleId);

        if (error) throw error;
      }

      return {
        ...scheduleWithChecklists,
        status: newStatus
      };
    } catch (error) {
      console.error("Error updating schedule status:", error);
      throw error;
    }
  },

  // Remove checklist link from schedule
  async unlinkChecklistFromSchedule(scheduleId: string, templateId: string) {
    const { error } = await supabase
      .from("maintenance_schedule_checklists")
      .delete()
      .eq("schedule_id", scheduleId)
      .eq("template_id", templateId);

    if (error) throw error;
    return true;
  }
};