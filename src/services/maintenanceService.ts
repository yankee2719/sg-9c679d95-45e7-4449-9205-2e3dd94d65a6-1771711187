import { supabase } from "@/integrations/supabase/client";

interface MaintenanceSchedule {
  id: string;
  equipment_id: string;
  title: string;
  description: string | null;
  frequency: string;
  next_due_date: string | null;
  last_performed_at: string | null;
  assigned_to: string | null;
  checklist_id: string | null;
  created_at: string;
  updated_at: string;
  equipment?: { id: string; name: string; equipment_code?: string };
  checklist?: { id: string; name: string };
}

interface MaintenanceLog {
  id: string;
  equipment_id: string;
  performed_by: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  schedule_id: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  equipment?: { id: string; name: string };
  performed_by_user?: { id: string; full_name: string };
}

export const maintenanceService = {
  // Get all maintenance schedules
  async getSchedules(): Promise<MaintenanceSchedule[]> {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment:equipment(id, name, equipment_code),
        checklist:checklists(id, name)
      `)
      .order("next_due_date", { ascending: true });

    if (error) {
      console.error("Error fetching maintenance schedules:", error);
      throw error;
    }

    return (data || []) as MaintenanceSchedule[];
  },

  // Get schedule by ID
  async getScheduleById(id: string): Promise<MaintenanceSchedule> {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment:equipment(id, name, equipment_code),
        checklist:checklists(id, name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching schedule:", error);
      throw error;
    }

    return data as MaintenanceSchedule;
  },

  // Create maintenance schedule
  async createSchedule(scheduleData: {
    equipment_id: string;
    title: string;
    description?: string;
    frequency: string;
    next_due_date: string;
    assigned_to?: string;
    checklist_id?: string;
  }) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .insert({
        equipment_id: scheduleData.equipment_id,
        title: scheduleData.title,
        description: scheduleData.description || null,
        frequency: scheduleData.frequency,
        next_due_date: scheduleData.next_due_date,
        assigned_to: scheduleData.assigned_to || null,
        checklist_id: scheduleData.checklist_id || null
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating maintenance schedule:", error);
      throw error;
    }

    return data;
  },

  // Update maintenance schedule
  async updateSchedule(id: string, scheduleData: {
    equipment_id?: string;
    title?: string;
    description?: string;
    frequency?: string;
    next_due_date?: string;
    assigned_to?: string | null;
    checklist_id?: string | null;
    last_performed_at?: string;
  }) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .update(scheduleData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating maintenance schedule:", error);
      throw error;
    }

    return data;
  },

  // Delete maintenance schedule
  async deleteSchedule(id: string) {
    const { error } = await supabase
      .from("maintenance_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting schedule:", error);
      throw error;
    }
  },

  // Get maintenance logs
  async getLogs(equipmentId?: string): Promise<MaintenanceLog[]> {
    let query = supabase
      .from("maintenance_logs")
      .select(`
        *,
        equipment:equipment(id, name),
        performed_by_user:profiles(id, full_name)
      `)
      .order("created_at", { ascending: false });

    if (equipmentId) {
      query = query.eq("equipment_id", equipmentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching maintenance logs:", error);
      throw error;
    }

    return (data || []) as MaintenanceLog[];
  },

  // Create maintenance log
  async createLog(logData: {
    equipment_id: string;
    performed_by: string;
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    schedule_id?: string;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .insert({
        equipment_id: logData.equipment_id,
        performed_by: logData.performed_by,
        title: logData.title,
        description: logData.description || null,
        priority: logData.priority || "medium",
        status: logData.status || "pending",
        schedule_id: logData.schedule_id || null,
        notes: logData.notes || null
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating maintenance log:", error);
      throw error;
    }

    return data;
  },

  // Update maintenance log
  async updateLog(id: string, logData: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    notes?: string;
    completed_at?: string;
  }) {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .update(logData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating maintenance log:", error);
      throw error;
    }

    return data;
  },

  // Complete maintenance log
  async completeLog(id: string, completionData: {
    time_spent_minutes?: number;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        time_spent_minutes: completionData.time_spent_minutes || null,
        notes: completionData.notes || null
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error completing maintenance log:", error);
      throw error;
    }

    return data;
  },

  // Get upcoming maintenance
  async getUpcoming(days: number = 7): Promise<MaintenanceSchedule[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment:equipment(id, name, equipment_code)
      `)
      .lte("next_due_date", futureDate.toISOString())
      .order("next_due_date", { ascending: true });

    if (error) {
      console.error("Error fetching upcoming maintenance:", error);
      throw error;
    }

    return (data || []) as MaintenanceSchedule[];
  }
};

export default maintenanceService;