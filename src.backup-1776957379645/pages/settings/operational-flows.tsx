import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    CheckSquare,
    ClipboardList,
    Factory,
    Filter,
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
import { useOrgType } from "@/hooks/useOrgType";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeRole } from "@/lib/roles";

type MachineRow = {
    id: string;
    name: string | null;
    internal_code: string | null;
    plant_id: string | null;
    area: string | null;
};

type PlantRow = {
    id: string;
    name: string | null;
};

type PlanRow = {
    id: string;
    title: string | null;
    machine_id: string | null;
    priority: string | null;
    next_due_date: string | null;
    is_active: boolean | null;
};

type WorkOrderRow = {
    id: string;
    title: string | null;
    machine_id: string | null;
    maintenance_plan_id: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
};

type ChecklistRow = {
    id: string;
    title: string | null;
    machine_id: string | null;
    checklist_type: string | null;
    is_active: boolean | null;
    is_template: boolean | null;
};

type ExecutionRow = {
    id: string;
    checklist_id: string | null;
    machine_id: string | null;
    work_order_id: string | null;
    overall_status: string | null;
    executed_at: string | null;
    completed_at: string | null;
};

type KpiState = {
    machines: number;
    plans: number;
    openWorkOrders: number;
    activeTemplates: number;
    executions30d: number;
};

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
    if (["failed", "cancelled"].includes(key)) return "destructive" as const;
    if (["pending_review", "pending", "draft", "scheduled", "in_progress"].includes(key)) return "secondary" as const;
    return "outline" as const;
}

function KpiCard({ title, value, description, icon }: { title: string; value: number; description: string; icon: React.ReactNode }) {
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

function buildHref(path: string, params: Record<string, string | null | undefined>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) search.set(key, value);
    });
    const query = search.toString();
    return query ? `${path}?${query}` : path;
}

