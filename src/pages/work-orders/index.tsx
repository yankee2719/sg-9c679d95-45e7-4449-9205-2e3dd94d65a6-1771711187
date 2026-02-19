import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { getPermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Plus, Search, Calendar, Filter, ChevronRight, Wrench, Clock,
    AlertCircle, CheckCircle2, XCircle, ClipboardList, Pause, FileText,
    Play, User, Timer, TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// =============================================================================
// TYPES
// =============================================================================

interface WorkOrder {
    id: string;
    wo_number: string | null;
    title: string;
    description: string | null;
    wo_type: string | null;
    work_type: string | null;
    status: string;
    priority: string;
    scheduled_date: string | null;
    scheduled_start: string | null;
    due_date: string | null;
    started_at: string | null;
    completed_at: string | null;
    machine_id: string | null;
    machine_name?: string;
    assigned_to: string | null;
    assignee_name?: string;
    maintenance_plan_id: string | null;
    created_at: string;
}

// =============================================================================
// CONFIG
// =============================================================================

const statusConfig: Record<string, { label: string; color: string; icon: any; order: number }> = {
    in_progress: { label: "In Corso", color: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30", icon: AlertCircle, order: 0 },
    assigned: { label: "Assegnato", color: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30", icon: User, order: 1 },
    scheduled: { label: "Programmato", color: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/30", icon: Calendar, order: 2 },
    draft: { label: "Bozza", color: "bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500/30", icon: FileText, order: 3 },
    paused: { label: "In Pausa", color: "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30", icon: Pause, order: 4 },
    completed: { label: "Completato", color: "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/30", icon: CheckCircle2, order: 5 },
    approved: { label: "Approvato", color: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30", icon: CheckCircle2, order: 6 },
    cancelled: { label: "Annullato", color: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/30", icon: XCircle, order: 7 },
};

const priorityConfig: Record<string, { label: string; color: string; border: string; order: number }> = {
    critical: { label: "Critica", color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300", border: "border-l-red-600", order: 0 },
    high: { label: "Alta", color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300", border: "border-l-red-500", order: 1 },
    medium: { label: "Media", color: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300", border: "border-l-amber-500", order: 2 },
    low: { label: "Bassa", color: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300", border: "border-l-green-500", order: 3 },
};

const typeLabels: Record<string, string> = {
    preventive: "Preventiva", corrective: "Correttiva", predictive: "Predittiva",
    inspection: "Ispezione", emergency: "Emergenza",
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function WorkOrdersPage() {
    const router = useRouter();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [userId, setUserId] = useState < string | null > (null);
    const [workOrders, setWorkOrders] = useState < WorkOrder[] > ([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("active"); // "active" = non chiusi
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [assigneeFilter, setAssigneeFilter] = useState("all"); // "all" | "mine" | "unassigned"

    const perms = getPermissions({ role: userRole, orgType: null });
    const isAdmin = perms.isAdminOrSupervisor;

    // =========================================================================
    // LOAD
    // =========================================================================

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                setUserRole(ctx.role);
                setUserId(ctx.userId);

                const { data } = await supabase
                    .from("work_orders")
                    .select("*, machines(name), profiles:assigned_to(display_name, first_name, last_name)")
                    .order("created_at", { ascending: false });

                if (data) {
                    setWorkOrders(data.map((wo: any) => ({
                        ...wo,
                        machine_name: wo.machines?.name || null,
                        assignee_name: wo.profiles?.display_name || [wo.profiles?.first_name, wo.profiles?.last_name].filter(Boolean).join(" ") || null,
                    })));
                }
            } catch (err) {
                console.error("Error:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    // =========================================================================
    // FILTER + SORT
    // =========================================================================

    const filtered = useMemo(() => {
        let f = workOrders;

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            f = f.filter(wo =>
                wo.title.toLowerCase().includes(q) ||
                wo.wo_number?.toLowerCase().includes(q) ||
                wo.machine_name?.toLowerCase().includes(q) ||
                wo.assignee_name?.toLowerCase().includes(q) ||
                wo.description?.toLowerCase().includes(q)
            );
        }

        // Status
        if (statusFilter === "active") {
            f = f.filter(wo => !["completed", "approved", "cancelled"].includes(wo.status));
        } else if (statusFilter !== "all") {
            f = f.filter(wo => wo.status === statusFilter);
        }

        // Priority
        if (priorityFilter !== "all") {
            f = f.filter(wo => wo.priority === priorityFilter);
        }

        // Type
        if (typeFilter !== "all") {
            f = f.filter(wo => (wo.wo_type || wo.work_type) === typeFilter);
        }

        // Assignee
        if (assigneeFilter === "mine") {
            f = f.filter(wo => wo.assigned_to === userId);
        } else if (assigneeFilter === "unassigned") {
            f = f.filter(wo => !wo.assigned_to);
        }

        // Sort: priority order first, then status order
        f.sort((a, b) => {
            const pa = priorityConfig[a.priority]?.order ?? 9;
            const pb = priorityConfig[b.priority]?.order ?? 9;
            if (pa !== pb) return pa - pb;
            const sa = statusConfig[a.status]?.order ?? 9;
            const sb = statusConfig[b.status]?.order ?? 9;
            return sa - sb;
        });

        return f;
    }, [workOrders, searchQuery, statusFilter, priorityFilter, typeFilter, assigneeFilter, userId]);

    // =========================================================================
    // KPIs
    // =========================================================================

    const kpis = useMemo(() => {
        const active = workOrders.filter(wo => !["completed", "approved", "cancelled"].includes(wo.status));
        const overdue = active.filter(wo => {
            const due = wo.due_date || wo.scheduled_start || wo.scheduled_date;
            return due && new Date(due) < new Date();
        });
        const completedThisMonth = workOrders.filter(wo => {
            if (!wo.completed_at) return false;
            const d = new Date(wo.completed_at);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const avgDays = (() => {
            const completed = workOrders.filter(wo => wo.started_at && wo.completed_at);
            if (completed.length === 0) return null;
            const totalMs = completed.reduce((sum, wo) => {
                return sum + (new Date(wo.completed_at!).getTime() - new Date(wo.started_at!).getTime());
            }, 0);
            return Math.round(totalMs / completed.length / (1000 * 60 * 60 * 24) * 10) / 10;
        })();

        return { active: active.length, overdue: overdue.length, completedThisMonth: completedThisMonth.length, avgDays };
    }, [workOrders]);

    // =========================================================================
    // RENDER
    // =========================================================================

    if (loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title="Ordini di Lavoro - MACHINA" />
            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Ordini di Lavoro</h1>
                        <p className="text-muted-foreground mt-1">Gestione trasversale di tutti gli ordini di lavoro</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: "Attivi", value: kpis.active, icon: Play, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10", onClick: () => setStatusFilter("active") },
                        { label: "Scaduti", value: kpis.overdue, icon: AlertCircle, color: kpis.overdue > 0 ? "text-red-600" : "text-gray-400", bg: kpis.overdue > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-gray-50 dark:bg-gray-500/10", onClick: () => { } },
                        { label: "Chiusi questo mese", value: kpis.completedThisMonth, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-500/10", onClick: () => setStatusFilter("completed") },
                        { label: "Tempo medio (gg)", value: kpis.avgDays !== null ? kpis.avgDays : "—", icon: Timer, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-500/10", onClick: () => { } },
                    ].map((kpi) => (
                        <Card key={kpi.label} className="rounded-2xl border-0 bg-card shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={kpi.onClick}>
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
                                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                                </div>
                                <div>
                                    <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filters */}
                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="Cerca per titolo, numero, macchina, tecnico..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-background border-border rounded-xl" />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[170px] bg-background border-border rounded-xl">
                                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">🔵 Attivi</SelectItem>
                                    <SelectItem value="all">Tutti</SelectItem>
                                    <SelectItem value="draft">Bozza</SelectItem>
                                    <SelectItem value="scheduled">Programmato</SelectItem>
                                    <SelectItem value="assigned">Assegnato</SelectItem>
                                    <SelectItem value="in_progress">In Corso</SelectItem>
                                    <SelectItem value="paused">In Pausa</SelectItem>
                                    <SelectItem value="completed">Completato</SelectItem>
                                    <SelectItem value="approved">Approvato</SelectItem>
                                    <SelectItem value="cancelled">Annullato</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="w-[150px] bg-background border-border rounded-xl">
                                    <SelectValue placeholder="Priorità" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutte</SelectItem>
                                    <SelectItem value="critical">🔴 Critica</SelectItem>
                                    <SelectItem value="high">🟠 Alta</SelectItem>
                                    <SelectItem value="medium">🟡 Media</SelectItem>
                                    <SelectItem value="low">🟢 Bassa</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[160px] bg-background border-border rounded-xl">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutti i tipi</SelectItem>
                                    <SelectItem value="preventive">Preventiva</SelectItem>
                                    <SelectItem value="corrective">Correttiva</SelectItem>
                                    <SelectItem value="predictive">Predittiva</SelectItem>
                                    <SelectItem value="inspection">Ispezione</SelectItem>
                                    <SelectItem value="emergency">Emergenza</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                                <SelectTrigger className="w-[160px] bg-background border-border rounded-xl">
                                    <User className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutti</SelectItem>
                                    <SelectItem value="mine">I miei</SelectItem>
                                    <SelectItem value="unassigned">Non assegnati</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Results count */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{filtered.length} ordini di lavoro</p>
                    {(statusFilter !== "active" || priorityFilter !== "all" || typeFilter !== "all" || assigneeFilter !== "all" || searchQuery) && (
                        <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("active"); setPriorityFilter("all"); setTypeFilter("all"); setAssigneeFilter("all"); setSearchQuery(""); }}>
                            Rimuovi filtri
                        </Button>
                    )}
                </div>

                {/* WO List */}
                <div className="space-y-3">
                    {filtered.map(wo => {
                        const status = statusConfig[wo.status] || statusConfig.draft;
                        const prio = priorityConfig[wo.priority] || priorityConfig.medium;
                        const StatusIcon = status.icon;
                        const woType = typeLabels[wo.wo_type || wo.work_type || ""] || wo.wo_type || wo.work_type || "";
                        const dueDate = wo.due_date || wo.scheduled_start || wo.scheduled_date;
                        const isOverdue = dueDate && new Date(dueDate) < new Date() && !["completed", "approved", "cancelled"].includes(wo.status);

                        return (
                            <Card key={wo.id}
                                className={`rounded-2xl border-0 border-l-4 ${prio.border} bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                                onClick={() => router.push(`/work-orders/${wo.id}`)}>
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-50 dark:bg-red-500/10" : "bg-blue-50 dark:bg-blue-500/10"}`}>
                                            <StatusIcon className={`w-5 h-5 ${isOverdue ? "text-red-500" : "text-blue-500 dark:text-blue-400"}`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-foreground font-bold truncate">{wo.title}</h3>
                                                {wo.wo_number && (
                                                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{wo.wo_number}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                                                {wo.machine_name && (
                                                    <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{wo.machine_name}</span>
                                                )}
                                                {woType && (
                                                    <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" />{woType}</span>
                                                )}
                                                {dueDate && (
                                                    <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(dueDate).toLocaleDateString("it-IT")}
                                                        {isOverdue && " ⚠"}
                                                    </span>
                                                )}
                                                {wo.assignee_name && (
                                                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{wo.assignee_name}</span>
                                                )}
                                                {!wo.assigned_to && (
                                                    <span className="text-xs text-orange-500 font-medium">Non assegnato</span>
                                                )}
                                                {wo.maintenance_plan_id && (
                                                    <span className="text-xs text-blue-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Da piano</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${status.color}`}>{status.label}</Badge>
                                        <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${prio.color}`}>{prio.label}</Badge>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Empty */}
                {filtered.length === 0 && (
                    <Card className="rounded-2xl border-0 bg-card shadow-sm p-12 text-center">
                        <Wrench className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Nessun ordine di lavoro</h3>
                        <p className="text-muted-foreground mb-6">
                            {workOrders.length === 0
                                ? "Genera ordini di lavoro dai piani di manutenzione"
                                : "Nessun risultato per i filtri selezionati"
                            }
                        </p>
                        {workOrders.length === 0 && (
                            <Button variant="outline" onClick={() => router.push("/maintenance")}>
                                <Calendar className="w-4 h-4 mr-2" /> Vai ai Piani
                            </Button>
                        )}
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}

