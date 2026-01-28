import { supabase } from "@/integrations/supabase/client";

export interface ChecklistExecutionStats {
  totalExecutions: number;
  completedExecutions: number;
  inProgressExecutions: number;
  cancelledExecutions: number;
  totalIssues: number;
  completionRate: number;
  avgDuration: number;
}

export interface TemplateUsageStats {
  templateId: string;
  templateName: string;
  executionCount: number;
  avgDuration: number;
  estimatedTime: number;
  issueCount: number;
}

export interface TechnicianPerformanceStats {
  technicianId: string;
  technicianName: string;
  completedCount: number;
  inProgressCount: number;
  avgDuration: number;
  completionRate: number;
  issueCount: number;
}

export interface TaskIssueStats {
  taskId: string;
  taskTitle: string;
  templateName: string;
  issueCount: number;
  totalExecutions: number;
  issueRate: number;
}

export interface DailyExecutionTrend {
  date: string;
  completed: number;
  inProgress: number;
  cancelled: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export const analyticsService = {
  /**
   * Get overall execution statistics
   */
  async getExecutionStats(days: number = 30): Promise<ChecklistExecutionStats> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Get all executions in period
      const { data: executions, error } = await supabase
        .from("checklist_executions")
        .select("status, total_duration")
        .gte("created_at", since.toISOString());

      if (error) throw error;

      // Get executions with issues
      const { data: executionsWithIssues, error: issuesError } = await supabase
        .from("checklist_executions")
        .select(`
          id,
          checklist_execution_items!inner(flagged)
        `)
        .gte("created_at", since.toISOString())
        .eq("checklist_execution_items.flagged", true);

      if (issuesError) throw issuesError;

      const total = executions?.length || 0;
      const completed = executions?.filter(e => e.status === "completed").length || 0;
      const inProgress = executions?.filter(e => e.status === "in_progress").length || 0;
      const cancelled = executions?.filter(e => e.status === "cancelled").length || 0;
      const issues = executionsWithIssues?.length || 0;

      const completedExecutions = executions?.filter(e => e.status === "completed" && e.total_duration) || [];
      const avgDuration = completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.total_duration || 0), 0) / completedExecutions.length
        : 0;

      return {
        totalExecutions: total,
        completedExecutions: completed,
        inProgressExecutions: inProgress,
        cancelledExecutions: cancelled,
        totalIssues: issues,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        avgDuration: Math.round(avgDuration),
      };
    } catch (error) {
      console.error("Error getting execution stats:", error);
      return {
        totalExecutions: 0,
        completedExecutions: 0,
        inProgressExecutions: 0,
        cancelledExecutions: 0,
        totalIssues: 0,
        completionRate: 0,
        avgDuration: 0,
      };
    }
  },

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(days: number = 30): Promise<TemplateUsageStats[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("checklist_executions")
        .select(`
          template_id,
          total_duration,
          status,
          checklist_templates!checklist_executions_template_id_fkey (
            id,
            name,
            estimated_time
          )
        `)
        .gte("created_at", since.toISOString())
        .not("checklist_templates", "is", null);

      if (error) throw error;

      // Group by template
      const templateMap = new Map<string, {
        name: string;
        executions: number;
        durations: number[];
        estimatedTime: number;
      }>();

      data?.forEach((exec: any) => {
        const template = exec.checklist_templates;
        if (!template) return;

        const templateId = exec.template_id || template.id;
        
        if (!templateMap.has(templateId)) {
          templateMap.set(templateId, {
            name: template.name,
            executions: 0,
            durations: [],
            estimatedTime: template.estimated_time || 0,
          });
        }

        const stats = templateMap.get(templateId)!;
        stats.executions++;
        if (exec.status === "completed" && exec.total_duration) {
          stats.durations.push(exec.total_duration);
        }
      });

      // Get issue counts per template
      const templateStats: TemplateUsageStats[] = [];
      
      // Get all executions with flagged items first to avoid subquery issues
      const { data: flaggedExecutions } = await supabase
        .from("checklist_execution_items")
        .select("execution_id")
        .eq("flagged", true);
        
      const flaggedExecutionIds = flaggedExecutions?.map(i => i.execution_id) || [];
      const flaggedSet = new Set(flaggedExecutionIds);

      for (const [templateId, stats] of templateMap.entries()) {
        const { count: issueCount } = await supabase
          .from("checklist_executions")
          .select("id", { count: "exact", head: true })
          .eq("template_id", templateId)
          .gte("created_at", since.toISOString())
          .in("id", Array.from(flaggedSet));

        const avgDuration = stats.durations.length > 0
          ? Math.round(stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length)
          : 0;

        templateStats.push({
          templateId,
          templateName: stats.name,
          executionCount: stats.executions,
          avgDuration,
          estimatedTime: stats.estimatedTime,
          issueCount: issueCount || 0,
        });
      }

      return templateStats.sort((a, b) => b.executionCount - a.executionCount);
    } catch (error) {
      console.error("Error getting template usage stats:", error);
      return [];
    }
  },

  /**
   * Get technician performance statistics
   */
  async getTechnicianPerformanceStats(days: number = 30): Promise<TechnicianPerformanceStats[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("checklist_executions")
        .select(`
          technician_id,
          status,
          total_duration,
          profiles!checklist_executions_technician_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .gte("created_at", since.toISOString())
        .not("profiles", "is", null);

      if (error) throw error;

      // Group by technician
      const techMap = new Map<string, {
        name: string;
        completed: number;
        inProgress: number;
        durations: number[];
      }>();

      data?.forEach((exec: any) => {
        const profile = exec.profiles;
        if (!profile) return;

        if (!techMap.has(exec.technician_id)) {
          techMap.set(exec.technician_id, {
            name: profile.full_name || profile.email || "Unknown",
            completed: 0,
            inProgress: 0,
            durations: [],
          });
        }

        const stats = techMap.get(exec.technician_id)!;
        if (exec.status === "completed") {
          stats.completed++;
          if (exec.total_duration) {
            stats.durations.push(exec.total_duration);
          }
        } else if (exec.status === "in_progress") {
          stats.inProgress++;
        }
      });

      const techStats: TechnicianPerformanceStats[] = [];
      
      // We can reuse the flaggedExecutionIds from above if needed, or query again if context differs.
      // Since it's a new function scope, we query again for safety/independence.
      const { data: flaggedExecutionsTech } = await supabase
        .from("checklist_execution_items")
        .select("execution_id")
        .eq("flagged", true);
        
      const flaggedExecutionIdsTech = flaggedExecutionsTech?.map(i => i.execution_id) || [];

      for (const [techId, stats] of techMap.entries()) {
        const total = stats.completed + stats.inProgress;
        const avgDuration = stats.durations.length > 0
          ? Math.round(stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length)
          : 0;

        // Get issue count for technician
        const { count: issueCount } = await supabase
          .from("checklist_executions")
          .select("id", { count: "exact", head: true })
          .eq("technician_id", techId)
          .gte("created_at", since.toISOString())
          .in("id", flaggedExecutionIdsTech); // Use prepared array

        techStats.push({
          technicianId: techId,
          technicianName: stats.name,
          completedCount: stats.completed,
          inProgressCount: stats.inProgress,
          avgDuration,
          completionRate: total > 0 ? (stats.completed / total) * 100 : 0,
          issueCount: issueCount || 0,
        });
      }

      return techStats.sort((a, b) => b.completedCount - a.completedCount);
    } catch (error) {
      console.error("Error getting technician performance stats:", error);
      return [];
    }
  },

  /**
   * Get task issue statistics
   */
  async getTaskIssueStats(days: number = 30): Promise<TaskIssueStats[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("checklist_execution_items")
        .select(`
          task_id,
          flagged,
          execution_id,
          checklist_tasks!checklist_execution_items_task_id_fkey (
            id,
            title,
            checklist_templates!checklist_tasks_template_id_fkey (
              name
            )
          ),
          checklist_executions!checklist_execution_items_execution_id_fkey (
            created_at
          )
        `)
        .gte("checklist_executions.created_at", since.toISOString())
        .not("checklist_tasks", "is", null);

      if (error) throw error;

      // Group by task
      const taskMap = new Map<string, {
        title: string;
        templateName: string;
        issues: number;
        total: number;
      }>();

      data?.forEach((item: any) => {
        const task = item.checklist_tasks;
        if (!task) return;

        const taskId = item.task_id;
        
        if (!taskMap.has(taskId)) {
          taskMap.set(taskId, {
            title: task.title,
            templateName: task.checklist_templates?.name || "Unknown",
            issues: 0,
            total: 0,
          });
        }

        const stats = taskMap.get(taskId)!;
        stats.total++;
        if (item.flagged) {
          stats.issues++;
        }
      });

      const taskStats: TaskIssueStats[] = [];

      for (const [taskId, stats] of taskMap.entries()) {
        if (stats.issues > 0) {
          taskStats.push({
            taskId,
            taskTitle: stats.title,
            templateName: stats.templateName,
            issueCount: stats.issues,
            totalExecutions: stats.total,
            issueRate: (stats.issues / stats.total) * 100,
          });
        }
      }

      return taskStats.sort((a, b) => b.issueCount - a.issueCount).slice(0, 10);
    } catch (error) {
      console.error("Error getting task issue stats:", error);
      return [];
    }
  },

  /**
   * Get daily execution trend
   */
  async getDailyExecutionTrend(days: number = 30): Promise<DailyExecutionTrend[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("checklist_executions")
        .select("created_at, status")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date
      const dateMap = new Map<string, { completed: number; inProgress: number; cancelled: number }>();

      data?.forEach((exec: any) => {
        const date = new Date(exec.created_at).toISOString().split("T")[0];
        
        if (!dateMap.has(date)) {
          dateMap.set(date, { completed: 0, inProgress: 0, cancelled: 0 });
        }

        const stats = dateMap.get(date)!;
        if (exec.status === "completed") stats.completed++;
        else if (exec.status === "in_progress") stats.inProgress++;
        else if (exec.status === "cancelled") stats.cancelled++;
      });

      const trend: DailyExecutionTrend[] = [];
      for (const [date, stats] of dateMap.entries()) {
        trend.push({
          date,
          ...stats,
        });
      }

      return trend.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error("Error getting daily execution trend:", error);
      return [];
    }
  },

  /**
   * Get status distribution
   */
  async getStatusDistribution(days: number = 30): Promise<StatusDistribution[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("checklist_executions")
        .select("status")
        .gte("created_at", since.toISOString());

      if (error) throw error;

      const statusCount = new Map<string, number>();
      const total = data?.length || 0;

      data?.forEach((exec: any) => {
        const status = exec.status || "unknown";
        statusCount.set(status, (statusCount.get(status) || 0) + 1);
      });

      const distribution: StatusDistribution[] = [];
      for (const [status, count] of statusCount.entries()) {
        distribution.push({
          status,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
        });
      }

      return distribution.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error("Error getting status distribution:", error);
      return [];
    }
  },
};