export default function OperationalFlowsPage() {
    const { loading: authLoading, organization, membership } = useAuth();
    const { isManufacturer, canExecuteChecklist, machineContextLabel, maintenanceLabel, checklistsLabel } = useOrgType();

    const orgId = organization?.id ?? null;
    const userRole = normalizeRole(membership?.role ?? null);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [machines, setMachines] = useState<MachineRow[]>([]);
    const [plants, setPlants] = useState<PlantRow[]>([]);
    const [plans, setPlans] = useState<PlanRow[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
    const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
    const [executions, setExecutions] = useState<ExecutionRow[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<string>("all");
    const [selectedPlanId, setSelectedPlanId] = useState<string>("all");
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>("all");
    const [selectedChecklistId, setSelectedChecklistId] = useState<string>("all");

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!orgId) {
                if (active) setLoading(false);
                return;
            }
            try {
                setLoadError(null);
                const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const [
                    machinesRes,
                    plantsRes,
                    plansRes,
                    workOrdersRes,
                    checklistsRes,
                    executionsRes,
                ] = await Promise.all([
                    supabase.from("machines").select("id, name, internal_code, plant_id, area").eq("organization_id", orgId).order("name", { ascending: true }),
                    supabase.from("plants").select("id, name").eq("organization_id", orgId).order("name", { ascending: true }),
                    supabase.from("maintenance_plans").select("id, title, machine_id, priority, next_due_date, is_active").eq("organization_id", orgId).order("updated_at", { ascending: false }),
                    supabase.from("work_orders").select("id, title, machine_id, maintenance_plan_id, status, priority, due_date").eq("organization_id", orgId).order("created_at", { ascending: false }),
                    supabase.from("checklists").select("id, title, machine_id, checklist_type, is_active, is_template").eq("organization_id", orgId).order("updated_at", { ascending: false }),
                    supabase.from("checklist_executions").select("id, checklist_id, machine_id, work_order_id, overall_status, executed_at, completed_at").gte("executed_at", since).order("executed_at", { ascending: false }),
                ]);

                const firstError = [machinesRes, plantsRes, plansRes, workOrdersRes, checklistsRes, executionsRes]
                    .map((res) => res.error)
                    .find(Boolean);
                if (firstError) throw firstError;
                if (!active) return;

                const nextMachines = (machinesRes.data ?? []) as MachineRow[];
                const nextPlans = (plansRes.data ?? []) as PlanRow[];
                const nextWorkOrders = (workOrdersRes.data ?? []) as WorkOrderRow[];
                const nextChecklists = (checklistsRes.data ?? []) as ChecklistRow[];
                const nextExecutions = (executionsRes.data ?? []) as ExecutionRow[];

                setMachines(nextMachines);
                setPlants((plantsRes.data ?? []) as PlantRow[]);
                setPlans(nextPlans);
                setWorkOrders(nextWorkOrders);
                setChecklists(nextChecklists);
                setExecutions(nextExecutions);

                if (nextMachines.length > 0 && selectedMachineId === "all") {
                    setSelectedMachineId(nextMachines[0].id);
                }
            } catch (error: any) {
                console.error("operational flows context load error", error);
                if (active) setLoadError(error?.message || "Errore durante il caricamento dei flussi operativi.");
            } finally {
                if (active) setLoading(false);
            }
        };

        if (!authLoading) void load();
        return () => {
            active = false;
        };
    }, [authLoading, orgId, selectedMachineId]);

    const plantMap = useMemo(() => new Map(plants.map((row) => [row.id, row])), [plants]);
    const machineMap = useMemo(() => new Map(machines.map((row) => [row.id, row])), [machines]);
    const selectedMachine = selectedMachineId !== "all" ? machineMap.get(selectedMachineId) ?? null : null;

    const machineScopedPlans = useMemo(
        () => (selectedMachineId === "all" ? plans : plans.filter((row) => row.machine_id === selectedMachineId)),
        [plans, selectedMachineId]
    );
    const machineScopedWorkOrders = useMemo(
        () => (selectedMachineId === "all" ? workOrders : workOrders.filter((row) => row.machine_id === selectedMachineId)),
        [workOrders, selectedMachineId]
    );
    const machineScopedChecklists = useMemo(
        () => (selectedMachineId === "all"
            ? checklists
            : checklists.filter((row) => row.machine_id === selectedMachineId || row.machine_id === null)),
        [checklists, selectedMachineId]
    );
    const machineScopedExecutions = useMemo(
        () => (selectedMachineId === "all" ? executions : executions.filter((row) => row.machine_id === selectedMachineId)),
        [executions, selectedMachineId]
    );

    useEffect(() => {
        if (selectedPlanId !== "all" && !machineScopedPlans.some((row) => row.id === selectedPlanId)) {
            setSelectedPlanId("all");
        }
        if (selectedWorkOrderId !== "all" && !machineScopedWorkOrders.some((row) => row.id === selectedWorkOrderId)) {
            setSelectedWorkOrderId("all");
        }
        if (selectedChecklistId !== "all" && !machineScopedChecklists.some((row) => row.id === selectedChecklistId)) {
            setSelectedChecklistId("all");
        }
    }, [machineScopedPlans, machineScopedWorkOrders, machineScopedChecklists, selectedPlanId, selectedWorkOrderId, selectedChecklistId]);

    const selectedPlan = selectedPlanId !== "all" ? machineScopedPlans.find((row) => row.id === selectedPlanId) ?? null : null;
    const selectedWorkOrder = selectedWorkOrderId !== "all" ? machineScopedWorkOrders.find((row) => row.id === selectedWorkOrderId) ?? null : null;
    const selectedChecklist = selectedChecklistId !== "all" ? machineScopedChecklists.find((row) => row.id === selectedChecklistId) ?? null : null;

    const kpis = useMemo<KpiState>(() => ({
        machines: machines.length,
        plans: plans.filter((row) => row.is_active !== false).length,
        openWorkOrders: workOrders.filter((row) => !["completed", "cancelled"].includes(String(row.status || "").toLowerCase())).length,
        activeTemplates: checklists.filter((row) => row.is_active !== false).length,
        executions30d: executions.length,
    }), [machines, plans, workOrders, checklists, executions]);

    const machineLabel = useMemo(() => {
        if (!selectedMachine) return "Nessuna macchina selezionata";
        const plantName = selectedMachine.plant_id ? plantMap.get(selectedMachine.plant_id)?.name ?? "Senza stabilimento" : "Senza stabilimento";
        const name = selectedMachine.name?.trim() || selectedMachine.internal_code?.trim() || "Macchina senza nome";
        const area = selectedMachine.area?.trim() ? ` · ${selectedMachine.area}` : "";
        return `${plantName} → ${name}${area}`;
    }, [plantMap, selectedMachine]);

    const recommendedNextStep = useMemo(() => {
        if (!selectedMachine) {
            return {
                title: "Seleziona prima una macchina",
                description: `Scegli una macchina dal filtro in alto per costruire un flusso contestualizzato ${machineContextLabel.toLowerCase()}.`,
                href: "/equipment",
                cta: "Vai alle macchine",
                icon: <Factory className="h-5 w-5" />,
            };
        }
        if (!selectedPlan) {
            return {
                title: "Manca un piano di manutenzione contestualizzato",
                description: "Il flusso preventivo parte dal piano. Crea o apri un piano per questa macchina e definisci frequenza e priorità.",
                href: buildHref("/maintenance/new", { machine_id: selectedMachine.id }),
                cta: "Crea piano per questa macchina",
                icon: <Wrench className="h-5 w-5" />,
            };
        }
        if (!selectedWorkOrder) {
            return {
                title: "Piano presente: ora genera l’ordine di lavoro",
                description: "Con un piano selezionato puoi aprire un ordine già precompilato e trasformare la regola in attività concreta.",
                href: buildHref("/work-orders/new", { plan_id: selectedPlan.id, machine_id: selectedMachine.id }),
                cta: "Nuovo ordine dal piano",
                icon: <ClipboardList className="h-5 w-5" />,
            };
        }
        if (!selectedChecklist) {
            return {
                title: isManufacturer ? "Associa un template checklist" : "Manca una checklist operativa",
                description: isManufacturer
                    ? "Il costruttore dovrebbe definire il template che guiderà il cliente finale durante l’esecuzione."
                    : "Scegli o crea una checklist operativa compatibile con la macchina per guidare il tecnico sul campo.",
                href: buildHref("/checklists/new", { machine_id: selectedMachine.id }),
                cta: isManufacturer ? "Crea template checklist" : "Crea checklist per questa macchina",
                icon: <CheckSquare className="h-5 w-5" />,
            };
        }
        if (canExecuteChecklist) {
            return {
                title: "Il flusso è pronto per l’esecuzione",
                description: "Hai macchina, piano, ordine e checklist. Il tecnico può aprire subito la compilazione con il contesto già pronto.",
                href: buildHref(`/checklists/execute/${selectedChecklist.id}`, { work_order_id: selectedWorkOrder.id }),
                cta: "Esegui checklist collegata",
                icon: <PlayCircle className="h-5 w-5" />,
            };
        }
        return {
            title: "Il costruttore può monitorare il flusso",
            description: "Il cliente finale eseguirà la checklist; da qui puoi comunque aprire ordine e risultati per monitorare lo stato operativo.",
            href: `/work-orders/${selectedWorkOrder.id}`,
            cta: "Apri ordine collegato",
            icon: <ShieldCheck className="h-5 w-5" />,
        };
    }, [selectedMachine, selectedPlan, selectedWorkOrder, selectedChecklist, canExecuteChecklist, isManufacturer, machineContextLabel]);

    const actions = useMemo(() => {
        const machineId = selectedMachine?.id ?? undefined;
        const planId = selectedPlan?.id ?? undefined;
        const workOrderId = selectedWorkOrder?.id ?? undefined;
        const checklistId = selectedChecklist?.id ?? undefined;
        return [
            {
                title: maintenanceLabel,
                description: machineId ? `Apri o crea un piano già filtrato sulla macchina selezionata.` : "Apri il dominio manutenzione e filtra i piani attivi.",
                href: machineId ? buildHref("/maintenance/new", { machine_id: machineId }) : "/maintenance",
                hrefLabel: machineId ? "Nuovo piano contestualizzato" : "Apri manutenzione",
            },
            {
                title: "Ordini di lavoro",
                description: planId
                    ? "Crea un ordine già agganciato al piano scelto."
                    : machineId
                        ? "Apri un nuovo ordine già riferito alla macchina scelta."
                        : "Apri il registro ordini per stato, macchina e priorità.",
                href: planId ? buildHref("/work-orders/new", { plan_id: planId, machine_id: machineId }) : machineId ? buildHref("/work-orders/new", { machine_id: machineId }) : "/work-orders",
                hrefLabel: planId ? "Nuovo ordine da piano" : machineId ? "Nuovo ordine per macchina" : "Apri ordini",
            },
            {
                title: checklistsLabel,
                description: checklistId
                    ? "Apri il dettaglio della checklist selezionata."
                    : machineId
                        ? "Crea o filtra checklist compatibili con la macchina selezionata."
                        : "Apri il catalogo checklist / template del contesto attivo.",
                href: checklistId ? `/checklists/${checklistId}` : machineId ? buildHref("/checklists/new", { machine_id: machineId }) : "/checklists",
                hrefLabel: checklistId ? "Apri checklist" : machineId ? "Nuova checklist contestualizzata" : "Apri checklist",
            },
            {
                title: canExecuteChecklist ? "Esecuzione" : "Monitoraggio",
                description: canExecuteChecklist
                    ? checklistId
                        ? "Apri la compilazione con work order già collegato quando disponibile."
                        : "Seleziona una checklist per abilitare l’esecuzione contestualizzata."
                    : workOrderId
                        ? "Apri l’ordine per monitorare stato, risultati e feedback del cliente."
                        : "Seleziona un ordine di lavoro per aprire il monitoraggio contestuale.",
                href: canExecuteChecklist
                    ? checklistId
                        ? buildHref(`/checklists/execute/${checklistId}`, { work_order_id: workOrderId })
                        : "/checklists"
                    : workOrderId
                        ? `/work-orders/${workOrderId}`
                        : "/work-orders",
                hrefLabel: canExecuteChecklist ? (checklistId ? "Esegui checklist" : "Apri checklist") : (workOrderId ? "Apri ordine" : "Apri ordini"),
            },
        ];
    }, [selectedMachine, selectedPlan, selectedWorkOrder, selectedChecklist, maintenanceLabel, checklistsLabel, canExecuteChecklist]);

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
                <SEO title={`Flussi operativi - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{organization?.name ?? "Contesto attivo"}</Badge>
                                <Badge variant="secondary">{isManufacturer ? "manufacturer" : "enterprise/customer"}</Badge>
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">Flussi operativi</h1>
                            <p className="max-w-3xl text-base text-muted-foreground">
                                Qui non stai guardando solo KPI: scegli una macchina e fai partire il flusso corretto con link già contestualizzati a piani, ordini e checklist.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link href={recommendedNextStep.href}>
                                <Button>
                                    {recommendedNextStep.icon}
                                    <span className="ml-2">{recommendedNextStep.cta}</span>
                                </Button>
                            </Link>
                            <Link href="/settings">
                                <Button variant="outline">Torna alle impostazioni</Button>
                            </Link>
                        </div>
                    </div>

                    {loadError && (
                        <Card className="rounded-2xl border-destructive/40 bg-destructive/5">
                            <CardContent className="p-5 text-sm text-destructive">{loadError}</CardContent>
                        </Card>
                    )}

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                        <KpiCard title="Macchine" value={kpis.machines} description="Disponibili nel contesto attivo." icon={<Factory className="h-5 w-5" />} />
                        <KpiCard title="Piani attivi" value={kpis.plans} description="Regole pronte a generare attività." icon={<Wrench className="h-5 w-5" />} />
                        <KpiCard title="Ordini aperti" value={kpis.openWorkOrders} description="Da eseguire, monitorare o chiudere." icon={<ClipboardList className="h-5 w-5" />} />
                        <KpiCard title={isManufacturer ? "Template attivi" : "Checklist attive"} value={kpis.activeTemplates} description="Strumenti operativi disponibili." icon={<CheckSquare className="h-5 w-5" />} />
                        <KpiCard title="Esecuzioni 30g" value={kpis.executions30d} description="Feedback recenti sul campo." icon={<ShieldCheck className="h-5 w-5" />} />
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Contesto operativo rapido
                            </CardTitle>
                            <CardDescription>
                                Scegli una macchina e, se vuoi, restringi il flusso a piano, ordine e checklist. Le CTA sotto si aggiornano automaticamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-2">
                                <Label>{machineContextLabel}</Label>
                                <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona macchina" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutte le macchine</SelectItem>
                                        {machines.map((row) => {
                                            const plantName = row.plant_id ? plantMap.get(row.plant_id)?.name ?? "Senza stabilimento" : "Senza stabilimento";
                                            const machineName = row.name?.trim() || row.internal_code?.trim() || row.id;
                                            return (
                                                <SelectItem key={row.id} value={row.id}>
                                                    {plantName} → {machineName}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Piano di manutenzione</Label>
                                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tutti i piani" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutti i piani</SelectItem>
                                        {machineScopedPlans.map((row) => (
                                            <SelectItem key={row.id} value={row.id}>{row.title || row.id}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Ordine di lavoro</Label>
                                <Select value={selectedWorkOrderId} onValueChange={setSelectedWorkOrderId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tutti gli ordini" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutti gli ordini</SelectItem>
                                        {machineScopedWorkOrders.map((row) => (
                                            <SelectItem key={row.id} value={row.id}>{row.title || row.id}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{checklistsLabel}</Label>
                                <Select value={selectedChecklistId} onValueChange={setSelectedChecklistId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tutte le checklist" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutte le checklist</SelectItem>
                                        {machineScopedChecklists.map((row) => (
                                            <SelectItem key={row.id} value={row.id}>{row.title || row.id}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Prossimo passo consigliato</CardTitle>
                                <CardDescription>
                                    Il sistema propone la prossima azione utile in base a ciò che hai già selezionato e a ciò che manca nel flusso.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                                            {recommendedNextStep.icon}
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="font-semibold text-foreground">{recommendedNextStep.title}</div>
                                            <div className="text-sm text-muted-foreground">{recommendedNextStep.description}</div>
                                            <Link href={recommendedNextStep.href} className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:underline">
                                                {recommendedNextStep.cta}
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    {actions.map((action) => (
                                        <div key={action.title} className="rounded-2xl border border-border bg-muted/10 p-4">
                                            <div className="font-medium text-foreground">{action.title}</div>
                                            <div className="mt-1 text-sm text-muted-foreground">{action.description}</div>
                                            <Link href={action.href} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:underline">
                                                {action.hrefLabel}
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Contesto selezionato</CardTitle>
                                <CardDescription>
                                    Riepilogo rapido del perimetro con cui stai lavorando in questo momento.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="rounded-2xl border border-border bg-muted/10 p-4">
                                    <div className="text-sm text-muted-foreground">Macchina</div>
                                    <div className="mt-1 font-medium text-foreground">{machineLabel}</div>
                                </div>
                                <div className="rounded-2xl border border-border bg-muted/10 p-4">
                                    <div className="text-sm text-muted-foreground">Piano</div>
                                    <div className="mt-1 font-medium text-foreground">{selectedPlan?.title || "Nessun piano contestuale"}</div>
                                </div>
                                <div className="rounded-2xl border border-border bg-muted/10 p-4">
                                    <div className="text-sm text-muted-foreground">Ordine</div>
                                    <div className="mt-1 flex items-center gap-2 font-medium text-foreground">
                                        <span>{selectedWorkOrder?.title || "Nessun ordine contestuale"}</span>
                                        {selectedWorkOrder?.status && <Badge variant={getStatusTone(selectedWorkOrder.status)}>{selectedWorkOrder.status}</Badge>}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-border bg-muted/10 p-4">
                                    <div className="text-sm text-muted-foreground">Checklist</div>
                                    <div className="mt-1 flex items-center gap-2 font-medium text-foreground">
                                        <span>{selectedChecklist?.title || "Nessuna checklist contestuale"}</span>
                                        {selectedChecklist?.checklist_type && <Badge variant="outline">{selectedChecklist.checklist_type}</Badge>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Ordini recenti nel contesto</CardTitle>
                                <CardDescription>
                                    Vista rapida di cosa è già stato generato sulla macchina o nel contesto selezionato.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {machineScopedWorkOrders.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                                        Nessun ordine disponibile nel contesto filtrato.
                                    </div>
                                ) : (
                                    machineScopedWorkOrders.slice(0, 8).map((row) => (
                                        <Link key={row.id} href={`/work-orders/${row.id}`} className="block rounded-2xl border border-border bg-muted/10 p-4 transition hover:bg-muted/20">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-medium text-foreground">{row.title || "Ordine senza titolo"}</div>
                                                    <div className="mt-1 text-sm text-muted-foreground">Scadenza: {formatDate(row.due_date)}</div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant={getStatusTone(row.status)}>{row.status || "—"}</Badge>
                                                    <Badge variant={getPriorityTone(row.priority)}>{row.priority || "medium"}</Badge>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>{isManufacturer ? "Feedback recenti" : "Esecuzioni recenti"}</CardTitle>
                                <CardDescription>
                                    Ultimi riscontri registrati nel contesto corrente, utili per capire se il flusso sta davvero girando.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {machineScopedExecutions.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                                        Nessuna esecuzione recente nel contesto filtrato.
                                    </div>
                                ) : (
                                    machineScopedExecutions.slice(0, 8).map((row) => (
                                        <div key={row.id} className="rounded-2xl border border-border bg-muted/10 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-medium text-foreground">Checklist {row.checklist_id || "—"}</div>
                                                    <div className="mt-1 text-sm text-muted-foreground">Eseguita: {formatDate(row.completed_at || row.executed_at)}</div>
                                                </div>
                                                <Badge variant={getStatusTone(row.overall_status)}>{row.overall_status || "pending"}</Badge>
                                            </div>
                                            {row.work_order_id && (
                                                <Link href={`/work-orders/${row.work_order_id}`} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:underline">
                                                    Apri ordine collegato
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            )}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {selectedMachine && (
                        <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5">
                            <CardContent className="flex flex-wrap items-start gap-3 p-5 text-sm text-amber-900 dark:text-amber-200">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium">Nota di utilizzo</div>
                                    <div className="mt-1">
                                        Questa pagina non sostituisce i domini operativi: serve per entrare nel punto giusto con il contesto già pronto e ridurre click inutili tra macchina, piano, ordine e checklist.
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

