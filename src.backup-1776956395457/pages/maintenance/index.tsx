import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Filter,
    Plus,
    Search,
    Settings2,
    Wrench,
} from "lucide-react";

type FrequencyType = "hours" | "days" | "weeks" | "months" | "cycles";
type PlanPriority = "low" | "medium" | "high" | "critical" | string;

type MachineLite = {
    id: string;
    name: string | null;
    internal_code: string | null;
    plant_id: string | null;
    area?: string | null;
};

type PlantLite = {
    id: string;
    name: string | null;
    type?: string | null;
};

type MaintenancePlanRow = {
    id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    frequency_type: FrequencyType;
    frequency_value: number;
    estimated_duration_minutes: number | null;
    priority: PlanPriority | null;
    is_active: boolean | null;
    next_due_date: string | null;
    last_executed_at: string | null;
    updated_at: string | null;
    machine: MachineLite | MachineLite[] | null;
};

type EnrichedPlan = MaintenancePlanRow & {
    machineResolved: MachineLite | null;
    plantResolved: PlantLite | null;
    generatedOrders: number;
};

const priorityLabel: Record<string, string> = {
    low: "Bassa",
    medium: "Media",
    high: "Alta",
    critical: "Critica",
};

const priorityClasses: Record<string, string> = {
    low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    medium: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    high: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-300",
    critical: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

function unwrapMachine(machine: MaintenancePlanRow["machine"]): MachineLite | null {
    if (!machine) return null;
    return Array.isArray(machine) ? machine[0] ?? null : machine;
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

function formatDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function isOverdue(value: string | null) {
    if (!value) return false;
    const due = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
}

function isDueSoon(value: string | null, days = 7) {
    if (!value) return false;
    const due = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + days);
    return due.getTime() >= today.getTime() && due.getTime() <= limit.getTime();
}

function getPriorityMeta(priority: string | null | undefined) {
    const normalized = String(priority ?? "medium").toLowerCase();
    return {
        label: priorityLabel[normalized] ?? normalized,
        className: priorityClasses[normalized] ?? priorityClasses.medium,
    };
}

function MetricCard({ title, value, icon: Icon, tone = "default" }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; tone?: "default" | "warning" | "danger" | "success"; }) {
    const toneClass = {
        default: "text-foreground",
        warning: "text-amber-600 dark:text-amber-300",
        danger: "text-rose-600 dark:text-rose-300",
        success: "text-emerald-600 dark:text-emerald-300",
    }[tone];

    return (
        <Card className="rounded-2xl">
            <CardContent className="flex items-center justify-between p-5">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
                </div>
                <div className={`rounded-2xl border border-border bg-muted/40 p-3 ${toneClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    );
}

export default function MaintenancePlansIndexPage() {
    const { organization, membership, loading: authLoading } = useAuth();
    const { plantLabel, plantsLabel, machineContextLabel, isManufacturer, canManageMaintenance } = useOrgType();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState < EnrichedPlan[] > ([]);
    const [machineFilter, setMachineFilter] = useState < string > ("all");
    const [priorityFilter, setPriorityFilter] = useState < string > ("all");
    const [plantFilter, setPlantFilter] = useState < string > ("all");
    const [search, setSearch] = useState("");
    const [showOverdueOnly, setShowOverdueOnly] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id) {
            setLoading(false);
            setPlans([]);
            return;
        }

        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const { data: rawPlans, error: plansError } = await supabase
                    .from("maintenance_plans")
                    .select(`
                        id,
                        machine_id,
                        title,
                        description,
                        frequency_type,
                        frequency_value,
                        estimated_duration_minutes,
                        priority,
                        is_active,
                        next_due_date,
                        last_executed_at,
                        updated_at,
                        machine:machines(id, name, internal_code, plant_id, area)
                    `)
                    .eq("organization_id", organization.id)
                    .order("next_due_date", { ascending: true })
                    .order("updated_at", { ascending: false });

                if (plansError) throw plansError;

                const planRows = ((rawPlans ?? []) as any[]).map((row) => ({
                    ...(row as MaintenancePlanRow),
                    machineResolved: unwrapMachine((row as MaintenancePlanRow).machine),
                }));

                const plantIds = Array.from(
                    new Set(planRows.map((row) => row.machineResolved?.plant_id).filter(Boolean))
                ) as string[];

                let plantMap = new Map < string, PlantLite> ();
                if (plantIds.length > 0) {
                    const { data: plantRows, error: plantsError } = await supabase
                        .from("plants")
                        .select("id, name, type:plant_type")
                        .in("id", plantIds);

                    if (plantsError) throw plantsError;
                    plantMap = new Map(((plantRows ?? []) as PlantLite[]).map((row) => [row.id, row]));
                }

                let workOrderCountMap = new Map < string, number> ();
                const planIds = planRows.map((row) => row.id);
                if (planIds.length > 0) {
                    const { data: workOrderRows, error: workOrdersError } = await supabase
                        .from("work_orders")
                        .select("maintenance_plan_id")
                        .eq("organization_id", organization.id)
                        .in("maintenance_plan_id", planIds);

                    if (workOrdersError) throw workOrdersError;

                    for (const row of (workOrderRows ?? []) as Array<{ maintenance_plan_id: string | null }>) {
                        if (!row.maintenance_plan_id) continue;
                        workOrderCountMap.set(row.maintenance_plan_id, (workOrderCountMap.get(row.maintenance_plan_id) ?? 0) + 1);
                    }
                }

                const enriched = planRows.map((row) => ({
                    ...row,
                    machineResolved: row.machineResolved,
                    plantResolved: row.machineResolved?.plant_id ? plantMap.get(row.machineResolved.plant_id) ?? null : null,
                    generatedOrders: workOrderCountMap.get(row.id) ?? 0,
                }));

                if (active) setPlans(enriched);
            } catch (error: any) {
                console.error("maintenance plans load error:", error);
                if (active) {
                    setPlans([]);
                    toast({
                        title: "Errore caricamento piani",
                        description: error?.message || "Impossibile leggere i piani di manutenzione.",
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
    }, [authLoading, organization?.id, toast]);

    const plantOptions = useMemo(() => {
        const map = new Map < string, string> ();
        for (const plan of plans) {
            if (plan.plantResolved?.id) {
                map.set(plan.plantResolved.id, plan.plantResolved.name || "Senza nome");
            }
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "it"));
    }, [plans]);

    const machineOptions = useMemo(() => {
        return plans
            .map((plan) => plan.machineResolved)
            .filter(Boolean)
            .reduce < Array < { id: string; label: string } >> ((acc, machine) => {
                if (!machine) return acc;
                if (acc.some((item) => item.id === machine.id)) return acc;
                acc.push({
                    id: machine.id,
                    label: machine.internal_code ? `${machine.name ?? "Macchina"} · ${machine.internal_code}` : machine.name ?? "Macchina",
                });
                return acc;
            }, [])
                .sort((a, b) => a.label.localeCompare(b.label, "it"));
    }, [plans]);

    const filteredPlans = useMemo(() => {
        const term = search.trim().toLowerCase();

        return plans.filter((plan) => {
            const machine = plan.machineResolved;
            const plant = plan.plantResolved;
            const matchesSearch =
                !term ||
                plan.title.toLowerCase().includes(term) ||
                (plan.description ?? "").toLowerCase().includes(term) ||
                (machine?.name ?? "").toLowerCase().includes(term) ||
                (machine?.internal_code ?? "").toLowerCase().includes(term) ||
                (plant?.name ?? "").toLowerCase().includes(term);

            const matchesMachine = machineFilter === "all" || plan.machine_id === machineFilter;
            const matchesPriority = priorityFilter === "all" || String(plan.priority ?? "medium").toLowerCase() === priorityFilter;
            const matchesPlant = plantFilter === "all" || plan.plantResolved?.id === plantFilter;
            const matchesOverdue = !showOverdueOnly || isOverdue(plan.next_due_date);

            return matchesSearch && matchesMachine && matchesPriority && matchesPlant && matchesOverdue;
        });
    }, [machineFilter, plantFilter, plans, priorityFilter, search, showOverdueOnly]);

    const stats = useMemo(() => {
        return {
            total: plans.length,
            active: plans.filter((plan) => plan.is_active !== false).length,
            overdue: plans.filter((plan) => isOverdue(plan.next_due_date) && plan.is_active !== false).length,
            dueSoon: plans.filter((plan) => isDueSoon(plan.next_due_date) && plan.is_active !== false).length,
        };
    }, [plans]);

    const role = membership?.role ?? "technician";
    const isManager = ["admin", "supervisor"].includes(role);

    return (
        <OrgContextGuard>
            <MainLayout>
                <SEO title="Piani di manutenzione - MACHINA" />
                <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                                <Settings2 className="h-3.5 w-3.5" />
                                {isManufacturer ? "Piani per macchine vendute" : "Piani di manutenzione interni"}
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Piani di manutenzione</h1>
                                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                                    {isManufacturer
                                        ? "Definisci la manutenzione raccomandata per le macchine consegnate ai clienti e genera ordini di lavoro precompilati."
                                        : "Programma la manutenzione preventiva delle macchine dei tuoi stabilimenti e trasforma i piani in ordini di lavoro quando serve."}
                                </p>
                            </div>
                        </div>

                        {canManageMaintenance && isManager && (
                            <div className="flex flex-wrap items-center gap-3">
                                <Button asChild>
                                    <Link href="/maintenance/new">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nuovo piano
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard title="Totale piani" value={stats.total} icon={Wrench} />
                        <MetricCard title="Piani attivi" value={stats.active} icon={CheckCircle2} tone="success" />
                        <MetricCard title="Scaduti" value={stats.overdue} icon={AlertTriangle} tone="danger" />
                        <MetricCard title="In scadenza 7 giorni" value={stats.dueSoon} icon={Clock3} tone="warning" />
                    </div>

                    <Card className="mt-6 rounded-2xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Filtri</CardTitle>
                            <CardDescription>
                                Cerca per titolo, {plantLabel.toLowerCase()}, macchina o codice interno
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <div className="xl:col-span-2">
                                <Label htmlFor="maintenance-search">Cerca piano o macchina</Label>
                                <div className="relative mt-2">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="maintenance-search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Titolo, macchina, codice, cliente/stabilimento"
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>{machineContextLabel}</Label>
                                <Select value={machineFilter} onValueChange={setMachineFilter}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Tutte le macchine" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutte le macchine</SelectItem>
                                        {machineOptions.map((machine) => (
                                            <SelectItem key={machine.id} value={machine.id}>
                                                {machine.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Priorità</Label>
                                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Tutte le priorità" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutte</SelectItem>
                                        <SelectItem value="low">Bassa</SelectItem>
                                        <SelectItem value="medium">Media</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="critical">Critica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>{plantsLabel}</Label>
                                <Select value={plantFilter} onValueChange={setPlantFilter}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder={`Tutti i ${plantsLabel.toLowerCase()}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutti</SelectItem>
                                        {plantOptions.map((plant) => (
                                            <SelectItem key={plant.id} value={plant.id}>
                                                {plant.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="md:col-span-2 xl:col-span-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Filter className="h-4 w-4" />
                                    {filteredPlans.length} piani visibili
                                </div>
                                <button
                                    type="button"
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${showOverdueOnly ? "bg-rose-500 text-white" : "border border-border bg-card text-foreground hover:bg-muted"}`}
                                    onClick={() => setShowOverdueOnly((value) => !value)}
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    Solo scaduti
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-6 grid gap-4">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, index) => (
                                <Card key={index} className="rounded-2xl border-border/70">
                                    <CardContent className="p-6">
                                        <div className="animate-pulse space-y-3">
                                            <div className="h-5 w-1/3 rounded bg-muted" />
                                            <div className="h-4 w-1/2 rounded bg-muted" />
                                            <div className="h-4 w-2/3 rounded bg-muted" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : filteredPlans.length === 0 ? (
                            <Card className="rounded-2xl border-dashed">
                                <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                                    <div className="rounded-full border border-border bg-muted/30 p-3">
                                        <Wrench className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Nessun piano trovato</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {plans.length === 0
                                                ? "Non ci sono ancora piani di manutenzione per questa organizzazione."
                                                : "Modifica i filtri o la ricerca per vedere altri risultati."}
                                        </p>
                                    </div>
                                    {canManageMaintenance && isManager && plans.length === 0 && (
                                        <Button asChild>
                                            <Link href="/maintenance/new">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Crea il primo piano
                                            </Link>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            filteredPlans.map((plan) => {
                                const machine = plan.machineResolved;
                                const plant = plan.plantResolved;
                                const priorityMeta = getPriorityMeta(plan.priority);
                                const overdue = isOverdue(plan.next_due_date);
                                const dueSoon = isDueSoon(plan.next_due_date);

                                return (
                                    <Card key={plan.id} className="rounded-2xl border-border/70">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col gap-5">
                                                <div className="min-w-0 space-y-4">
                                                    <div className="flex flex-wrap items-start gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h2 className="text-lg font-semibold text-foreground">{plan.title}</h2>
                                                                <Badge className={priorityMeta.className}>{priorityMeta.label}</Badge>
                                                                <Badge variant="outline" className={plan.is_active === false ? "text-muted-foreground" : "text-foreground"}>
                                                                    {plan.is_active === false ? "Inattivo" : "Attivo"}
                                                                </Badge>
                                                                {overdue && <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">Scaduto</Badge>}
                                                                {!overdue && dueSoon && <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300">In scadenza</Badge>}
                                                            </div>
                                                            {plan.description && <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>}
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                        <div className="rounded-2xl border border-border bg-muted/20 p-3">
                                                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{machineContextLabel}</p>
                                                            <p className="mt-1 text-sm font-medium text-foreground">{machine?.name ?? "Template generico"}</p>
                                                            <p className="text-xs text-muted-foreground">{machine?.internal_code || "Senza codice"}</p>
                                                        </div>
                                                        <div className="rounded-2xl border border-border bg-muted/20 p-3">
                                                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{plantLabel}</p>
                                                            <p className="mt-1 text-sm font-medium text-foreground">{plant?.name ?? "Non assegnato"}</p>
                                                            <p className="text-xs text-muted-foreground">{machine?.area || "—"}</p>
                                                        </div>
                                                        <div className="rounded-2xl border border-border bg-muted/20 p-3">
                                                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Frequenza</p>
                                                            <p className="mt-1 text-sm font-medium text-foreground">{formatFrequency(plan.frequency_value, plan.frequency_type)}</p>
                                                            <p className="text-xs text-muted-foreground">Durata stimata: {plan.estimated_duration_minutes ? `${plan.estimated_duration_minutes} min` : "—"}</p>
                                                        </div>
                                                        <div className="rounded-2xl border border-border bg-muted/20 p-3">
                                                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prossima scadenza</p>
                                                            <p className="mt-1 text-sm font-medium text-foreground">{formatDate(plan.next_due_date)}</p>
                                                            <p className="text-xs text-muted-foreground">Ordini generati: {plan.generatedOrders}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-3">
                                                    <Button asChild variant="outline" className="justify-between min-w-0">
                                                        <Link href={`/maintenance/${plan.id}`}>
                                                            Apri dettaglio
                                                            <ArrowRight className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button asChild className="min-w-0">
                                                        <Link href={`/work-orders/create?plan_id=${plan.id}`} className="min-w-0">
                                                            <CalendarDays className="mr-2 h-4 w-4" />
                                                            Genera ordine di lavoro
                                                        </Link>
                                                    </Button>
                                                    {canManageMaintenance && isManager && (
                                                        <Button asChild variant="ghost" className="justify-between min-w-0">
                                                            <Link href={`/maintenance/edit/${plan.id}`}>
                                                                Modifica piano
                                                                <ArrowRight className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

