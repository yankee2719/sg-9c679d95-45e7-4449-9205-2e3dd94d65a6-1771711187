import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Plus, Search, Calendar, Filter, ChevronRight, Trash2, Clock, Wrench,
    Play, AlertCircle, CheckCircle2, XCircle, ClipboardList, Pause, FileText
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface MaintenancePlan {
    id: string;
    title: string;
    description: string | null;
    frequency_type: string | null;
    frequency_value: number | null;
    next_due_date: string | null;
    last_executed_at: string | null;
    priority: string | null;
    is_active: boolean;
    machine_id: string | null;
    machine_name?: string;
}

interface WorkOrder {
    id: string;
    wo_number: string | null;
    title: string;
    description: string | null;
    wo_type: string;
    status: string;
    priority: string;
    scheduled_start: string | null;
    machine_id: string | null;
    machine_name?: string;
    assigned_to: string | null;
    assignee_name?: string;
    created_at: string;
    maintenance_plan_id: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

const priorityConfig: Record<string, { label: string; color: string; border: string }> = {
    critical: { label: "Critica", color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30", border: "border-l-red-600" },
    high: { label: "Alta", color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30", border: "border-l-red-500" },
    medium: { label: "Media", color: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30", border: "border-l-amber-500" },
    low: { label: "Bassa", color: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30", border: "border-l-green-500" },
};

const woStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: "Bozza", color: "bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500/30", icon: FileText },
    scheduled: { label: "Programmato", color: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/30", icon: Calendar },
    assigned: { label: "Assegnato", color: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30", icon: ClipboardList },
    in_progress: { label: "In Corso", color: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30", icon: AlertCircle },
    paused: { label: "In Pausa", color: "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30", icon: Pause },
    completed: { label: "Completato", color: "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/30", icon: CheckCircle2 },
    approved: { label: "Approvato", color: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30", icon: CheckCircle2 },
    cancelled: { label: "Annullato", color: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/30", icon: XCircle },
};

const getFrequencyLabel = (type: string | null, value: number | null) => {
    if (!type) return null;
    const labels: Record<string, string> = {
        daily: "Giornaliera", weekly: "Settimanale", biweekly: "Bisettimanale",
        monthly: "Mensile", quarterly: "Trimestrale", semiannual: "Semestrale",
        annual: "Annuale", yearly: "Annuale",
    };
    const label = labels[type] || type;
    return value && value > 1 ? `${label} (ogni ${value})` : label;
};

const getWoTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
        preventive: "Preventiva", corrective: "Correttiva", predictive: "Predittiva",
        inspection: "Ispezione", emergency: "Emergenza",
    };
    return labels[type] || type;
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function MaintenancePage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();

    // State
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [activeTab, setActiveTab] = useState("plans");

    // Plans state
    const [plans, setPlans] = useState < MaintenancePlan[] > ([]);
    const [filteredPlans, setFilteredPlans] = useState < MaintenancePlan[] > ([]);
    const [planSearch, setPlanSearch] = useState("");
    const [planPriorityFilter, setPlanPriorityFilter] = useState("all");
    const [deletingPlan, setDeletingPlan] = useState < string | null > (null);

    // Work Orders state
    const [workOrders, setWorkOrders] = useState < WorkOrder[] > ([]);
    const [filteredWOs, setFilteredWOs] = useState < WorkOrder[] > ([]);
    const [woSearch, setWoSearch] = useState("");
    const [woStatusFilter, setWoStatusFilter] = useState("all");
    const [woPriorityFilter, setWoPriorityFilter] = useState("all");
    const [loadingWOs, setLoadingWOs] = useState(false);

    // Generate WO dialog
    const [showGenerateWO, setShowGenerateWO] = useState(false);
    const [selectedPlanForWO, setSelectedPlanForWO] = useState < MaintenancePlan | null > (null);
    const [generatingWO, setGeneratingWO] = useState(false);

    // Counts for tab badges
    const overdueCount = plans.filter(p => p.is_active && p.next_due_date && new Date(p.next_due_date) < new Date()).length;
    const activeWOCount = workOrders.filter(wo => ["assigned", "in_progress", "scheduled"].includes(wo.status)).length;

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    // =========================================================================
    // LOAD DATA
    // =========================================================================

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                setUserRole(ctx.role);

                // Load plans
                const { data: planData } = await supabase
                    .from("maintenance_plans")
                    .select("*, machines(name)")
                    .order("next_due_date", { ascending: true, nullsFirst: false });

                if (planData) {
                    const mapped = planData.map((p: any) => ({
                        ...p,
                        machine_name: p.machines?.name || null,
                    }));
                    setPlans(mapped);
                    setFilteredPlans(mapped);
                }

                // Load work orders
                await loadWorkOrders();
            } catch (err) {
                console.error("Error:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    const loadWorkOrders = async () => {
        setLoadingWOs(true);
        try {
            const { data: woData } = await supabase
                .from("work_orders")
                .select("*, machines(name), profiles:assigned_to(display_name, first_name, last_name)")
                .order("created_at", { ascending: false });

            if (woData) {
                const mapped = woData.map((wo: any) => ({
                    ...wo,
                    machine_name: wo.machines?.name || null,
                    assignee_name: wo.profiles?.display_name || [wo.profiles?.first_name, wo.profiles?.last_name].filter(Boolean).join(" ") || null,
                }));
                setWorkOrders(mapped);
                setFilteredWOs(mapped);
            }
        } catch (err) {
            console.error("Error loading work orders:", err);
        } finally {
            setLoadingWOs(false);
        }
    };

    // =========================================================================
    // FILTER PLANS
    // =========================================================================

    useEffect(() => {
        let f = plans;
        if (planSearch) {
            const q = planSearch.toLowerCase();
            f = f.filter(p => p.title.toLowerCase().includes(q) || p.machine_name?.toLowerCase().includes(q));
        }
        if (planPriorityFilter !== "all") {
            f = f.filter(p => p.priority === planPriorityFilter);
        }
        setFilteredPlans(f);
    }, [planSearch, planPriorityFilter, plans]);

    // =========================================================================
    // FILTER WORK ORDERS
    // =========================================================================

    useEffect(() => {
        let f = workOrders;
        if (woSearch) {
            const q = woSearch.toLowerCase();
            f = f.filter(wo =>
                wo.title.toLowerCase().includes(q) ||
                wo.wo_number?.toLowerCase().includes(q) ||
                wo.machine_name?.toLowerCase().includes(q)
            );
        }
        if (woStatusFilter !== "all") {
            f = f.filter(wo => wo.status === woStatusFilter);
        }
        if (woPriorityFilter !== "all") {
            f = f.filter(wo => wo.priority === woPriorityFilter);
        }
        setFilteredWOs(f);
    }, [woSearch, woStatusFilter, woPriorityFilter, workOrders]);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const handleDeletePlan = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm(t("maintenance.confirmDelete"))) return;
        setDeletingPlan(id);
        try {
            const { error } = await supabase.from("maintenance_plans").delete().eq("id", id);
            if (error) throw error;
            setPlans(prev => prev.filter(p => p.id !== id));
            toast({ title: t("maintenance.deleteSuccess") });
        } catch (err: any) {
            toast({ title: t("maintenance.deleteError"), description: err?.message, variant: "destructive" });
        } finally {
            setDeletingPlan(null);
        }
    };

    const handleGenerateWO = (e: React.MouseEvent, plan: MaintenancePlan) => {
        e.stopPropagation();
        setSelectedPlanForWO(plan);
        setShowGenerateWO(true);
    };

    const confirmGenerateWO = async () => {
        if (!selectedPlanForWO) return;
        setGeneratingWO(true);
        try {
            const { data, error } = await supabase
                .from("work_orders")
                .insert({
                    organization_id: (await getUserContext())?.organizationId,
                    machine_id: selectedPlanForWO.machine_id,
                    maintenance_plan_id: selectedPlanForWO.id,
                    title: `${selectedPlanForWO.title}`,
                    description: selectedPlanForWO.description || `Ordine di lavoro generato dal piano: ${selectedPlanForWO.title}`,
                    work_type: "preventive",
                    priority: selectedPlanForWO.priority || "medium",
                    status: "scheduled",
                    scheduled_date: selectedPlanForWO.next_due_date || new Date().toISOString(),
                    created_by: (await supabase.auth.getUser()).data.user?.id,
                })
                .select()
                .single();

            if (error) throw error;

            toast({ title: "Ordine di lavoro creato", description: `WO generato dal piano "${selectedPlanForWO.title}"` });
            setShowGenerateWO(false);
            setSelectedPlanForWO(null);
            await loadWorkOrders();
            setActiveTab("work-orders");
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally {
            setGeneratingWO(false);
        }
    };

    if (loading) return null;

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title={`${t("maintenance.title")} - MACHINA`} />
            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("maintenance.title")}</h1>
                        <p className="text-muted-foreground mt-1">{t("maintenance.subtitle")}</p>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.push("/maintenance/new")}>
                                <Calendar className="w-4 h-4 mr-2" /> Nuovo Piano
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="plans" className="gap-2">
                            <Calendar className="w-4 h-4" />
                            Piani
                            {overdueCount > 0 && (
                                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-red-500 text-white text-xs">{overdueCount}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="work-orders" className="gap-2">
                            <Wrench className="w-4 h-4" />
                            Ordini di Lavoro
                            {activeWOCount > 0 && (
                                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs">{activeWOCount}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ============================================================ */}
                    {/* TAB: MAINTENANCE PLANS                                       */}
                    {/* ============================================================ */}
                    <TabsContent value="plans" className="space-y-4 mt-4">
                        {/* Filters */}
                        <Card className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input placeholder={t("common.search")} value={planSearch} onChange={(e) => setPlanSearch(e.target.value)}
                                            className="pl-10 bg-background border-border rounded-xl" />
                                    </div>
                                    <Select value={planPriorityFilter} onValueChange={setPlanPriorityFilter}>
                                        <SelectTrigger className="w-[160px] bg-background border-border rounded-xl">
                                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder={t("common.priority")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t("common.all")}</SelectItem>
                                            <SelectItem value="high">{t("common.high")}</SelectItem>
                                            <SelectItem value="medium">{t("common.medium")}</SelectItem>
                                            <SelectItem value="low">{t("common.low")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Plan List */}
                        <div className="space-y-3">
                            {filteredPlans.map(plan => {
                                const prio = priorityConfig[plan.priority || "medium"] || priorityConfig.medium;
                                const freq = getFrequencyLabel(plan.frequency_type, plan.frequency_value);
                                const isOverdue = plan.next_due_date && new Date(plan.next_due_date) < new Date();
                                return (
                                    <Card key={plan.id}
                                        className={`rounded-2xl border-0 border-l-4 ${prio.border} bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                                        onClick={() => router.push(`/maintenance/${plan.id}`)}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-50 dark:bg-red-500/10" : "bg-orange-50 dark:bg-orange-500/10"}`}>
                                                    <Calendar className={`w-5 h-5 ${isOverdue ? "text-red-500" : "text-orange-500"}`} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-foreground font-bold truncate">{plan.title}</h3>
                                                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                                                        {plan.machine_name && (
                                                            <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{plan.machine_name}</span>
                                                        )}
                                                        {plan.next_due_date && (
                                                            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(plan.next_due_date).toLocaleDateString("it-IT")}
                                                            </span>
                                                        )}
                                                        {freq && (
                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{freq}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${prio.color}`}>{prio.label}</Badge>
                                                {isOverdue && (
                                                    <Badge className="rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30">Scaduto</Badge>
                                                )}
                                                {isAdmin && plan.is_active && (
                                                    <button onClick={(e) => handleGenerateWO(e, plan)} title="Genera Ordine di Lavoro"
                                                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button onClick={(e) => handleDeletePlan(e, plan.id)} disabled={deletingPlan === plan.id}
                                                        className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                )}
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {filteredPlans.length === 0 && (
                            <Card className="rounded-2xl border-0 bg-card shadow-sm p-12 text-center">
                                <Calendar className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-foreground mb-2">Nessun piano di manutenzione</h3>
                                <p className="text-muted-foreground mb-6">Crea il primo piano di manutenzione programmata</p>
                                {isAdmin && (
                                    <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push("/maintenance/new")}>
                                        <Plus className="w-4 h-4 mr-2" /> Nuovo Piano
                                    </Button>
                                )}
                            </Card>
                        )}
                    </TabsContent>

                    {/* ============================================================ */}
                    {/* TAB: WORK ORDERS                                             */}
                    {/* ============================================================ */}
                    <TabsContent value="work-orders" className="space-y-4 mt-4">
                        {/* Filters */}
                        <Card className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input placeholder="Cerca per titolo, numero WO, macchina..." value={woSearch} onChange={(e) => setWoSearch(e.target.value)}
                                            className="pl-10 bg-background border-border rounded-xl" />
                                    </div>
                                    <Select value={woStatusFilter} onValueChange={setWoStatusFilter}>
                                        <SelectTrigger className="w-[180px] bg-background border-border rounded-xl">
                                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tutti gli stati</SelectItem>
                                            <SelectItem value="draft">Bozza</SelectItem>
                                            <SelectItem value="scheduled">Programmato</SelectItem>
                                            <SelectItem value="assigned">Assegnato</SelectItem>
                                            <SelectItem value="in_progress">In Corso</SelectItem>
                                            <SelectItem value="paused">In Pausa</SelectItem>
                                            <SelectItem value="completed">Completato</SelectItem>
                                            <SelectItem value="cancelled">Annullato</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={woPriorityFilter} onValueChange={setWoPriorityFilter}>
                                        <SelectTrigger className="w-[160px] bg-background border-border rounded-xl">
                                            <SelectValue placeholder="PrioritÃ " />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tutte</SelectItem>
                                            <SelectItem value="critical">Critica</SelectItem>
                                            <SelectItem value="high">Alta</SelectItem>
                                            <SelectItem value="medium">Media</SelectItem>
                                            <SelectItem value="low">Bassa</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* WO Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: "In Corso", count: workOrders.filter(wo => wo.status === "in_progress").length, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
                                { label: "Programmati", count: workOrders.filter(wo => ["scheduled", "assigned"].includes(wo.status)).length, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
                                { label: "Completati", count: workOrders.filter(wo => ["completed", "approved"].includes(wo.status)).length, color: "text-green-600", bg: "bg-green-50 dark:bg-green-500/10" },
                                { label: "Totale", count: workOrders.length, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-500/10" },
                            ].map((stat) => (
                                <Card key={stat.label} className="rounded-2xl border-0 bg-card shadow-sm">
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                                            <span className={`text-lg font-bold ${stat.color}`}>{stat.count}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* WO List */}
                        <div className="space-y-3">
                            {filteredWOs.map(wo => {
                                const status = woStatusConfig[wo.status] || woStatusConfig.draft;
                                const prio = priorityConfig[wo.priority] || priorityConfig.medium;
                                const StatusIcon = status.icon;
                                return (
                                    <Card key={wo.id}
                                        className={`rounded-2xl border-0 border-l-4 ${prio.border} bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                                        onClick={() => router.push(`/work-orders/${wo.id}`)}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-500/10`}>
                                                    <StatusIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-foreground font-bold truncate">{wo.title}</h3>
                                                        {wo.wo_number && (
                                                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{wo.wo_number}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                                                        {wo.machine_name && (
                                                            <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{wo.machine_name}</span>
                                                        )}
                                                        <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" />{getWoTypeLabel(wo.wo_type)}</span>
                                                        {wo.scheduled_start && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(wo.scheduled_start).toLocaleDateString("it-IT")}
                                                            </span>
                                                        )}
                                                        {wo.assignee_name && (
                                                            <span className="text-xs">â†’ {wo.assignee_name}</span>
                                                        )}
                                                        {wo.maintenance_plan_id && (
                                                            <span className="text-xs text-blue-500 flex items-center gap-1"><Calendar className="w-3 h-3" />Da piano</span>
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

                        {filteredWOs.length === 0 && (
                            <Card className="rounded-2xl border-0 bg-card shadow-sm p-12 text-center">
                                <Wrench className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-foreground mb-2">Nessun ordine di lavoro</h3>
                                <p className="text-muted-foreground mb-6">
                                    {workOrders.length === 0
                                        ? "Genera il primo ordine di lavoro da un piano di manutenzione"
                                        : "Nessun risultato per i filtri selezionati"
                                    }
                                </p>
                                {workOrders.length === 0 && plans.length > 0 && (
                                    <Button variant="outline" onClick={() => setActiveTab("plans")}>
                                        <Calendar className="w-4 h-4 mr-2" /> Vai ai Piani
                                    </Button>
                                )}
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Generate WO Dialog */}
            <Dialog open={showGenerateWO} onOpenChange={setShowGenerateWO}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Genera Ordine di Lavoro</DialogTitle>
                    </DialogHeader>
                    {selectedPlanForWO && (
                        <div className="space-y-4">
                            <p className="text-muted-foreground">
                                Vuoi creare un ordine di lavoro dal piano:
                            </p>
                            <Card className="bg-muted/50">
                                <CardContent className="p-4 space-y-2">
                                    <p className="font-bold text-foreground">{selectedPlanForWO.title}</p>
                                    {selectedPlanForWO.machine_name && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Wrench className="w-3 h-3" /> {selectedPlanForWO.machine_name}
                                        </p>
                                    )}
                                    {selectedPlanForWO.next_due_date && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Scadenza: {new Date(selectedPlanForWO.next_due_date).toLocaleDateString("it-IT")}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setShowGenerateWO(false)}>Annulla</Button>
                                <Button onClick={confirmGenerateWO} disabled={generatingWO} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                    {generatingWO ? "Creazione..." : "Genera WO"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}