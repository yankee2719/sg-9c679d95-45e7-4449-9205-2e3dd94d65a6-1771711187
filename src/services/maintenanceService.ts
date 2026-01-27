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
      .order("completed_at", { ascending: false });

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
  }
};