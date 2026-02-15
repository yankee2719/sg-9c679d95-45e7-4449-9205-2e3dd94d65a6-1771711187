import { supabase } from "@/integrations/supabase/client";

// Simple type definitions
interface SimpleExecution {
    checklist_id: string;
    overall_status?: string;
    executed_at?: string;
    completed_at?: string | null;
    executed_by?: string;
}

interface WorkOrderRow {
    status: string;
    completed_at: string | null;
    created_at: string | null;
}

export interface ChecklistExecutionStats {
    total: number;
    completed: number;
    in_progress: number;
    failed: number;
}

export interface TemplateUsageStats {
    checklist_id: string;
    checklist_name: string;
    usage_count: number;
}

export interface TechnicianPerformanceStats {
    technician_id: string;
    technician_name: string;
    executions_count: number;
    completed_count: number;
    avg_completion_time_minutes: number;
}

export interface DailyExecutionTrend {
    date: string;
    count: number;
}

export interface StatusDistribution {
    status: string;
    count: number;
}

export interface DashboardStats {
    totalMachines: number;
    activeChecklists: number;
    upcomingMaintenance: number;
    overdueItems: number;
}

// Helper: get checklist executions
async function getChecklistExecutionsRaw(startDate: string): Promise<{ data: SimpleExecution[] | null; error: unknown }> {
    const { data, error } = await supabase
        .from("checklist_executions")
        .select("checklist_id, overall_status, executed_at, completed_at, executed_by")
        .gte("executed_at", startDate);
    return { data: data as SimpleExecution[] | null, error };
}

// Helper: get checklists by IDs
async function getChecklistsByIds(ids: string[]): Promise<{ data: Array<{ id: string; title: string }> | null; error: unknown }> {
    const { data, error } = await supabase
        .from("checklists")
        .select("id, title")
        .in("id", ids);
    return { data: data as Array<{ id: string; title: string }> | null, error };
}

// Helper: get profiles by IDs
async function getProfilesByIds(ids: string[]): Promise<{ data: Array<{ id: string; display_name: string | null }> | null; error: unknown }> {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
    return { data: data as Array<{ id: string; display_name: string | null }> | null, error };
}

