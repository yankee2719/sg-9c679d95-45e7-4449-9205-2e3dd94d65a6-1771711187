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
} from "lucide-react";
import { analyticsService } from "@/services/analyticsService";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<number>(30);

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
  }, [userRole, period]);

  const loadAnalytics = async () => {
    setLoading(true);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Esecuzioni Checklist</h1>
            <p className="text-muted-foreground mt-1">
              Monitoraggio e analisi delle performance delle checklist
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Ultimi 7 giorni</SelectItem>
                <SelectItem value="30">Ultimi 30 giorni</SelectItem>
                <SelectItem value="90">Ultimi 90 giorni</SelectItem>
                <SelectItem value="365">Ultimo anno</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="icon"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Esecuzioni</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalExecutions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ultimi {period} giorni
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedExecutions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.completionRate.toFixed(1)}% tasso completamento
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Corso</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.inProgressExecutions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalExecutions ? ((stats.inProgressExecutions / stats.totalExecutions) * 100).toFixed(1) : 0}% del totale
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Problemi</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalIssues || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalExecutions ? ((stats.totalIssues / stats.totalExecutions) * 100).toFixed(1) : 0}% con segnalazioni
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Trend Esecuzioni Giornaliere</CardTitle>
              <CardDescription>Andamento completamenti negli ultimi {period} giorni</CardDescription>
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

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuzione Stati</CardTitle>
              <CardDescription>Percentuale esecuzioni per stato</CardDescription>
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