import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FilePenLine,
    Loader2,
    PauseCircle,
    PlayCircle,
    Wrench,
} from "lucide-react";

type FrequencyType = "hours" | "days" | "weeks" | "months" | "cycles";
type PlanPriority = "low" | "medium" | "high" | "critical" | string;
type WorkOrderStatus = "draft" | "scheduled" | "in_progress" | "pending_review" | "completed" | "cancelled" | string;

type MachineLite = {
    id: string;
    name: string | null;
    internal_code: string | null;
    plant_id: string | null;
    area: string | null;
};

type PlantLite = {
    id: string;
    name: string | null;
    type: string | null;
};

type UserLite = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
};

type MaintenancePlanDetail = {
    id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    frequency_type: FrequencyType;
    frequency_value: number;
    estimated_duration_minutes: number | null;
    required_skills: string[] | null;
    instructions: string | null;
    safety_notes: string | null;
    default_assignee_id: string | null;
    priority: PlanPriority | null;
    is_active: boolean | null;
    next_due_date: string | null;
    last_executed_at: string | null;
    updated_at: string | null;
    created_at: string | null;
    machine: MachineLite | MachineLite[] | null;
};

type WorkOrderRow = {
    id: string;
    title: string;
    status: WorkOrderStatus | null;
    priority: string | null;
    work_type: string | null;
    scheduled_date: string | null;
    due_date: string | null;
    assigned_to: string | null;
    created_at: string | null;
    completed_at: string | null;
};

const priorityLabel: Record<string, string> = {
    low: "Bassa",
    medium: "Media",
    high: "Alta",
    critical: "Critica",
};

const statusLabel: Record<string, string> = {
    draft: "Bozza",
    scheduled: "Pianificato",
    in_progress: "In corso",
    pending_review: "In revisione",
    completed: "Completato",
    cancelled: "Annullato",
};

function unwrapMachine(machine: MaintenancePlanDetail["machine"]): MachineLite | null {
    if (!machine) return null;
    return Array.isArray(machine) ? machine[0] ?? null : machine;
}

function formatDate(value: string | null, withTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(date);
}

function formatFrequency(value: number, type: FrequencyType) {
    const unitMap: Record<FrequencyType, string> = {
        hours: value === 1 ? "ora" : "ore",
        days: value === 1 ? "giorno" : "giorni",
        weeks: value === 1 ? "settimana" : "settimane",
        months: value === 1 ? "mese" : "mesi",
        cycles: value === 1 ? "ciclo" : "cicli",
    };

    return `Ogni ${value} ${unitMap[type] ?? type}`;
}

function getPriorityBadge(priority: string | null | undefined) {
    const normalized = String(priority ?? "medium").toLowerCase();
    const cls = {
        low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        medium: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        high: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
        critical: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    }[normalized] || "border-border bg-muted/30 text-foreground";

    return <Badge className={cls}>{priorityLabel[normalized] ?? normalized}</Badge>;
}

function getStatusBadge(status: string | null | undefined) {
    const normalized = String(status ?? "draft").toLowerCase();
    const cls = {
        draft: "border-border bg-muted/30 text-foreground",
        scheduled: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        in_progress: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
        pending_review: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        cancelled: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    }[normalized] || "border-border bg-muted/30 text-foreground";

    return <Badge className={cls}>{statusLabel[normalized] ?? normalized}</Badge>;
}

