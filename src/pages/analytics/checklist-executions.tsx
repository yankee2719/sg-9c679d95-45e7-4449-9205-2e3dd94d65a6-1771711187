import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  FileText,
  ClipboardCheck,
  CheckCircle,
} from "lucide-react";
import { analyticsService } from "@/services/analyticsService";
import { exportAnalyticsToCSV, exportAnalyticsToPDF } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import type {
  ChecklistExecutionStats,
  TemplateUsageStats,
  TechnicianPerformanceStats,
  TaskIssueStats,
  DailyExecutionTrend,
  StatusDistribution,
} from "@/services/analyticsService";

const COLORS = {
  completed: "#10b981",
  inProgress: "#f59e0b",
  cancelled: "#ef4444",
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
};

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

export default function ChecklistExecutionsAnalytics() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("month");

  // Helper to convert timeRange to days
  const getPeriodDays = (range: string) => {
    switch (range) {
      case "week": return 7;
      case "month": return 30;
      case "quarter": return 90;
      case "year": return 365;
      default: return 30;
    }
  };

  // Stats data
  const [stats, setStats] = useState<ChecklistExecutionStats | null>(null);
  const [templateStats, setTemplateStats] = useState<TemplateUsageStats[]>([]);
  const [technicianStats, setTechnicianStats] = useState<TechnicianPerformanceStats[]>([]);
  const [taskIssueStats, setTaskIssueStats] = useState<TaskIssueStats[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyExecutionTrend[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);

  // Get user role (mock - replace with actual auth)
  const userRole: "admin" | "supervisor" | "technician" = "admin"; // Replace with actual role from auth context

  useEffect(() => {
    // Redirect technicians
    if ((userRole as string) === "technician") {
      router.push("/dashboard");
      return;
    }

    loadAnalytics();
  }, [userRole, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    const period = getPeriodDays(timeRange);
    
    try {
      const [
        statsData,
        templateData,
        techData,
        taskIssueData,
        trendData,
        distributionData,
      ] = await Promise.all([
        analyticsService.getExecutionStats(period),
        analyticsService.getTemplateUsageStats(period),
        analyticsService.getTechnicianPerformanceStats(period),
        analyticsService.getTaskIssueStats(period),
        analyticsService.getDailyExecutionTrend(period),
        analyticsService.getStatusDistribution(period),
      ]);

      setStats(statsData);
      setTemplateStats(templateData);
      setTechnicianStats(techData);
      setTaskIssueStats(taskIssueData);
      setDailyTrend(trendData);
      setStatusDistribution(distributionData);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleExportCSV = () => {
    if (!stats) {
      toast({
        title: "Nessun dato da esportare",
        description: "Carica i dati prima di esportare",
        variant: "destructive",
      });
      return;
    }

    try {
      const periodLabel =
        timeRange === "week" ? "Ultimi 7 giorni" :
        timeRange === "month" ? "Ultimi 30 giorni" :
        timeRange === "quarter" ? "Ultimi 90 giorni" :
        "Ultimo anno";

      exportAnalyticsToCSV({
        stats,
        templateUsage: templateStats,
        technicianPerformance: technicianStats,
        taskIssues: taskIssueStats,
        period: periodLabel,
      });

      toast({
        title: "✅ Export CSV completato",
        description: "Il file è stato scaricato con successo",
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "❌ Errore export",
        description: "Impossibile esportare i dati in CSV",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    if (!stats) {
      toast({
        title: "Nessun dato da esportare",
        description: "Carica i dati prima di esportare",
        variant: "destructive",
      });
      return;
    }

    try {
      const periodLabel =
        timeRange === "week" ? "Ultimi 7 giorni" :
        timeRange === "month" ? "Ultimi 30 giorni" :
        timeRange === "quarter" ? "Ultimi 90 giorni" :
        "Ultimo anno";

      exportAnalyticsToPDF({
        stats,
        templateUsage: templateStats,
        technicianPerformance: technicianStats,
        taskIssues: taskIssueStats,
        period: periodLabel,
      });

      toast({
        title: "✅ Export PDF completato",
        description: "Il file è stato scaricato con successo",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "❌ Errore export",
        description: "Impossibile esportare i dati in PDF",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <MainLayout userRole={userRole as any}>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userRole={userRole as any}>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
              <p className="text-slate-400">Performance metrics and maintenance insights</p>
            </div>
            <div className="flex gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl">
                <Download className="h-5 w-5 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <ClipboardCheck className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.totalExecutions}</h3>
              <p className="text-sm text-slate-400 font-medium">Total Executions</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.completedExecutions}</h3>
              <p className="text-sm text-slate-400 font-medium">Completed</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.avgDuration}</h3>
              <p className="text-sm text-slate-400 font-medium">Avg Duration (min)</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats.completionRate}%</h3>
              <p className="text-sm text-slate-400 font-medium">Completion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Executions by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.status}: ${props.percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-white">Daily Execution Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString("it-IT")}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke={COLORS.completed}
                    strokeWidth={2}
                    name="Completate"
                    dot={{ fill: COLORS.completed }}
                  />
                  <Line
                    type="monotone"
                    dataKey="inProgress"
                    stroke={COLORS.inProgress}
                    strokeWidth={2}
                    name="In Corso"
                    dot={{ fill: COLORS.inProgress }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Template Usage Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Template Più Utilizzati</CardTitle>
            <CardDescription>Top 5 template per numero di esecuzioni</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={templateStats.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="templateName" type="category" width={150} className="text-xs" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="executionCount" fill={COLORS.primary} name="Esecuzioni" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Duration Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Tempo Medio vs Stimato</CardTitle>
            <CardDescription>Confronto durata effettiva vs durata stimata (minuti)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={templateStats.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="templateName" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <Bar dataKey="avgDuration" fill={COLORS.primary} name="Durata Media" />
                <Bar dataKey="estimatedDuration" fill={COLORS.secondary} name="Durata Stimata" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Issues Table */}
        <Card>
          <CardHeader>
            <CardTitle>Task con Più Problemi</CardTitle>
            <CardDescription>Top 10 task più segnalati</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Segnalazioni</TableHead>
                  <TableHead className="text-right">Esecuzioni</TableHead>
                  <TableHead className="text-right">Tasso Problemi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskIssueStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nessun task segnalato nel periodo selezionato
                    </TableCell>
                  </TableRow>
                ) : (
                  taskIssueStats.map((task) => (
                    <TableRow key={task.taskId}>
                      <TableCell className="font-medium">{task.taskTitle}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.templateName}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{task.issueCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{task.totalExecutions}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${task.issueRate > 20 ? "text-red-500" : "text-amber-500"}`}>
                          {task.issueRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Technician Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Tecnici</CardTitle>
            <CardDescription>Statistiche completamento per tecnico</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tecnico</TableHead>
                  <TableHead className="text-right">Completate</TableHead>
                  <TableHead className="text-right">In Corso</TableHead>
                  <TableHead className="text-right">Tempo Medio</TableHead>
                  <TableHead className="text-right">Tasso Completamento</TableHead>
                  <TableHead className="text-right">Segnalazioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {technicianStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nessun dato disponibile
                    </TableCell>
                  </TableRow>
                ) : (
                  technicianStats.map((tech) => (
                    <TableRow key={tech.technicianId}>
                      <TableCell className="font-medium">{tech.technicianName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          {tech.completedCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                          {tech.inProgressCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{tech.avgDuration} min</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`font-semibold ${tech.completionRate >= 90 ? "text-green-500" : "text-amber-500"}`}>
                            {tech.completionRate.toFixed(1)}%
                          </span>
                          {tech.completionRate >= 90 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {tech.issueCount > 0 ? (
                          <Badge variant="destructive">{tech.issueCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}