import { supabase } from "@/integrations/supabase/client";

export const maintenanceService = {
  async getSchedules() {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment:equipment_id(name, equipment_code),
        assigned_user:assigned_to(full_name)
      `)
      .order("next_maintenance_date", { ascending: true });

    if (error) throw error;
    return data;
  },

  async getSchedule(id: string) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment:equipment_id(name, equipment_code),
        assigned_user:assigned_to(full_name)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async createSchedule(schedule: any) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .insert(schedule)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSchedule(id: string, updates: any) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLogs() {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .select(`
        *,
        equipment:equipment_id(name, equipment_code),
        performer:performed_by(full_name)
      `)
      .order("performed_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createLog(log: any) {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .insert(log)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUpcomingMaintenance() {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment:equipment_id(name, equipment_code),
        assigned_user:assigned_to(full_name)
      `)
      .gte('next_maintenance_date', new Date().toISOString())
      .order("next_maintenance_date", { ascending: true })
      .limit(5);

    if (error) throw error;
    return data;
  },

  async getOverdueMaintenance() {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment:equipment_id(name, equipment_code),
        assigned_user:assigned_to(full_name)
      `)
      .lt('next_maintenance_date', new Date().toISOString())
      .order("next_maintenance_date", { ascending: true });

    if (error) throw error;
    return data;
  },

  async deleteSchedule(id: string) {
    const { error } = await supabase
      .from("maintenance_schedules")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },
  
  // Helper to link checklists to schedules (using the new schema if needed or deprecated)
  async getScheduleChecklists(scheduleId: string) {
    // Return empty array as maintenance_schedule_checklists table was removed in new schema
    // Logic should be moved to checklist_executions linking to schedule_id
    return [];
  }
};