import { supabase } from "@/integrations/supabase/client";

// Campi di tipo UUID nel database
const UUID_FIELDS = ["equipment_id", "assigned_to", "checklist_id", "performed_by"];

// Campi di tipo date nel database
const DATE_FIELDS = ["next_due_date", "next_maintenance_date", "scheduled_date", "due_date", "performed_at"];

// Funzione helper per pulire i campi vuoti (converte "" in null)
function cleanEmptyFields<T extends Record<string, unknown>>(data: T): T {
    const cleaned = { ...data };
    const allFieldsToClean = [...UUID_FIELDS, ...DATE_FIELDS];

    for (const field of allFieldsToClean) {
        if (field in cleaned && cleaned[field] === "") {
            (cleaned as Record<string, unknown>)[field] = null;
        }
    }
    return cleaned;
}

export async function createMaintenanceSchedule(schedule: any) {
    const cleanedSchedule = cleanEmptyFields(schedule);

    const { data, error } = await supabase
        .from("maintenance_schedules")
        .insert(cleanedSchedule)
        .select()
        .single();

    if (error) throw error;
    return data;
}

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
        const cleanedSchedule = cleanEmptyFields(schedule);

        const { data, error } = await supabase
            .from("maintenance_schedules")
            .insert(cleanedSchedule)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateSchedule(id: string, updates: any) {
        const cleanedUpdates = cleanEmptyFields(updates);

        const { data, error } = await supabase
            .from("maintenance_schedules")
            .update(cleanedUpdates)
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
        const cleanedLog = cleanEmptyFields(log);

        const { data, error } = await supabase
            .from("maintenance_logs")
            .insert(cleanedLog)
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

    async getScheduleChecklists(scheduleId: string) {
        return [];
    }
};

export const getMaintenanceByEquipment = async (equipmentId: string) => {
    const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("next_maintenance_date", { ascending: true });

    if (error) throw error;
    return data || [];
};