import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getPermissions } from "@/hooks/usePermissions";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft, Wrench, Calendar, Clock, User, Play, Pause, CheckCircle2,
    XCircle, FileText, ClipboardList, AlertCircle, ChevronRight, Loader2
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { notificationService } from "@/services/notificationService";

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
    scheduled_end: string | null;
    due_date: string | null;
    started_at: string | null;
    completed_at: string | null;
    machine_id: string | null;
    plant_id: string | null;
    maintenance_plan_id: string | null;
    organization_id: string | null;
    assigned_to: string | null;
    created_by: string | null;
    work_performed: string | null;
    findings: string | null;
    notes: string | null;
    created_at: string;
}

interface ChecklistExecution {
    id: string;
    checklist_name: string;
    status: string;
    executed_by: string | null;
    executor_name: string | null;
    started_at: string | null;
    completed_at: string | null;
    assignment_id?: string | null;
    checklist_id?: string | null;
}

interface PlanChecklistTemplate {
    template_id: string;
    execution_order: number;
    is_required: boolean;
    name: string;
    description: string | null;
    version: number;
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: "Bozza", color: "bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500/30", icon: FileText },
    scheduled: { label: "Programmato", color: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/30", icon: Calendar },
    assigned: { label: "Assegnato", color: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30", icon: User },
    in_progress: { label: "In Corso", color: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30", icon: AlertCircle },
    paused: { label: "In Pausa", color: "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-500/30", icon: Pause },
    completed: { label: "Completato", color: "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/30", icon: CheckCircle2 },
    approved: { label: "Approvato", color: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30", icon: CheckCircle2 },
    cancelled: { label: "Annullato", color: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/30", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
    critical: { label: "Critica", color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300" },
    high: { label: "Alta", color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300" },
    medium: { label: "Media", color: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300" },
    low: { label: "Bassa", color: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300" },
};

const typeLabels: Record<string, string> = {
    preventive: "Preventiva", corrective: "Correttiva", predictive: "Predittiva",
    inspection: "Ispezione", emergency: "Emergenza",
};

// Allowed transitions
const transitions: Record<string, { label: string; to: string; icon: any; variant: string }[]> = {
    draft: [{ label: "Programma", to: "scheduled", icon: Calendar, variant: "default" }],
    scheduled: [{ label: "Avvia Lavoro", to: "in_progress", icon: Play, variant: "default" }],
    assigned: [{ label: "Avvia Lavoro", to: "in_progress", icon: Play, variant: "default" }],
    in_progress: [
        { label: "Pausa", to: "paused", icon: Pause, variant: "outline" },
        { label: "Completa", to: "completed", icon: CheckCircle2, variant: "default" },
    ],
    paused: [{ label: "Riprendi", to: "in_progress", icon: Play, variant: "default" }],
    completed: [{ label: "Approva", to: "approved", icon: CheckCircle2, variant: "default" }],
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { t } = useLanguage();
    const { toast } = useToast();

    const [wo, setWo] = useState < WorkOrder | null > (null);
    const [machineName, setMachineName] = useState < string | null > (null);
    const [assigneeName, setAssigneeName] = useState < string | null > (null);
    const [planTitle, setPlanTitle] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [userId, setUserId] = useState("");
    const [transitioning, setTransitioning] = useState(false);

    // Checklist state
    const [executions, setExecutions] = useState < ChecklistExecution[] > ([]);
    const [loadingChecklists, setLoadingChecklists] = useState(false);
    const [planTemplates, setPlanTemplates] = useState < PlanChecklistTemplate[] > ([]);
    const [generatingFromPlan, setGeneratingFromPlan] = useState(false);

    const perms = getPermissions({ role: userRole, orgType: null });
    const isAdmin = perms.isAdminOrSupervisor;
    const canEditThisWO = wo ? perms.canEditWOIfAssigned(wo.assigned_to, userId) : false;

    // =========================================================================
    // LOAD
    // =========================================================================

    useEffect(() => {
        if (id && typeof id === "string") loadAll(id);
    }, [id]);

    const loadAll = async (woId: string) => {
        try {
            const ctx = await getUserContext();
            if (!ctx) { router.push("/login"); return; }
            setUserRole(ctx.role);
            setUserId(ctx.userId);

            // Load WO
            const { data: woData, error: woError } = await supabase
                .from("work_orders")
                .select("*")
                .eq("id", woId)
                .single();

            if (woError || !woData) {
                toast({ title: "Ordine di lavoro non trovato", variant: "destructive" });
                router.push("/maintenance");
                return;
            }
            setWo(woData);

            // Load machine name
            if (woData.machine_id) {
                const { data: machine } = await supabase.from("machines").select("name").eq("id", woData.machine_id).single();
                if (machine) setMachineName(machine.name);
            }

            // Load assignee name
            if (woData.assigned_to) {
                const { data: profile } = await supabase.from("profiles").select("display_name, first_name, last_name").eq("id", woData.assigned_to).single();
                if (profile) setAssigneeName(profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null);
            }

            // Load plan title
            if (woData.maintenance_plan_id) {
                const { data: plan } = await supabase.from("maintenance_plans").select("title").eq("id", woData.maintenance_plan_id).single();
                if (plan) setPlanTitle(plan.title);
            }

            // Load checklist executions linked to this WO
            await loadExecutions(woId);

            // Load checklist templates linked to the maintenance plan (new model)
            await loadPlanTemplates(woData.maintenance_plan_id);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadExecutions = async (woId: string) => {
        const { data, error } = await supabase
            .from("checklist_executions")
            .select("id, checklist_id, assignment_id, status, overall_status, executed_by, started_at, executed_at, completed_at, profiles:executed_by(display_name, first_name, last_name)")
            .eq("work_order_id", woId)
            .order("started_at", { ascending: false });

        if (error) {
            console.error("Error loading executions:", error);
            return;
        }
        if (!data) return;

        const assignmentIds = Array.from(new Set(data.map((r: any) => r.assignment_id).filter(Boolean)));
        const checklistIds = Array.from(new Set(data.map((r: any) => r.checklist_id).filter(Boolean)));

        const assignmentNameMap = new Map < string, string> ();
        if (assignmentIds.length) {
            const { data: asg } = await supabase
                .from("checklist_assignments")
                .select("id, template_id, checklist_templates:template_id(name)")
                .in("id", assignmentIds as any);
            (asg || []).forEach((a: any) => assignmentNameMap.set(a.id, a.checklist_templates?.name || "Checklist"));
        }

        const legacyNameMap = new Map < string, string> ();
        if (checklistIds.length) {
            const { data: ch } = await supabase
                .from("checklists")
                .select("id, title")
                .in("id", checklistIds as any);
            (ch || []).forEach((c: any) => legacyNameMap.set(c.id, c.title || "Checklist"));
        }

        setExecutions(
            data.map((e: any) => {
                const nameFromAssignment = e.assignment_id ? assignmentNameMap.get(e.assignment_id) : undefined;
                const nameFromLegacy = e.checklist_id ? legacyNameMap.get(e.checklist_id) : undefined;
                return {
                    id: e.id,
                    assignment_id: e.assignment_id,
                    checklist_id: e.checklist_id,
                    checklist_name: nameFromAssignment || nameFromLegacy || "Checklist",
                    status: e.overall_status || e.status || "unknown",
                    executed_by: e.executed_by,
                    executor_name:
                        e.profiles?.display_name ||
                        [e.profiles?.first_name, e.profiles?.last_name].filter(Boolean).join(" ") ||
                        null,
                    started_at: e.started_at || e.executed_at,
                    completed_at: e.completed_at,
                };
            })
        );
    };

    const loadPlanTemplates = async (planId: string | null) => {
        setLoadingChecklists(true);
        try {
            if (!planId) {
                setPlanTemplates([]);
                return;
            }

            const { data, error } = await supabase
                .from("maintenance_plan_checklists")
                .select("template_id, execution_order, is_required, checklist_templates:template_id(id, name, description, version)")
                .eq("plan_id", planId)
                .order("execution_order", { ascending: true });

            if (error) throw error;

            setPlanTemplates(
                (data || []).map((r: any) => ({
                    template_id: r.template_id,
                    execution_order: r.execution_order,
                    is_required: r.is_required,
                    name: r.checklist_templates?.name || "Checklist",
                    description: r.checklist_templates?.description || null,
                    version: r.checklist_templates?.version ?? 1,
                }))
            );
        } catch (err) {
            console.error("Error loading plan templates:", err);
            setPlanTemplates([]);
        } finally {
            setLoadingChecklists(false);
        }
    };

    const ensureExecutionsFromPlan = async (woRow: WorkOrder) => {
        if (!woRow.maintenance_plan_id || !woRow.machine_id || !woRow.organization_id) return;

        setGeneratingFromPlan(true);
        try {
            const { data: planRows, error: planErr } = await supabase
                .from("maintenance_plan_checklists")
                .select("template_id, execution_order")
                .eq("plan_id", woRow.maintenance_plan_id)
                .order("execution_order", { ascending: true });
            if (planErr) throw planErr;
            if (!planRows || planRows.length === 0) return;

            for (const pr of planRows as any[]) {
                // Ensure assignment exists
                let assignmentId: string | null = null;
                const { data: existingAsg } = await supabase
                    .from("checklist_assignments")
                    .select("id")
                    .eq("template_id", pr.template_id)
                    .eq("machine_id", woRow.machine_id)
                    .eq("is_active", true)
                    .maybeSingle();

                if (existingAsg?.id) {
                    assignmentId = existingAsg.id;
                } else {
                    const { data: createdAsg, error: asgErr } = await supabase
                        .from("checklist_assignments")
                        .insert({
                            organization_id: woRow.organization_id,
                            template_id: pr.template_id,
                            machine_id: woRow.machine_id,
                            is_active: true,
                        } as any)
                        .select("id")
                        .single();
                    if (asgErr) throw asgErr;
                    assignmentId = createdAsg.id;
                }

                if (!assignmentId) continue;

                // Avoid duplicates
                const { data: exExisting } = await supabase
                    .from("checklist_executions")
                    .select("id")
                    .eq("work_order_id", woRow.id)
                    .eq("assignment_id", assignmentId)
                    .maybeSingle();
                if (exExisting?.id) continue;

                const { error: exErr } = await supabase
                    .from("checklist_executions")
                    .insert({
                        work_order_id: woRow.id,
                        machine_id: woRow.machine_id,
                        organization_id: woRow.organization_id,
                        assignment_id: assignmentId,
                        template_version: 1,
                        status: woRow.status === "in_progress" ? "in_progress" : "scheduled",
                        started_at: woRow.status === "in_progress" ? new Date().toISOString() : null,
                        results: {},
                    } as any);
                if (exErr) throw exErr;
            }

            await loadExecutions(woRow.id);
        } catch (err: any) {
            console.error("Error generating executions from plan:", err);
            toast({ title: "Errore", description: err?.message || "Errore generazione checklist", variant: "destructive" });
        } finally {
            setGeneratingFromPlan(false);
        }
    };

    // =========================================================================
    // STATUS TRANSITION
    // =========================================================================

    const handleTransition = async (newStatus: string) => {
        if (!wo) return;
        setTransitioning(true);
        try {
            const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
            if (newStatus === "in_progress" && !wo.started_at) {
                updates.started_at = new Date().toISOString();
            }
            if (newStatus === "completed") {
                updates.completed_at = new Date().toISOString();
            }

            const { error } = await supabase.from("work_orders").update(updates).eq("id", wo.id);
            if (error) throw error;

            setWo(prev => prev ? { ...prev, ...updates } : null);
            toast({ title: `Stato aggiornato: ${statusConfig[newStatus]?.label || newStatus}` });

            // NEW: when WO starts, generate checklist executions from the maintenance plan
            if (newStatus === "in_progress") {
                await ensureExecutionsFromPlan({ ...wo, ...updates } as any);
            }

            // Notify on completion → send to supervisors for approval
            if (newStatus === "completed" && wo) {
                try {
                    const { data: { user: me } } = await supabase.auth.getUser();
                    const { data: myProfile } = await supabase.from("profiles").select("default_organization_id").eq("id", me?.id || "").single();
                    if (myProfile?.default_organization_id) {
                        const { data: supervisorMemberships } = await supabase
                            .from("organization_memberships").select("user_id")
                            .eq("organization_id", myProfile.default_organization_id)
                            .in("role", ["admin", "supervisor"])
                            .eq("is_active", true)
                            .neq("user_id", me?.id || "");
                        const supervisors = supervisorMemberships?.map(m => ({ id: m.user_id })) || [];
                        if (supervisors.length) {
                            await notificationService.notifyWOCompleted(wo.id, wo.title, supervisors.map(s => s.id));
                        }
                    }
                } catch (e) { console.error("Notification error:", e); }
            }
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally {
            setTransitioning(false);
        }
    };

    const handleCancel = async () => {
        if (!wo || !confirm("Sei sicuro di voler annullare questo ordine di lavoro?")) return;
        await handleTransition("cancelled");
    };

    const openExecution = (executionId: string) => {
        router.push(`/checklist/execute?id=${executionId}`);
    };

    // =========================================================================
    // RENDER
    // =========================================================================

    if (loading) return <MainLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;
    if (!wo) return null;

    const status = statusConfig[wo.status] || statusConfig.draft;
    const prio = priorityConfig[wo.priority] || priorityConfig.medium;
    const StatusIcon = status.icon;
    const availableTransitions = transitions[wo.status] || [];
    const isClosed = ["completed", "approved", "cancelled"].includes(wo.status);
    const woType = typeLabels[wo.wo_type || wo.work_type || ""] || wo.wo_type || wo.work_type || "—";
    const completedExecutions = executions.filter(e => e.status === "completed").length;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title={`${wo.title} - MACHINA`} />
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/maintenance")} className="mt-1">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold text-foreground">{wo.title}</h1>
                                {wo.wo_number && <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{wo.wo_number}</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <Badge className={`rounded-full px-3 py-1 text-xs font-semibold border ${status.color}`}>
                                    <StatusIcon className="w-3 h-3 mr-1" />{status.label}
                                </Badge>
                                <Badge className={`rounded-full px-3 py-1 text-xs font-semibold border ${prio.color}`}>{prio.label}</Badge>
                                <span className="text-sm text-muted-foreground">{woType}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                {!isClosed && (
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardContent className="p-4 flex flex-wrap gap-2">
                            {availableTransitions.map(tr => (
                                <Button key={tr.to} variant={tr.variant as any} onClick={() => handleTransition(tr.to)} disabled={transitioning}>
                                    <tr.icon className="w-4 h-4 mr-2" />{tr.label}
                                </Button>
                            ))}
                            <Button variant="destructive" onClick={handleCancel} disabled={transitioning}>
                                <XCircle className="w-4 h-4 mr-2" />Annulla WO
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs: Details / Checklist */}
                <Tabs defaultValue="details">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="details" className="gap-2"><FileText className="w-4 h-4" />Dettagli</TabsTrigger>
                        <TabsTrigger value="checklist" className="gap-2">
                            <ClipboardList className="w-4 h-4" />Checklist
                            {executions.length > 0 && (
                                <Badge className="ml-1 h-5 min-w-[20px] p-0 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs">{completedExecutions}/{executions.length}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ====================================================== */}
                    {/* TAB: DETAILS                                            */}
                    {/* ====================================================== */}
                    <TabsContent value="details" className="space-y-4 mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Info */}
                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader><CardTitle className="text-base">Informazioni</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <InfoRow label="Macchina" value={machineName} icon={<Wrench className="w-4 h-4" />} />
                                    <InfoRow label="Tipo" value={woType} icon={<ClipboardList className="w-4 h-4" />} />
                                    <InfoRow label="Assegnato a" value={assigneeName} icon={<User className="w-4 h-4" />} />
                                    {planTitle && <InfoRow label="Piano origine" value={planTitle} icon={<Calendar className="w-4 h-4" />} />}
                                </CardContent>
                            </Card>

                            {/* Date */}
                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader><CardTitle className="text-base">Date</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <InfoRow label="Creato" value={wo.created_at ? new Date(wo.created_at).toLocaleString("it-IT") : null} icon={<Clock className="w-4 h-4" />} />
                                    <InfoRow label="Programmato" value={wo.scheduled_start ? new Date(wo.scheduled_start).toLocaleDateString("it-IT") : (wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString("it-IT") : null)} icon={<Calendar className="w-4 h-4" />} />
                                    {wo.started_at && <InfoRow label="Iniziato" value={new Date(wo.started_at).toLocaleString("it-IT")} icon={<Play className="w-4 h-4" />} />}
                                    {wo.completed_at && <InfoRow label="Completato" value={new Date(wo.completed_at).toLocaleString("it-IT")} icon={<CheckCircle2 className="w-4 h-4" />} />}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Description */}
                        {wo.description && (
                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader><CardTitle className="text-base">Descrizione</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{wo.description}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Work performed / findings */}
                        {(wo.work_performed || wo.findings) && (
                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader><CardTitle className="text-base">Risultati</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    {wo.work_performed && (
                                        <div>
                                            <p className="text-sm font-medium text-foreground mb-1">Lavoro eseguito</p>
                                            <p className="text-muted-foreground whitespace-pre-wrap">{wo.work_performed}</p>
                                        </div>
                                    )}
                                    {wo.findings && (
                                        <div>
                                            <p className="text-sm font-medium text-foreground mb-1">Riscontri</p>
                                            <p className="text-muted-foreground whitespace-pre-wrap">{wo.findings}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ====================================================== */}
                    {/* TAB: CHECKLIST                                          */}
                    {/* ====================================================== */}
                    <TabsContent value="checklist" className="space-y-4 mt-4">
                        {/* Plan-linked checklists (new model) */}
                        <Card className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">Checklist del piano</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {!wo.maintenance_plan_id && (
                                    <p className="text-sm text-muted-foreground">Questo ordine di lavoro non è collegato a un piano manutenzione.</p>
                                )}

                                {wo.maintenance_plan_id && loadingChecklists && (
                                    <p className="text-sm text-muted-foreground">Caricamento checklist...</p>
                                )}

                                {wo.maintenance_plan_id && !loadingChecklists && planTemplates.length === 0 && (
                                    <p className="text-sm text-muted-foreground">Nessuna checklist collegata a questo piano.</p>
                                )}

                                {planTemplates.length > 0 && (
                                    <div className="space-y-2">
                                        {planTemplates.map((tpl) => (
                                            <div key={tpl.template_id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border bg-background">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-foreground truncate">{tpl.name}</p>
                                                    {tpl.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{tpl.description}</p>}
                                                </div>
                                                <Badge variant="outline" className="rounded-full text-xs whitespace-nowrap">
                                                    {tpl.is_required ? "Obbligatoria" : "Opzionale"}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {wo.maintenance_plan_id && planTemplates.length > 0 && executions.length === 0 && !isClosed && (
                                    <div className="pt-1">
                                        <Button
                                            onClick={() => ensureExecutionsFromPlan(wo)}
                                            disabled={generatingFromPlan}
                                            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                                        >
                                            {generatingFromPlan ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                                            Genera checklist per questo WO
                                        </Button>
                                        <p className="text-xs text-muted-foreground mt-2">Consiglio: le checklist vengono generate automaticamente quando metti il WO in “In Corso”.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Execution History */}
                        {executions.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Esecuzioni ({executions.length})</h3>
                                {executions.map(exec => {
                                    const isComplete = exec.status === "completed";
                                    return (
                                        <Card key={exec.id}
                                            className="rounded-2xl border-0 bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                            onClick={() => openExecution(exec.id)}>
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? "bg-green-50 dark:bg-green-500/10" : "bg-yellow-50 dark:bg-yellow-500/10"}`}>
                                                        {isComplete
                                                            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                            : <AlertCircle className="w-5 h-5 text-yellow-500" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{exec.checklist_name}</p>
                                                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                                            {exec.executor_name && <span>Eseguita da: {exec.executor_name}</span>}
                                                            {exec.started_at && <span>{new Date(exec.started_at).toLocaleDateString("it-IT")}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${isComplete
                                                        ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-300"
                                                        : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-300"
                                                        }`}>
                                                        {isComplete ? "Completata" : "In corso"}
                                                    </Badge>
                                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {executions.length === 0 && !isClosed && (!wo.maintenance_plan_id || planTemplates.length === 0) && (
                            <Card className="rounded-2xl border-0 bg-card shadow-sm p-12 text-center">
                                <ClipboardList className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-foreground mb-2">Nessuna checklist disponibile</h3>
                                <p className="text-muted-foreground">Collega una checklist al piano manutenzione oppure crea un template dalla sezione Checklist.</p>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}

// =============================================================================
// INFO ROW COMPONENT
// =============================================================================

function InfoRow({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) {
    return (
        <div className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
            <span className="text-muted-foreground flex items-center gap-2">{icon}{label}</span>
            <span className="text-foreground font-medium">{value || "—"}</span>
        </div>
    );
}


