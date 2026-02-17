import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { analyticsService, ChecklistExecutionStats, TemplateUsageStats, TechnicianPerformanceStats } from "@/services/analyticsService";
import { Download, Calendar, TrendingUp, Users, ClipboardList, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChecklistExecution {
  id: string;
  checklist_id: string;
  equipment_id: string;
  executed_by: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  checklists: { name: string } | null;
  equipment: { name: string; equipment_code: string } | null;
  profiles: { full_name: string } | null;
}

export default function ChecklistExecutionsAnalytics() {
  const { t } = useLanguage();
  const [executions, setExecutions] = useState < ChecklistExecution[] > ([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [stats, setStats] = useState < ChecklistExecutionStats > ({ total: 0, completed: 0, in_progress: 0, failed: 0 });
  const [templateStats, setTemplateStats] = useState < TemplateUsageStats[] > ([]);
  const [technicianStats, setTechnicianStats] = useState < TechnicianPerformanceStats[] > ([]);

  useEffect(() => { loadData(); }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const days = parseInt(timeRange);
      const [executionStats, templates, technicians, recentExecutions] = await Promise.all([
        analyticsService.getExecutionStats(days),
        analyticsService.getTemplateUsageStats(days),
        analyticsService.getTechnicianPerformanceStats(days),
        loadRecentExecutions(days),
      ]);
      setStats(executionStats);
      setTemplateStats(templates);
      setTechnicianStats(technicians);
      setExecutions(recentExecutions);
    } catch (error) { console.error("Error loading analytics data:", error); }
    finally { setLoading(false); }
  };

  const loadRecentExecutions = async (days: number): Promise<ChecklistExecution[]> => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    const { data, error } = await supabase
      .from("checklist_executions")
      .select(`*, checklists (name), equipment (name, equipment_code), profiles (full_name)`)
      .gte("started_at", daysAgo.toISOString())
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) { console.error("Error loading executions:", error); return []; }
    return (data as unknown as ChecklistExecution[]) || [];
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; color: string; badgeColor: string }> = {
      completed: { label: "Completata", color: "text-green-600 dark:text-green-400", badgeColor: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/20" },
      in_progress: { label: "In Corso", color: "text-amber-600 dark:text-amber-400", badgeColor: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20" },
      failed: { label: "Fallita", color: "text-red-600 dark:text-red-400", badgeColor: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/20" },
    };
    return config[status] || { label: status, color: "text-muted-foreground", badgeColor: "bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500/20" };
  };

  const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const exportData = () => {
    const csvContent = [
      ["Checklist", "Attrezzatura", "Esecutore", "Data", "Stato"].join(","),
      ...executions.map(e => [
        e.checklists?.name || "N/A", e.equipment?.name || "N/A", e.profiles?.full_name || "N/A",
        e.started_at ? format(new Date(e.started_at), "dd/MM/yyyy HH:mm") : "N/A",
        getStatusConfig(e.status).label,
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_checklist_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  return (
    <MainLayout>
      <SEO title="Analytics Checklist - MACHINA" />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Checklist</h1>
            <p className="text-muted-foreground mt-2">Statistiche e performance delle esecuzioni</p>
          </div>
          <Button variant="outline" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" /> Esporta CSV
          </Button>
        </div>

        {/* Time Range Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Periodo:</span>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Ultimi 7 Giorni</SelectItem>
                  <SelectItem value="30">Ultimi 30 Giorni</SelectItem>
                  <SelectItem value="90">Ultimi 90 Giorni</SelectItem>
                  <SelectItem value="365">Ultimo Anno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                  <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Esecuzioni Totali</div>
                  <div className="text-3xl font-bold text-foreground mt-1">{stats.total}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Completate</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.completed}</div>
                  <div className="text-xs text-muted-foreground mt-1">{successRate}% tasso di successo</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">In Corso</div>
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.in_progress}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Fallite</div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.failed}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Checklist più Utilizzate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
              ) : templateStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nessun dato disponibile</div>
              ) : (
                <div className="space-y-3">
                  {templateStats.slice(0, 5).map((template, index) => (
                    <div key={template.checklist_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="text-foreground font-medium">{template.checklist_name}</span>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        {template.usage_count} esecuzioni
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technician Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                Performance Tecnici
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
              ) : technicianStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nessun dato disponibile</div>
              ) : (
                <div className="space-y-3">
                  {technicianStats.slice(0, 5).map((tech) => (
                    <div key={tech.technician_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="text-foreground font-medium">{tech.technician_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {tech.completed_count}/{tech.executions_count} completate
                          {tech.avg_completion_time_minutes > 0 && (
                            <span className="ml-2">• ~{tech.avg_completion_time_minutes} min</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {tech.executions_count > 0 ? Math.round((tech.completed_count / tech.executions_count) * 100) : 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">successo</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Esecuzioni Recenti</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
            ) : executions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nessuna esecuzione trovata nel periodo selezionato</div>
            ) : (
              <div className="space-y-3">
                {executions.map((execution) => {
                  const statusCfg = getStatusConfig(execution.status);
                  return (
                    <div key={execution.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          {execution.checklists?.name || "Checklist sconosciuta"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Attrezzatura: {execution.equipment?.name || "N/A"} ({execution.equipment?.equipment_code || "N/A"})
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Eseguito da: {execution.profiles?.full_name || "Sconosciuto"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          {execution.started_at ? format(new Date(execution.started_at), "dd MMM, HH:mm", { locale: it }) : "N/A"}
                        </div>
                        <Badge className={statusCfg.badgeColor}>{statusCfg.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
