import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    Building2,
    CheckCircle2,
    CheckSquare,
    ClipboardList,
    Factory,
    Layers3,
    PlayCircle,
    ShieldCheck,
    Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface KpiState {
    machines: number;
    plans: number;
    activePlans: number;
    overduePlans: number;
    workOrders: number;
    openWorkOrders: number;
    templates: number;
    activeTemplates: number;
    executions30d: number;
}

interface PlanPreview {
    id: string;
    title: string | null;
    next_due_date: string | null;
    priority: string | null;
    is_active: boolean | null;
}

interface WorkOrderPreview {
    id: string;
    title: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
    machine: {
        name: string | null;
        internal_code: string | null;
    } | null;
}

interface ExecutionPreview {
    id: string;
    overall_status: string | null;
    executed_at: string | null;
    completed_at: string | null;
    work_order_id: string | null;
    checklist: {
        title: string | null;
    } | null;
    machine: {
        name: string | null;
    } | null;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleDateString("it-IT", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    } catch {
        return value;
    }
}

function getPriorityTone(priority: string | null | undefined) {
    const key = String(priority || "").toLowerCase();
    if (key === "critical") return "destructive" as const;
    if (key === "high") return "secondary" as const;
    return "outline" as const;
}

function getStatusTone(status: string | null | undefined) {
    const key = String(status || "").toLowerCase();
    if (["completed", "passed"].includes(key)) return "default" as const;
    if (["failed", "cancelled", "overdue"].includes(key)) return "destructive" as const;
    if (["pending_review", "pending", "draft", "scheduled"].includes(key)) return "secondary" as const;
    return "outline" as const;
}

function KpiCard({
    title,
    value,
    description,
    icon,
}: {
    title: string;
    value: number;
    description: string;
    icon: React.ReactNode;
}) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm font-medium text-foreground">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{description}</div>
            </CardContent>
        </Card>
    );
}

