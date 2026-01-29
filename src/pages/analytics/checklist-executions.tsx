import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Download, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ChecklistExecution {
  id: string;
  template_id: string;
  equipment_id: string;
  executed_by: string;
  started_at: string;
  status: string;
  checklists: {
    name: string;
  };
  equipment: {
    name: string;
    equipment_code: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function ChecklistExecutionsAnalytics() {
  const [executions, setExecutions] = useState<ChecklistExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");

  useEffect(() => {
    loadExecutions();
  }, [timeRange]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("checklist_executions")
        .select(`
          *,
          checklists (name),
          equipment (name, equipment_code),
          profiles (full_name)
        `)
        .gte("started_at", daysAgo.toISOString())
        .order("started_at", { ascending: false });

      if (error) throw error;
      setExecutions(data as unknown as ChecklistExecution[] || []);
    } catch (error) {
      console.error("Error loading executions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "in_progress":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "failed":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const stats = {
    total: executions.length,
    completed: executions.filter(e => e.status === "completed").length,
    inProgress: executions.filter(e => e.status === "in_progress").length,
    failed: executions.filter(e => e.status === "failed").length,
  };

  return (
    <MainLayout>
      <SEO title="Checklist Executions Analytics - Industrial Maintenance" />
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Checklist Executions Analytics</h1>
            <p className="text-muted-foreground mt-2">Track and analyze checklist execution performance</p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Time Range:</span>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : executions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No executions found</div>
            ) : (
              <div className="space-y-4">
                {executions.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {execution.checklists?.name || "Unknown Checklist"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Equipment: {execution.equipment?.name || "N/A"} ({execution.equipment?.equipment_code || "N/A"})
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Executed by: {execution.profiles?.full_name || "Unknown"}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(execution.started_at), "MMM dd, yyyy HH:mm")}
                      </div>
                      <Badge className={getStatusColor(execution.status)}>
                        {execution.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}