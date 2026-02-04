import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

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
  totalEquipment: number;
  activeChecklists: number;
  upcomingMaintenance: number;
  overdueItems: number;
}

export const analyticsService = {
  // Get real dashboard stats from database
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get total equipment count
      const { count: equipmentCount, error: eqError } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true });

      if (eqError) console.error("Error fetching equipment count:", eqError);

      // Get active checklists count
      const { count: checklistCount, error: clError } = await supabase
        .from("checklists")
        .select("*", { count: "exact", head: true });

      if (clError) console.error("Error fetching checklist count:", clError);

      // Get upcoming maintenance count (scheduled, not completed)
      const { count: upcomingCount, error: umError } = await supabase
        .from("maintenance_schedules")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (umError) console.error("Error fetching maintenance count:", umError);

      // Get overdue maintenance count
      const today = new Date().toISOString().split("T")[0];
      const { count: overdueCount, error: odError } = await supabase
        .from("maintenance_schedules")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .lt("next_due_date", today);

      if (odError) console.error("Error fetching overdue count:", odError);

      return {
        totalEquipment: equipmentCount || 0,
        activeChecklists: checklistCount || 0,
        upcomingMaintenance: upcomingCount || 0,
        overdueItems: overdueCount || 0,
      };
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      return {
        totalEquipment: 0,
        activeChecklists: 0,
        upcomingMaintenance: 0,
        overdueItems: 0,
      };
    }
  },

  // Get equipment stats by status
  async getEquipmentStats() {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("status");

      if (error) throw error;

      const statusCounts: Record<string, number> = {};
      data?.forEach((item) => {
        const status = item.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      return Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
      }));
    } catch (error) {
      console.error("Error in getEquipmentStats:", error);
      return [];
    }
  },

  // Get checklist execution stats for a time period
  async getExecutionStats(daysAgo: number = 30): Promise<ChecklistExecutionStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from("checklist_executions")
        .select("status")
        .gte("started_at", startDate.toISOString());

      if (error) throw error;

      const stats: ChecklistExecutionStats = {
        total: data?.length || 0,
        completed: 0,
        in_progress: 0,
        failed: 0,
      };

      data?.forEach((execution) => {
        if (execution.status === "completed") stats.completed++;
        else if (execution.status === "in_progress") stats.in_progress++;
        else if (execution.status === "failed") stats.failed++;
      });

      return stats;
    } catch (error) {
      console.error("Error in getExecutionStats:", error);
      return { total: 0, completed: 0, in_progress: 0, failed: 0 };
    }
  },

  // Get checklist usage stats
  async getTemplateUsageStats(daysAgo: number = 30): Promise<TemplateUsageStats[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from("checklist_executions")
        .select("checklist_id")
        .gte("started_at", startDate.toISOString());

      if (error) throw error;

      // Get unique checklist IDs
      const checklistIds = Array.from(new Set(data?.map(e => e.checklist_id) || []));
      
      // Get checklist names separately
      const { data: checklists } = await supabase
        .from("checklists")
        .select("id, name")
        .in("id", checklistIds);

      const checklistMap = new Map(checklists?.map(c => [c.id, c.name]) || []);

      const checklistCounts: Record<string, number> = {};
      data?.forEach((execution) => {
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

  // Get technician performance stats
  async getTechnicianPerformanceStats(daysAgo: number = 30): Promise<TechnicianPerformanceStats[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from("checklist_executions")
        .select("executed_by, status, started_at, completed_at")
        .gte("started_at", startDate.toISOString());

      if (error) throw error;

      // Get profiles separately to avoid deep type instantiation
      const userIds = Array.from(new Set(data?.map(e => e.executed_by) || []));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const technicianStats: Record<string, {
        name: string;
        executions: number;
        completed: number;
        totalTime: number;
        completedWithTime: number;
      }> = {};

      data?.forEach((execution) => {
        const techId = execution.executed_by;
        const name = profileMap.get(techId) || "Unknown";

        if (!technicianStats[techId]) {
          technicianStats[techId] = {
            name,
            executions: 0,
            completed: 0,
            totalTime: 0,
            completedWithTime: 0,
          };
        }

        technicianStats[techId].executions++;
        
        if (execution.status === "completed") {
          technicianStats[techId].completed++;
          
          if (execution.started_at && execution.completed_at) {
            const startTime = new Date(execution.started_at).getTime();
            const endTime = new Date(execution.completed_at).getTime();
            const minutes = (endTime - startTime) / (1000 * 60);
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
            ? Math.round(stats.totalTime / stats.completedWithTime) 
            : 0,
        }))
        .sort((a, b) => b.executions_count - a.executions_count);
    } catch (error) {
      console.error("Error in getTechnicianPerformanceStats:", error);
      return [];
    }
  },

  // Get daily execution trend
  async getDailyExecutionTrend(daysAgo: number = 30): Promise<DailyExecutionTrend[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from("checklist_executions")
        .select("started_at")
        .gte("started_at", startDate.toISOString())
        .order("started_at", { ascending: true });

      if (error) throw error;

      const dailyCounts: Record<string, number> = {};
      
      // Initialize all days with 0
      for (let i = 0; i < daysAgo; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dailyCounts[dateStr] = 0;
      }

      // Count executions per day
      data?.forEach((execution) => {
        if (execution.started_at) {
          const dateStr = execution.started_at.split("T")[0];
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

  // Get status distribution
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

  // Get maintenance performance by month
  async getMaintenancePerformance(months: number = 6) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("status, completed_at, created_at")
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      const monthlyStats: Record<string, { completed: number; scheduled: number }> = {};

      // Initialize months
      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString("it-IT", { month: "short" });
        monthlyStats[monthKey] = { completed: 0, scheduled: 0 };
      }

      data?.forEach((log) => {
        const date = log.completed_at ? new Date(log.completed_at) : new Date(log.created_at);
        const monthKey = date.toLocaleDateString("it-IT", { month: "short" });
        if (monthlyStats[monthKey]) {
          monthlyStats[monthKey].scheduled++;
          if (log.status === "completed") {
            monthlyStats[monthKey].completed++;
          }
        }
      });

      return Object.entries(monthlyStats)
        .map(([month, stats]) => ({
          month,
          completed: stats.completed,
          scheduled: stats.scheduled,
        }))
        .reverse();
    } catch (error) {
      console.error("Error in getMaintenancePerformance:", error);
      return [];
    }
  },
};