export default function OperationalFlowsPage() {
    const { loading: authLoading, organization, membership, user } = useAuth();
    const userRole = membership?.role ?? "viewer";
    const orgId = organization?.id ?? null;
    const orgType = organization?.type ?? null;
    const isManufacturer = orgType === "manufacturer";
    const canCreate = ["owner", "admin", "supervisor"].includes(userRole);
    const canExecute = !isManufacturer && ["owner", "admin", "supervisor", "technician"].includes(userRole);

    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState < KpiState > ({
        machines: 0,
        plans: 0,
        activePlans: 0,
        overduePlans: 0,
        workOrders: 0,
        openWorkOrders: 0,
        templates: 0,
        activeTemplates: 0,
        executions30d: 0,
    });
    const [plans, setPlans] = useState < PlanPreview[] > ([]);
    const [workOrders, setWorkOrders] = useState < WorkOrderPreview[] > ([]);
    const [executions, setExecutions] = useState < ExecutionPreview[] > ([]);
    const [loadError, setLoadError] = useState < string | null > (null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!orgId) {
                if (active) setLoading(false);
                return;
            }

            try {
                setLoadError(null);
                const today = new Date().toISOString().slice(0, 10);
                const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

                const [
                    machinesCount,
                    plansCount,
                    activePlansCount,
                    overduePlansCount,
                    workOrdersCount,
                    openWorkOrdersCount,
                    templatesCount,
                    activeTemplatesCount,
                    executionsCount,
                    planRows,
                    workOrderRows,
                    executionRows,
                ] = await Promise.all([
                    supabase.from("machines").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
                    supabase.from("maintenance_plans").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
                    supabase
                        .from("maintenance_plans")
                        .select("id", { count: "exact", head: true })
                        .eq("organization_id", orgId)
                        .eq("is_active", true),
                    supabase
                        .from("maintenance_plans")
                        .select("id", { count: "exact", head: true })
                        .eq("organization_id", orgId)
                        .eq("is_active", true)
                        .lt("next_due_date", today),
                    supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
                    supabase
                        .from("work_orders")
                        .select("id", { count: "exact", head: true })
                        .eq("organization_id", orgId)
                        .not("status", "in", '("completed","cancelled")'),
                    supabase.from("checklists").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
                    supabase
                        .from("checklists")
                        .select("id", { count: "exact", head: true })
                        .eq("organization_id", orgId)
                        .eq("is_active", true),
                    supabase.from("checklist_executions").select("id", { count: "exact", head: true }).gte("executed_at", since),
                    supabase
                        .from("maintenance_plans")
                        .select("id, title, next_due_date, priority, is_active")
                        .eq("organization_id", orgId)
                        .order("next_due_date", { ascending: true, nullsFirst: false })
                        .limit(6),
                    supabase
                        .from("work_orders")
                        .select("id, title, status, priority, due_date, machine:machines(name, internal_code)")
                        .eq("organization_id", orgId)
                        .order("created_at", { ascending: false })
                        .limit(8),
                    supabase
                        .from("checklist_executions")
                        .select("id, overall_status, executed_at, completed_at, work_order_id, checklist:checklists(title), machine:machines(name)")
                        .order("executed_at", { ascending: false })
                        .limit(8),
                ]);

                const errors = [
                    machinesCount.error,
                    plansCount.error,
                    activePlansCount.error,
                    overduePlansCount.error,
                    workOrdersCount.error,
                    openWorkOrdersCount.error,
                    templatesCount.error,
                    activeTemplatesCount.error,
                    executionsCount.error,
                    planRows.error,
                    workOrderRows.error,
                    executionRows.error,
                ].filter(Boolean);

                if (errors.length > 0) {
                    throw errors[0];
                }

                if (!active) return;

                setKpis({
                    machines: machinesCount.count ?? 0,
                    plans: plansCount.count ?? 0,
                    activePlans: activePlansCount.count ?? 0,
                    overduePlans: overduePlansCount.count ?? 0,
                    workOrders: workOrdersCount.count ?? 0,
                    openWorkOrders: openWorkOrdersCount.count ?? 0,
                    templates: templatesCount.count ?? 0,
                    activeTemplates: activeTemplatesCount.count ?? 0,
                    executions30d: executionsCount.count ?? 0,
                });
                setPlans((planRows.data ?? []) as PlanPreview[]);
                setWorkOrders((workOrderRows.data ?? []) as WorkOrderPreview[]);
                setExecutions((executionRows.data ?? []) as ExecutionPreview[]);
            } catch (error: any) {
                console.error("Operational flows load error:", error);
                if (active) setLoadError(error?.message || "Errore durante il caricamento del flusso operativo.");
            } finally {
                if (active) setLoading(false);
            }
        };

        if (!authLoading) void load();

        return () => {
            active = false;
        };
    }, [authLoading, orgId]);

    const blockers = useMemo(() => {
        const items: Array<{ title: string; description: string; href: string; hrefLabel: string }> = [];

        if (kpis.machines === 0) {
            items.push({
                title: "Nessuna macchina nel contesto attivo",
                description: "Senza macchine non puoi agganciare piani di manutenzione, ordini di lavoro o checklist operative.",
                href: "/equipment",
                hrefLabel: "Vai alle macchine",
            });
        }

        if (kpis.activePlans === 0) {
            items.push({
                title: "Nessun piano di manutenzione attivo",
                description: "I flussi preventivi partono dai piani: senza piani attivi gli ordini saranno solo ad-hoc.",
                href: "/maintenance/new",
                hrefLabel: "Crea piano",
            });
        }

        if (kpis.activeTemplates === 0) {
            items.push({
                title: "Nessuna checklist attiva",
                description: "Le checklist danno traccia operativa e evidenze sul campo. Senza template attivi perdi controllo esecutivo.",
                href: "/checklists/new",
                hrefLabel: "Crea checklist",
            });
        }

        if (canExecute && kpis.openWorkOrders > 0 && kpis.executions30d === 0) {
            items.push({
                title: "Ordini aperti senza esecuzioni recenti",
                description: "Ci sono ordini operativi ancora aperti ma nessuna compilazione checklist nelle ultime 4 settimane.",
                href: "/work-orders",
                hrefLabel: "Apri ordini",
            });
        }

        return items;
    }, [canExecute, kpis]);

    const pageTitle = isManufacturer ? "Flussi operativi costruttore" : "Flussi operativi";
    const subtitle = isManufacturer
        ? "Qui controlli come i template e i piani creati dal costruttore diventano attività concrete presso i clienti finali."
        : "Qui controlli il flusso completo: piano di manutenzione, ordine di lavoro, checklist ed esecuzione sul campo.";

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <div className="p-8 text-sm text-muted-foreground">Caricamento flussi operativi…</div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${pageTitle} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{organization?.name ?? "Contesto attivo"}</Badge>
                                <Badge variant="secondary">{orgType ?? "unknown"}</Badge>
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
                            <p className="max-w-3xl text-base text-muted-foreground">{subtitle}</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link href="/maintenance/new">
                                <Button variant="outline">
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Nuovo piano
                                </Button>
                            </Link>
                            <Link href="/work-orders/new">
                                <Button>
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Nuovo ordine
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {loadError && (
                        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
                            <CardContent className="p-5 text-sm text-destructive">{loadError}</CardContent>
                        </Card>
                    )}

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            title="Macchine nel contesto"
                            value={kpis.machines}
                            description={isManufacturer ? "Macchine del costruttore pronte per assegnazioni e piani." : "Macchine disponibili per manutenzione, ordini e checklist."}
                            icon={<Factory className="h-5 w-5" />}
                        />
                        <KpiCard
                            title="Piani attivi"
                            value={kpis.activePlans}
                            description={kpis.overduePlans > 0 ? `${kpis.overduePlans} già scaduti o da rigenerare.` : "Nessuna scadenza critica rilevata al momento."}
                            icon={<Wrench className="h-5 w-5" />}
                        />
                        <KpiCard
                            title="Ordini aperti"
                            value={kpis.openWorkOrders}
                            description={isManufacturer ? "Attività create dal costruttore e ancora da chiudere o monitorare." : "Ordini in bozza, programmati o in corso sul contesto attivo."}
                            icon={<ClipboardList className="h-5 w-5" />}
                        />
                        <KpiCard
                            title={isManufacturer ? "Template checklist" : "Esecuzioni ultimi 30 giorni"}
                            value={isManufacturer ? kpis.activeTemplates : kpis.executions30d}
                            description={isManufacturer ? "Template attivi per guidare clienti ed esecuzioni." : "Compilazioni registrate con evidenza operativa recente."}
                            icon={isManufacturer ? <CheckSquare className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Che cosa deve fare questa sezione</CardTitle>
                                <CardDescription>
                                    Non sostituisce piani, ordini o checklist: li tiene collegati in un percorso leggibile e operativo.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    {
                                        n: "1",
                                        title: "Piano di manutenzione",
                                        desc: "Definisce periodicità, competenze richieste e priorità. È la regola che genera attività ripetibili.",
                                        href: "/maintenance",
                                    },
                                    {
                                        n: "2",
                                        title: "Ordine di lavoro",
                                        desc: "È l’azione concreta da assegnare, tracciare e chiudere. Può nascere da un piano o essere creato manualmente.",
                                        href: "/work-orders",
                                    },
                                    {
                                        n: "3",
                                        title: isManufacturer ? "Template checklist" : "Checklist operativa",
                                        desc: isManufacturer
                                            ? "Il costruttore prepara i template che guidano il cliente finale durante l’esecuzione."
                                            : "La checklist guida il tecnico nei controlli, misure e note da compilare sul campo.",
                                        href: "/checklists",
                                    },
                                    {
                                        n: "4",
                                        title: "Esecuzione e feedback",
                                        desc: isManufacturer
                                            ? "Il costruttore non esegue direttamente, ma monitora risultati, anomalie e prove raccolte dal cliente."
                                            : "Il tecnico compila, salva, allega evidenze e aggiorna il flusso fino alla chiusura dell’ordine.",
                                        href: canExecute ? "/work-orders" : "/checklists",
                                    },
                                ].map((step) => (
                                    <div key={step.n} className="rounded-2xl border border-border bg-muted/20 p-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-sm font-bold text-white">
                                                {step.n}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                                                    <Link href={step.href} className="text-sm font-medium text-orange-500 hover:underline">
                                                        Apri sezione
                                                    </Link>
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.desc}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Azioni rapide</CardTitle>
                                    <CardDescription>
                                        Entrate dirette ai punti che muovono davvero il flusso operativo.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {canCreate && (
                                        <Link href="/maintenance/new" className="block">
                                            <Button variant="outline" className="w-full justify-between">
                                                <span className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Nuovo piano</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                    {canCreate && (
                                        <Link href="/work-orders/new" className="block">
                                            <Button variant="outline" className="w-full justify-between">
                                                <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Nuovo ordine di lavoro</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                    {canCreate && (
                                        <Link href="/checklists/new" className="block">
                                            <Button variant="outline" className="w-full justify-between">
                                                <span className="flex items-center gap-2"><CheckSquare className="h-4 w-4" /> Nuova checklist</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                    {isManufacturer ? (
                                        <>
                                            <Link href="/customers" className="block">
                                                <Button variant="outline" className="w-full justify-between">
                                                    <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Clienti</span>
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link href="/assignments" className="block">
                                                <Button variant="outline" className="w-full justify-between">
                                                    <span className="flex items-center gap-2"><Layers3 className="h-4 w-4" /> Assegnazioni macchina</span>
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </>
                                    ) : (
                                        <Link href="/plants" className="block">
                                            <Button variant="outline" className="w-full justify-between">
                                                <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Stabilimenti</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                    {canExecute && (
                                        <Link href="/work-orders" className="block">
                                            <Button className="w-full justify-between">
                                                <span className="flex items-center gap-2"><PlayCircle className="h-4 w-4" /> Apri coda operativa</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Blocchi o attenzione</CardTitle>
                                    <CardDescription>
                                        Qui vedi subito cosa impedisce al flusso di essere completo.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {blockers.length === 0 ? (
                                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                                            Nessun blocco strutturale evidente: il flusso ha già macchine, piani, ordini e checklist per lavorare.
                                        </div>
                                    ) : (
                                        blockers.map((item) => (
                                            <div key={item.title} className="rounded-2xl border border-border bg-muted/20 p-4">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-foreground">{item.title}</div>
                                                        <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
                                                        <Link href={item.href} className="mt-3 inline-flex text-sm font-medium text-orange-500 hover:underline">
                                                            {item.hrefLabel}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Ordini di lavoro recenti</CardTitle>
                                <CardDescription>
                                    Gli ordini sono il punto in cui il piano diventa attività concreta.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {workOrders.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                                        Nessun ordine di lavoro disponibile nel contesto attivo.
                                    </div>
                                ) : (
                                    workOrders.map((row) => (
                                        <Link key={row.id} href={`/work-orders/${row.id}`} className="block rounded-2xl border border-border bg-muted/10 p-4 transition hover:bg-muted/20">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="font-medium text-foreground">{row.title || "Ordine senza titolo"}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {row.machine?.name || "Macchina non collegata"}
                                                        {row.machine?.internal_code ? ` · ${row.machine.internal_code}` : ""}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant={getStatusTone(row.status)}>{row.status || "—"}</Badge>
                                                    <Badge variant={getPriorityTone(row.priority)}>{row.priority || "medium"}</Badge>
                                                </div>
                                            </div>
                                            <div className="mt-3 text-sm text-muted-foreground">
                                                Scadenza: {formatDate(row.due_date)}
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>{isManufacturer ? "Risultati esecuzioni recenti" : "Checklist compilate di recente"}</CardTitle>
                                <CardDescription>
                                    {isManufacturer
                                        ? "Come costruttore, qui leggi le evidenze raccolte dal cliente sulle tue macchine vendute."
                                        : "Qui leggi cosa è stato compilato sul campo e con quale esito operativo."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {executions.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                                        Nessuna esecuzione registrata di recente nel contesto attivo.
                                    </div>
                                ) : (
                                    executions.map((row) => (
                                        <div key={row.id} className="rounded-2xl border border-border bg-muted/10 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-medium text-foreground">{row.checklist?.title || "Checklist"}</div>
                                                    <div className="text-sm text-muted-foreground">{row.machine?.name || "Macchina non collegata"}</div>
                                                </div>
                                                <Badge variant={getStatusTone(row.overall_status)}>{row.overall_status || "pending"}</Badge>
                                            </div>
                                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                <span>Eseguita: {formatDate(row.completed_at || row.executed_at)}</span>
                                                {row.work_order_id && (
                                                    <Link href={`/work-orders/${row.work_order_id}`} className="font-medium text-orange-500 hover:underline">
                                                        Apri ordine collegato
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Piani prossimi alla scadenza</CardTitle>
                            <CardDescription>
                                Punto rapido per capire se il flusso preventivo sta alimentando davvero gli ordini di lavoro.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {plans.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                                    Nessun piano disponibile nel contesto attivo.
                                </div>
                            ) : (
                                plans.map((row) => (
                                    <Link key={row.id} href={`/maintenance/${row.id}`} className="block rounded-2xl border border-border bg-muted/10 p-4 transition hover:bg-muted/20">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="font-medium text-foreground">{row.title || "Piano senza titolo"}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Prossima scadenza: {formatDate(row.next_due_date)}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {!row.is_active && <Badge variant="outline">inattivo</Badge>}
                                                {row.priority && <Badge variant={getPriorityTone(row.priority)}>{row.priority}</Badge>}
                                                {row.is_active && row.next_due_date && new Date(row.next_due_date).getTime() < Date.now() && (
                                                    <Badge variant="destructive">scaduto</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