export default function MaintenancePlanDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { organization, membership, user, loading: authLoading } = useAuth();
    const { plantLabel, isManufacturer, canManageMaintenance } = useOrgType();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [plan, setPlan] = useState<MaintenancePlanDetail | null>(null);
    const [plant, setPlant] = useState<PlantLite | null>(null);
    const [assignee, setAssignee] = useState<UserLite | null>(null);
    const [orders, setOrders] = useState<WorkOrderRow[]>([]);
    const [orderUsers, setOrderUsers] = useState<Map<string, UserLite>>(new Map());

    const machine = useMemo(() => unwrapMachine(plan?.machine ?? null), [plan?.machine]);

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id || typeof id !== "string") {
            if (!authLoading) setLoading(false);
            return;
        }

        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const { data: planRow, error: planError } = await supabase
                    .from("maintenance_plans")
                    .select(`
                        id,
                        machine_id,
                        title,
                        description,
                        frequency_type,
                        frequency_value,
                        estimated_duration_minutes,
                        required_skills,
                        instructions,
                        safety_notes,
                        default_assignee_id,
                        priority,
                        is_active,
                        next_due_date,
                        last_executed_at,
                        updated_at,
                        created_at,
                        machine:machines(id, name, internal_code, plant_id, area)
                    `)
                    .eq("organization_id", organization.id)
                    .eq("id", id)
                    .single();

                if (planError) throw planError;

                const detail = planRow as unknown as MaintenancePlanDetail;
                const resolvedMachine = unwrapMachine(detail.machine);

                const [{ data: workOrderRows, error: workOrdersError }, plantResult] = await Promise.all([
                    supabase
                        .from("work_orders")
                        .select("id, title, status, priority, work_type, scheduled_date, due_date, assigned_to, created_at, completed_at")
                        .eq("organization_id", organization.id)
                        .eq("maintenance_plan_id", id)
                        .order("created_at", { ascending: false }),
                    resolvedMachine?.plant_id
                        ? supabase.from("plants").select("id, name, type:plant_type").eq("id", resolvedMachine.plant_id).maybeSingle()
                        : Promise.resolve({ data: null, error: null }),
                ]);

                if (workOrdersError) throw workOrdersError;
                if ((plantResult as any)?.error) throw (plantResult as any).error;

                const userIds = Array.from(
                    new Set([
                        detail.default_assignee_id,
                        ...((workOrderRows ?? []) as WorkOrderRow[]).map((row) => row.assigned_to),
                    ].filter(Boolean))
                ) as string[];

                let userMap = new Map<string, UserLite>();
                if (userIds.length > 0) {
                    const { data: profileRows, error: profileError } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .in("id", userIds);

                    if (profileError) throw profileError;
                    userMap = new Map(((profileRows ?? []) as UserLite[]).map((profile) => [profile.id, profile]));
                }

                if (!active) return;
                setPlan(detail);
                setPlant(((plantResult as any)?.data ?? null) as PlantLite | null);
                setOrders(((workOrderRows ?? []) as WorkOrderRow[]) || []);
                setOrderUsers(userMap);
                setAssignee(detail.default_assignee_id ? userMap.get(detail.default_assignee_id) ?? null : null);
            } catch (error: any) {
                console.error("maintenance plan detail load error:", error);
                if (active) {
                    setPlan(null);
                    toast({
                        title: "Errore caricamento piano",
                        description: error?.message || "Impossibile leggere il dettaglio del piano di manutenzione.",
                        variant: "destructive",
                    });
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, id, organization?.id, toast]);

    const handleGenerateWorkOrder = async () => {
        if (!plan || !machine?.id || !machine?.plant_id || !organization?.id || !user?.id) return;
        setBusy(true);
        try {
            const fallbackDate = new Date().toISOString().slice(0, 10);
            const payload = {
                organization_id: organization.id,
                machine_id: machine.id,
                plant_id: machine.plant_id,
                maintenance_plan_id: plan.id,
                title: plan.title,
                description: plan.description,
                work_type: "preventive",
                priority: String(plan.priority ?? "medium").toLowerCase(),
                status: "draft",
                scheduled_date: plan.next_due_date || fallbackDate,
                due_date: plan.next_due_date || fallbackDate,
                assigned_to: plan.default_assignee_id || null,
                created_by: user.id,
                notes: plan.instructions || null,
            };

            const { data, error } = await supabase
                .from("work_orders")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            toast({
                title: "Ordine di lavoro generato",
                description: "Il work order è stato creato a partire dal piano selezionato.",
            });

            router.push(`/work-orders/${data.id}`);
        } catch (error: any) {
            console.error("generate work order error:", error);
            toast({
                title: "Errore generazione ordine",
                description: error?.message || "Impossibile generare il work order dal piano.",
                variant: "destructive",
            });
        } finally {
            setBusy(false);
        }
    };

    const handleToggleActive = async () => {
        if (!plan) return;
        setBusy(true);
        try {
            const nextValue = !(plan.is_active ?? true);
            const { error } = await supabase
                .from("maintenance_plans")
                .update({ is_active: nextValue })
                .eq("id", plan.id)
                .eq("organization_id", organization?.id ?? "");

            if (error) throw error;
            setPlan((prev) => (prev ? { ...prev, is_active: nextValue } : prev));
            toast({
                title: nextValue ? "Piano riattivato" : "Piano disattivato",
                description: nextValue ? "Il piano è tornato attivo." : "Il piano non genererà nuovi ordini finché resta inattivo.",
            });
        } catch (error: any) {
            console.error("toggle maintenance plan error:", error);
            toast({
                title: "Errore aggiornamento stato",
                description: error?.message || "Impossibile aggiornare lo stato del piano.",
                variant: "destructive",
            });
        } finally {
            setBusy(false);
        }
    };

    const pageTitle = plan?.title ? `${plan.title} - Piano manutenzione` : "Dettaglio piano di manutenzione";

    return (
        <OrgContextGuard>
            <MainLayout userRole={membership?.role ?? undefined}>
                <SEO title={`${pageTitle} - MACHINA`} />
                <div className="container mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                            <Link href="/maintenance" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-4 w-4" />
                                Torna ai piani
                            </Link>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl border border-border bg-card p-3">
                                    <Wrench className="h-6 w-6 text-foreground" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">{plan?.title || "Dettaglio piano"}</h1>
                                    <p className="text-sm text-muted-foreground">
                                        {isManufacturer
                                            ? "Piano definito dal costruttore per macchina presso cliente."
                                            : "Piano di manutenzione interno collegato a macchina e stabilimento."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {canManageMaintenance && (
                                <Button variant="outline" className="min-h-11" asChild>
                                    <Link href={`/maintenance/edit/${id}`}>
                                        <FilePenLine className="mr-2 h-4 w-4" />
                                        Modifica
                                    </Link>
                                </Button>
                            )}
                            {canManageMaintenance && (
                                <Button variant="outline" className="min-h-11" onClick={handleToggleActive} disabled={busy || loading}>
                                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : plan?.is_active ? <PauseCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                                    {plan?.is_active ? "Disattiva" : "Riattiva"}
                                </Button>
                            )}
                            <Button className="min-h-11" onClick={handleGenerateWorkOrder} disabled={busy || loading || !canManageMaintenance || !machine?.plant_id}>
                                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                Genera ordine di lavoro
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <Card className="rounded-2xl">
                            <CardContent className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Caricamento piano...
                            </CardContent>
                        </Card>
                    ) : !plan ? (
                        <Card className="rounded-2xl border-rose-500/30 bg-rose-500/5">
                            <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center">
                                <AlertTriangle className="h-8 w-8 text-rose-500" />
                                <div>
                                    <p className="font-medium text-foreground">Piano non trovato</p>
                                    <p className="text-sm text-muted-foreground">Verifica che il piano esista ancora e appartenga all'organizzazione attiva.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                            <div className="space-y-6">
                                <Card className="rounded-2xl">
                                    <CardHeader>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {getPriorityBadge(plan.priority)}
                                            <Badge variant="outline">{plan.is_active ? "Attivo" : "Inattivo"}</Badge>
                                        </div>
                                        <CardDescription>
                                            Regola di manutenzione: da qui nascono gli ordini di lavoro preventivi collegati a questa macchina.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Frequenza</p>
                                                <p className="mt-1 font-medium text-foreground">{formatFrequency(plan.frequency_value, plan.frequency_type)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Durata stimata</p>
                                                <p className="mt-1 font-medium text-foreground">{plan.estimated_duration_minutes ? `${plan.estimated_duration_minutes} min` : "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Prossima scadenza</p>
                                                <p className="mt-1 font-medium text-foreground">{formatDate(plan.next_due_date)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Ultima esecuzione registrata</p>
                                                <p className="mt-1 font-medium text-foreground">{formatDate(plan.last_executed_at, true)}</p>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <p className="text-sm text-muted-foreground">{plantLabel}</p>
                                                <p className="mt-1 font-medium text-foreground">{plant?.name || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Macchina</p>
                                                <p className="mt-1 font-medium text-foreground">{machine?.name || machine?.internal_code || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Area / linea</p>
                                                <p className="mt-1 font-medium text-foreground">{machine?.area || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Assegnatario predefinito</p>
                                                <p className="mt-1 font-medium text-foreground">
                                                    {assignee
                                                        ? assignee.display_name?.trim() || `${assignee.first_name ?? ""} ${assignee.last_name ?? ""}`.trim() || assignee.email || assignee.id
                                                        : "—"}
                                                </p>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Descrizione</p>
                                                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{plan.description || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Istruzioni operative</p>
                                                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{plan.instructions || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Note di sicurezza</p>
                                                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{plan.safety_notes || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Competenze richieste</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {(plan.required_skills ?? []).length > 0 ? (
                                                        (plan.required_skills ?? []).map((skill) => (
                                                            <Badge key={skill} variant="outline">
                                                                {skill}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-foreground">—</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-2xl">
                                    <CardHeader>
                                        <CardTitle>Storico ordini di lavoro</CardTitle>
                                        <CardDescription>Ordini già generati da questo piano di manutenzione.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {orders.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                                Nessun ordine di lavoro generato da questo piano.
                                            </div>
                                        ) : (
                                            orders.map((order) => {
                                                const assignedUser = order.assigned_to ? orderUsers.get(order.assigned_to) ?? null : null;
                                                const assignedLabel = assignedUser
                                                    ? assignedUser.display_name?.trim() || `${assignedUser.first_name ?? ""} ${assignedUser.last_name ?? ""}`.trim() || assignedUser.email || assignedUser.id
                                                    : "Non assegnato";

                                                return (
                                                    <div key={order.id} className="rounded-2xl border border-border bg-card p-4">
                                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                            <div className="space-y-2">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <Link href={`/work-orders/${order.id}`} className="font-medium text-foreground hover:underline">
                                                                        {order.title}
                                                                    </Link>
                                                                    {getStatusBadge(order.status)}
                                                                    {getPriorityBadge(order.priority)}
                                                                </div>
                                                                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                                                                    <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {order.work_type || "preventive"}</span>
                                                                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Programmato: {formatDate(order.scheduled_date)}</span>
                                                                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Scadenza: {formatDate(order.due_date)}</span>
                                                                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> {assignedLabel}</span>
                                                                </div>
                                                            </div>
                                                            <Button variant="outline" size="sm" asChild>
                                                                <Link href={`/work-orders/${order.id}`}>Apri ordine</Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card className="rounded-2xl">
                                    <CardHeader>
                                        <CardTitle>Riepilogo piano</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Creato il</p>
                                            <p className="font-medium text-foreground">{formatDate(plan.created_at, true)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Ultimo aggiornamento</p>
                                            <p className="font-medium text-foreground">{formatDate(plan.updated_at, true)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Ordini generati</p>
                                            <p className="font-medium text-foreground">{orders.length}</p>
                                        </div>
                                        <div className="rounded-2xl border border-border bg-muted/30 p-3 text-muted-foreground">
                                            <p className="font-medium text-foreground">Flusso consigliato</p>
                                            <p className="mt-2">Piano di manutenzione → genera work order → checklist da eseguire dentro l'ordine.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

