import { supabase } from "@/integrations/supabase/client";
import { checklistService } from "./checklistService";

// Helper to get current user's tenant_id
async function getCurrentTenantId(): Promise<string | null> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    return profile?.tenant_id || null;
}

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
    tenant_id: string | null;
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
    tenant_id: string | null;
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
            .select(
                `
        *,
        equipment:equipment(id, name, equipment_code),
        checklist:checklists(id, name)
      `
            )
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
            .select(
                `
        *,
        equipment:equipment(id, name, equipment_code),
        checklist:checklists(id, name)
      `
            )
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching schedule:", error);
            throw error;
        }

        return data as MaintenanceSchedule;
    },

    // Create maintenance schedule (FIX: adds tenant_id)
    async createSchedule(scheduleData: {
        equipment_id: string;
        title: string;
        description?: string;
        frequency: string;
        next_due_date: string;
        assigned_to?: string;
        checklist_id?: string;
    }) {
        const tenantId = await getCurrentTenantId();

        const { data, error } = await supabase
            .from("maintenance_schedules")
            .insert({
                equipment_id: scheduleData.equipment_id,
                title: scheduleData.title,
                description: scheduleData.description || null,
                frequency: scheduleData.frequency,
                next_due_date: scheduleData.next_due_date,
                assigned_to: scheduleData.assigned_to || null,
                checklist_id: scheduleData.checklist_id || null,
                tenant_id: tenantId,
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
    async updateSchedule(
        id: string,
        scheduleData: {
            equipment_id?: string;
            title?: string;
            description?: string;
            frequency?: string;
            next_due_date?: string;
            assigned_to?: string | null;
            checklist_id?: string | null;
            last_performed_at?: string;
        }
    ) {
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

    // Get maintenance logs (FIX: adds tenant_id)
    async getLogs(equipmentId?: string): Promise<MaintenanceLog[]> {
        let query = supabase
            .from("maintenance_logs")
            .select(
                `
        *,
        equipment:equipment(id, name),
        performed_by_user:profiles(id, full_name)
      `
            )
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

    // Create maintenance log (FIX: adds tenant_id)
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
        const tenantId = await getCurrentTenantId();

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
                notes: logData.notes || null,
                tenant_id: tenantId,
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
    async updateLog(
        id: string,
        logData: {
            title?: string;
            description?: string;
            priority?: string;
            status?: string;
            notes?: string;
            completed_at?: string;
        }
    ) {
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

    // Get upcoming maintenance
    async getUpcoming(days: number = 7): Promise<MaintenanceSchedule[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const { data, error } = await supabase
            .from("maintenance_schedules")
            .select(
                `
        *,
        equipment:equipment(id, name, equipment_code)
      `
            )
            .lte("next_due_date", futureDate.toISOString())
            .order("next_due_date", { ascending: true });

        if (error) {
            console.error("Error fetching upcoming maintenance:", error);
            throw error;
        }

        return (data || []) as MaintenanceSchedule[];
    },

    // FIX: Start maintenance with linked checklist execution
    async startMaintenanceWithChecklist(
        scheduleId: string,
        userId: string
    ): Promise<{
        log: MaintenanceLog;
        execution: Record<string, unknown> | null;
    }> {
        // 1. Get schedule details
        const schedule = await this.getScheduleById(scheduleId);

        // 2. Create maintenance log
        const log = (await this.createLog({
            equipment_id: schedule.equipment_id,
            performed_by: userId,
            title: schedule.title,
            description: schedule.description || undefined,
            status: "in_progress",
            schedule_id: scheduleId,
        })) as MaintenanceLog;

        // 3. If schedule has a linked checklist, create execution
        let execution = null;
        if (schedule.checklist_id) {
            execution = await checklistService.createExecution({
                checklist_id: schedule.checklist_id,
                executed_by: userId,
                equipment_id: schedule.equipment_id,
                maintenance_log_id: log.id,
                schedule_id: scheduleId,
                status: "in_progress",
            });
        }

        // 4. Update schedule's last_performed_at
        await this.updateSchedule(scheduleId, {
            last_performed_at: new Date().toISOString(),
        });

        return { log, execution };
    },

    // Complete maintenance (updates log + schedule next_due_date)
    async completeMaintenance(
        logId: string,
        scheduleId?: string,
        notes?: string
    ) {
        // 1. Update log status
        const log = await this.updateLog(logId, {
            status: "completed",
            completed_at: new Date().toISOString(),
            notes: notes || undefined,
        });

        // 2. If linked to schedule, calculate next due date
        if (scheduleId) {
            const schedule = await this.getScheduleById(scheduleId);
            const nextDueDate = this.calculateNextDueDate(
                schedule.frequency,
                new Date()
            );

            await this.updateSchedule(scheduleId, {
                next_due_date: nextDueDate.toISOString(),
                last_performed_at: new Date().toISOString(),
            });
        }

        return log;
    },

    // Helper: calculate next due date based on frequency
    calculateNextDueDate(frequency: string, fromDate: Date): Date {
        const next = new Date(fromDate);
        switch (frequency) {
            case "daily":
                next.setDate(next.getDate() + 1);
                break;
            case "weekly":
                next.setDate(next.getDate() + 7);
                break;
            case "monthly":
                next.setMonth(next.getMonth() + 1);
                break;
            case "quarterly":
                next.setMonth(next.getMonth() + 3);
                break;
            case "yearly":
                next.setFullYear(next.getFullYear() + 1);
                break;
            default:
                next.setMonth(next.getMonth() + 1);
        }
        return next;
    },
};

export default maintenanceService;
