import { supabase } from "@/integrations/supabase/client";

export const maintenanceService = {
  async getSchedules() {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select(`
        *,
        equipment:equipment(id, name),
        assigned_user:profiles(id, full_name)
      `)
      .order("next_due_date", { ascending: true });

    if (error) {
      console.error("Error fetching schedules:", error);
      throw error;
    }

    return data || [];
  },

  async getAllMaintenance() {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .select(`
        *,
        equipment:equipment(id, name),
        assigned_to:profiles(id, full_name)
      `)
      .order("scheduled_date", { ascending: false });

    if (error) {
      console.error("Error fetching maintenance:", error);
      throw error;
    }

    return data || [];
  },

  async getMaintenanceById(id: string) {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .select(`
        *,
        equipment:equipment(id, name),
        assigned_to:profiles(id, full_name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching maintenance:", error);
      throw error;
    }

    return data;
  },

  async createMaintenance(maintenance: {
    title: string;
    description?: string;
    equipment_id: string;
    assigned_to?: string;
    priority: string;
    status: string;
    scheduled_date: string;
  }) {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .insert(maintenance)
      .select()
      .single();

    if (error) {
      console.error("Error creating maintenance:", error);
      throw error;
    }

    return data;
  },

  async updateMaintenance(id: string, updates: {
    title?: string;
    description?: string;
    equipment_id?: string;
    assigned_to?: string;
    priority?: string;
    status?: string;
    scheduled_date?: string;
    completed_date?: string;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from("maintenance_logs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating maintenance:", error);
      throw error;
    }

    return data;
  },

  async deleteMaintenance(id: string) {
    const { error } = await supabase
      .from("maintenance_logs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting maintenance:", error);
      throw error;
    }
  },

  async getUpcomingMaintenance(days: number = 7) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabase
      .from("maintenance_logs")
      .select(`
        *,
        equipment:equipment(id, name),
        assigned_to:profiles(id, full_name)
      `)
      .gte("scheduled_date", today.toISOString())
      .lte("scheduled_date", futureDate.toISOString())
      .in("status", ["pending", "in_progress"])
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error fetching upcoming maintenance:", error);
      throw error;
    }

    return data || [];
  },

  async getOverdueMaintenance() {
    const today = new Date().toISOString();

    const { data, error } = await supabase
      .from("maintenance_logs")
      .select(`
        *,
        equipment:equipment(id, name),
        assigned_to:profiles(id, full_name)
      `)
      .lt("scheduled_date", today)
      .in("status", ["pending", "in_progress"])
      .order("scheduled_date", { ascending: true });

    if (error) {
      console.error("Error fetching overdue maintenance:", error);
      throw error;
    }

    return data || [];
  },

  async createSchedule(schedule: {
    title: string;
    description?: string;
    equipment_id: string;
    assigned_to?: string;
    frequency: string;
    next_due_date: string;
    checklist_id?: string;
  }) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .insert(schedule)
      .select()
      .single();

    if (error) {
      console.error("Error creating schedule:", error);
      throw error;
    }

    return data;
  },

  async updateSchedule(id: string, updates: any) {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating schedule:", error);
      throw error;
    }

    return data;
  },

  async deleteSchedule(id: string) {
    const { error } = await supabase
      .from("maintenance_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting schedule:", error);
      throw error;
    }
  }
};

export default maintenanceService;