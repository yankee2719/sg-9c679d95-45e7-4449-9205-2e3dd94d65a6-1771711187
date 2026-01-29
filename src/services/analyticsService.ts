import { supabase } from "@/integrations/supabase/client";

export interface ChecklistExecutionStats {
  total: number;
  completed: number;
  in_progress: number;
  failed: number;
}

export interface TemplateUsageStats {
  template_name: string;
  usage_count: number;
}

export interface TechnicianPerformanceStats {
  technician_name: string;
  executions_count: number;
  avg_completion_time_minutes: number;
}

export interface TaskIssueStats {
  task_description: string;
  issue_count: number;
}

export interface DailyExecutionTrend {
  date: string;
  count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export const analyticsService = {
  async getDashboardStats() {
    return {
      totalEquipment: 12,
      activeIssues: 3,
      pendingMaintenance: 5,
      completedChecklists: 128
    };
  },

  async getEquipmentStats() {
    return [
      { name: 'Active', value: 8 },
      { name: 'Maintenance', value: 2 },
      { name: 'Inactive', value: 1 },
      { name: 'Retired', value: 1 },
    ];
  },

  async getMaintenancePerformance() {
    return [
      { month: 'Jan', completed: 12, scheduled: 15 },
      { month: 'Feb', completed: 18, scheduled: 20 },
      { month: 'Mar', completed: 10, scheduled: 10 },
    ];
  },

  async getExecutionStats(): Promise<ChecklistExecutionStats> {
    return { total: 100, completed: 80, in_progress: 15, failed: 5 };
  },

  async getTemplateUsageStats(): Promise<TemplateUsageStats[]> {
    return [{ template_name: "Daily Check", usage_count: 50 }];
  },

  async getTechnicianPerformanceStats(): Promise<TechnicianPerformanceStats[]> {
    return [{ technician_name: "John Doe", executions_count: 20, avg_completion_time_minutes: 15 }];
  },

  async getTaskIssueStats(): Promise<TaskIssueStats[]> {
    return [{ task_description: "Check Oil", issue_count: 5 }];
  },

  async getDailyExecutionTrend(): Promise<DailyExecutionTrend[]> {
    return [{ date: "2024-01-01", count: 10 }];
  },

  async getStatusDistribution(): Promise<StatusDistribution[]> {
    return [{ status: "completed", count: 80 }, { status: "failed", count: 5 }];
  }
};