export const analyticsService = {
    // Dashboard stats
    async getDashboardStats(): Promise<DashboardStats> {
        try {
            const { count: machineCount } = await supabase
                .from("machines")
                .select("*", { count: "exact", head: true })
                .eq("is_archived", false);

            const { count: checklistCount } = await supabase
                .from("checklists")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true);

            const today = new Date().toISOString().split("T")[0];

            const { count: upcomingCount } = await supabase
                .from("maintenance_plans")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true)
                .gte("next_due_date", today);

            const { count: overdueCount } = await supabase
                .from("maintenance_plans")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true)
                .lt("next_due_date", today);

            return {
                totalMachines: machineCount || 0,
                activeChecklists: checklistCount || 0,
                upcomingMaintenance: upcomingCount || 0,
                overdueItems: overdueCount || 0,
            };
        } catch (error) {
            console.error("Error in getDashboardStats:", error);
            return { totalMachines: 0, activeChecklists: 0, upcomingMaintenance: 0, overdueItems: 0 };
        }
    },

    // Machine stats by lifecycle state
    async getMachineStats() {
        try {
            const { data, error } = await supabase
                .from("machines")
                .select("lifecycle_state")
                .eq("is_archived", false);

            if (error) throw error;

            const statusCounts: Record<string, number> = {};
            data?.forEach((item) => {
                const status = item.lifecycle_state || "unknown";
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });

            return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        } catch (error) {
            console.error("Error in getMachineStats:", error);
            return [];
        }
    },

    // Checklist execution stats
    async getExecutionStats(daysAgo: number = 30): Promise<ChecklistExecutionStats> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);

            const { data, error } = await getChecklistExecutionsRaw(startDate.toISOString());

            if (error) throw error;

            const stats: ChecklistExecutionStats = {
                total: data?.length || 0,
                completed: 0,
                in_progress: 0,
                failed: 0,
            };

            data?.forEach((execution) => {
                if (execution.overall_status === "passed") stats.completed++;
                else if (execution.overall_status === "pending") stats.in_progress++;
                else if (execution.overall_status === "failed") stats.failed++;
            });

            return stats;
        } catch (error) {
            console.error("Error in getExecutionStats:", error);
            return { total: 0, completed: 0, in_progress: 0, failed: 0 };
        }
    },

    // Template usage stats
    async getTemplateUsageStats(daysAgo: number = 30): Promise<TemplateUsageStats[]> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);

            const { data: executions, error: execError } = await getChecklistExecutionsRaw(startDate.toISOString());
            if (execError) throw execError;
            if (!executions || executions.length === 0) return [];

            const checklistIds = Array.from(new Set(executions.map(e => e.checklist_id)));
            if (checklistIds.length === 0) return [];

            const { data: checklists, error: clError } = await getChecklistsByIds(checklistIds);
            if (clError) throw clError;

            const checklistMap = new Map((checklists || []).map(c => [c.id, c.title]));

            const checklistCounts: Record<string, number> = {};
            executions.forEach((execution) => {
                const checklistId = execution.checklist_id;
                checklistCounts[checklistId] = (checklistCounts[checklistId] || 0) + 1;
            });

            return Object.entries(checklistCounts)
                .map(([checklist_id, count]) => ({
                    checklist_id,
                    checklist_name: checklistMap.get(checklist_id) || "Unknown",
                    usage_count: count,
                }))
                .sort((a, b) => b.usage_count - a.usage_count);
        } catch (error) {
            console.error("Error in getTemplateUsageStats:", error);
            return [];
        }
    },

    // Technician performance stats
    async getTechnicianPerformanceStats(daysAgo: number = 30): Promise<TechnicianPerformanceStats[]> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);

            const { data, error } = await getChecklistExecutionsRaw(startDate.toISOString());
            if (error) throw error;
            if (!data || data.length === 0) return [];

            const userIds = Array.from(new Set(data.map(e => e.executed_by).filter((id): id is string => !!id)));
            const { data: profiles } = await getProfilesByIds(userIds);
            const profileMap = new Map((profiles || []).map(p => [p.id, p.display_name || "Unknown"]));

            const technicianStats: Record<string, {
                name: string; executions: number; completed: number; totalTime: number; completedWithTime: number;
            }> = {};

            data.forEach((execution) => {
                const techId = execution.executed_by;
                if (!techId) return;

                if (!technicianStats[techId]) {
                    technicianStats[techId] = {
                        name: profileMap.get(techId) || "Unknown",
                        executions: 0, completed: 0, totalTime: 0, completedWithTime: 0,
                    };
                }

                technicianStats[techId].executions++;

                if (execution.overall_status === "passed") {
                    technicianStats[techId].completed++;

                    if (execution.executed_at && execution.completed_at) {
                        const minutes = (new Date(execution.completed_at).getTime() - new Date(execution.executed_at).getTime()) / (1000 * 60);
                        if (minutes > 0 && minutes < 480) {
                            technicianStats[techId].totalTime += minutes;
                            technicianStats[techId].completedWithTime++;
                        }
                    }
                }
            });

            return Object.entries(technicianStats)
                .map(([technician_id, stats]) => ({
                    technician_id,
                    technician_name: stats.name,
                    executions_count: stats.executions,
                    completed_count: stats.completed,
                    avg_completion_time_minutes: stats.completedWithTime > 0
                        ? Math.round(stats.totalTime / stats.completedWithTime) : 0,
                }))
                .sort((a, b) => b.executions_count - a.executions_count);
        } catch (error) {
            console.error("Error in getTechnicianPerformanceStats:", error);
            return [];
        }
    },

    // Daily execution trend
    async getDailyExecutionTrend(daysAgo: number = 30): Promise<DailyExecutionTrend[]> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);

            const { data, error } = await getChecklistExecutionsRaw(startDate.toISOString());
            if (error) throw error;

            const dailyCounts: Record<string, number> = {};

            for (let i = 0; i < daysAgo; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dailyCounts[date.toISOString().split("T")[0]] = 0;
            }

            data?.forEach((execution) => {
                if (execution.executed_at) {
                    const dateStr = execution.executed_at.split("T")[0];
                    if (dailyCounts[dateStr] !== undefined) {
                        dailyCounts[dateStr]++;
                    }
                }
            });

            return Object.entries(dailyCounts)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            console.error("Error in getDailyExecutionTrend:", error);
            return [];
        }
    },

    // Status distribution
    async getStatusDistribution(daysAgo: number = 30): Promise<StatusDistribution[]> {
        try {
            const stats = await this.getExecutionStats(daysAgo);
            return [
                { status: "completed", count: stats.completed },
                { status: "in_progress", count: stats.in_progress },
                { status: "failed", count: stats.failed },
            ].filter(s => s.count > 0);
        } catch (error) {
            console.error("Error in getStatusDistribution:", error);
            return [];
        }
    },

    // Maintenance performance (work_orders instead of maintenance_logs)
    async getMaintenancePerformance(months: number = 6) {
        try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);

            const { data, error } = await supabase
                .from("work_orders")
                .select("status, completed_at, created_at")
                .gte("created_at", startDate.toISOString());

            if (error) throw error;

            const monthlyStats: Record<string, { completed: number; scheduled: number }> = {};

            for (let i = 0; i < months; i++) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthKey = date.toLocaleDateString("it-IT", { month: "short" });
                monthlyStats[monthKey] = { completed: 0, scheduled: 0 };
            }

            (data as WorkOrderRow[])?.forEach((log) => {
                const date = log.completed_at ? new Date(log.completed_at) : new Date(log.created_at!);
                const monthKey = date.toLocaleDateString("it-IT", { month: "short" });
                if (monthlyStats[monthKey]) {
                    monthlyStats[monthKey].scheduled++;
                    if (log.status === "completed") {
                        monthlyStats[monthKey].completed++;
                    }
                }
            });

            return Object.entries(monthlyStats)
                .map(([month, stats]) => ({ month, completed: stats.completed, scheduled: stats.scheduled }))
                .reverse();
        } catch (error) {
            console.error("Error in getMaintenancePerformance:", error);
            return [];
        }
    },
};