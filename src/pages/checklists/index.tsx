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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, ClipboardCheck, Filter, Plus, Search, Wrench } from "lucide-react";

type ChecklistRow = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    checklist_type: string | null;
    is_template: boolean | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
    created_by: string | null;
};

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
};

type ExecutionLite = {
    id: string;
    checklist_id: string;
    executed_at: string | null;
    completed_at: string | null;
    overall_status: string | null;
    work_order_id: string | null;
    machine_id: string | null;
};

type ItemLite = { id: string; checklist_id: string };

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

function typeLabel(value: string | null | undefined) {
    switch (String(value ?? "inspection").toLowerCase()) {
        case "startup":
            return "Avvio";
        case "shutdown":
            return "Arresto";
        case "safety":
            return "Sicurezza";
        case "quality":
            return "Qualità";
        case "custom":
            return "Personalizzata";
        default:
            return "Ispezione";
    }
}

function statusLabel(value: string | null | undefined) {
    switch (String(value ?? "pending").toLowerCase()) {
        case "passed":
            return "Superata";
        case "failed":
            return "Fallita";
        case "partial":
            return "Parziale";
        default:
            return "In sospeso";
    }
}

function statusBadgeClass(value: string | null | undefined) {
    switch (String(value ?? "pending").toLowerCase()) {
        case "passed":
            return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
        case "failed":
            return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
        case "partial":
            return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        default:
            return "border-border bg-muted text-muted-foreground";
    }
}

function countByType(rows: ChecklistRow[], kind: string) {
    return rows.filter((row) => String(row.checklist_type ?? "inspection").toLowerCase() === kind).length;
}

export default function ChecklistsIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();
    const { toast } = useToast();
    const { isManufacturer, plantLabel, plantsLabel, checklistsLabel, canExecuteChecklist } = useOrgType();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < ChecklistRow[] > ([]);
    const [machines, setMachines] = useState < Record < string, MachineLite>> ({});
    const [plants, setPlants] = useState < Record < string, PlantLite>> ({});
    const [itemsByChecklist, setItemsByChecklist] = useState < Record < string, number>> ({});
    const [latestExecutionByChecklist, setLatestExecutionByChecklist] = useState < Record < string, ExecutionLite>> ({});
    const [monthExecutions, setMonthExecutions] = useState < ExecutionLite[] > ([]);

    const [search, setSearch] = useState("");
    const [machineFilter, setMachineFilter] = useState < string > ("all");
    const [typeFilter, setTypeFilter] = useState < string > ("all");
    const [activeFilter, setActiveFilter] = useState < string > ("active");
    const [plantFilter, setPlantFilter] = useState < string > ("all");

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id) {
            setLoading(false);
            setRows([]);
            return;
        }

        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const { data: checklistRows, error: checklistError } = await supabase
                    .from("checklists")
                    .select("id, organization_id, machine_id, title, description, checklist_type, is_template, is_active, created_at, updated_at, created_by")
                    .eq("organization_id", organization.id)
                    .order("updated_at", { ascending: false });
                if (checklistError) throw checklistError;

                const checklistList = (checklistRows ?? []) as ChecklistRow[];
                const machineIds = Array.from(new Set(checklistList.map((row) => row.machine_id).filter(Boolean))) as string[];
                const checklistIds = checklistList.map((row) => row.id);

                let machineMap: Record<string, MachineLite> = {};
                let plantMap: Record<string, PlantLite> = {};
                let itemCountMap: Record<string, number> = {};
                let executionMap: Record<string, ExecutionLite> = {};
                let monthRows: ExecutionLite[] = [];

                if (machineIds.length > 0) {
                    const { data: machineRows, error: machineError } = await supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id, area")
                        .in("id", machineIds);
                    if (machineError) throw machineError;
                    machineMap = Object.fromEntries(((machineRows ?? []) as MachineLite[]).map((row) => [row.id, row]));

                    const plantIds = Array.from(new Set(Object.values(machineMap).map((row) => row.plant_id).filter(Boolean))) as string[];
                    if (plantIds.length > 0) {
                        const { data: plantRows, error: plantError } = await supabase
                            .from("plants")
                            .select("id, name")
                            .in("id", plantIds);
                        if (plantError) throw plantError;
                        plantMap = Object.fromEntries(((plantRows ?? []) as PlantLite[]).map((row) => [row.id, row]));
                    }
                }

                if (checklistIds.length > 0) {
                    const { data: itemRows, error: itemError } = await supabase
                        .from("checklist_items")
                        .select("id, checklist_id")
                        .in("checklist_id", checklistIds);
                    if (itemError) throw itemError;
                    itemCountMap = ((itemRows ?? []) as ItemLite[]).reduce < Record < string, number >> ((acc, row) => {
                        acc[row.checklist_id] = (acc[row.checklist_id] ?? 0) + 1;
                        return acc;
                    }, {});

                    const monthStart = new Date();
                    monthStart.setDate(1);
                    monthStart.setHours(0, 0, 0, 0);
                    const { data: executionRows, error: executionError } = await supabase
                        .from("checklist_executions")
                        .select("id, checklist_id, executed_at, completed_at, overall_status, work_order_id, machine_id")
                        .in("checklist_id", checklistIds)
                        .order("executed_at", { ascending: false });
                    if (executionError) throw executionError;
                    const executionList = (executionRows ?? []) as ExecutionLite[];
                    for (const row of executionList) {
                        if (!executionMap[row.checklist_id]) executionMap[row.checklist_id] = row;
                    }
                    monthRows = executionList.filter((row) => {
                        const value = row.executed_at ?? row.completed_at;
                        if (!value) return false;
                        const date = new Date(value);
                        return !Number.isNaN(date.getTime()) && date >= monthStart;
                    });
                }

                if (!active) return;
                setRows(checklistList);
                setMachines(machineMap);
                setPlants(plantMap);
                setItemsByChecklist(itemCountMap);
                setLatestExecutionByChecklist(executionMap);
                setMonthExecutions(monthRows);
            } catch (error: any) {
                console.error("Checklists index load error:", error);
                if (active) {
                    setRows([]);
                    toast({
                        title: "Errore caricamento checklist",
                        description: error?.message ?? "Impossibile caricare le checklist.",
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

    const machineOptions = useMemo(() => {
        return rows
            .filter((row) => row.machine_id && machines[row.machine_id])
            .map((row) => {
                const machine = row.machine_id ? machines[row.machine_id] : null;
                const plant = machine?.plant_id ? plants[machine.plant_id] : null;
                return {
                    id: row.machine_id as string,
                    label: `${plant?.name ?? plantLabel} → ${machine?.name ?? "Macchina"}`,
                };
            })
            .filter((value, index, array) => array.findIndex((item) => item.id === value.id) === index)
            .sort((a, b) => a.label.localeCompare(b.label, "it"));
    }, [machines, plantLabel, plants, rows]);

    const plantOptions = useMemo(() => {
        return Object.values(plants)
            .map((row) => ({ id: row.id, label: row.name ?? plantLabel }))
            .sort((a, b) => a.label.localeCompare(b.label, "it"));
    }, [plantLabel, plants]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            const machine = row.machine_id ? machines[row.machine_id] : null;
            const plant = machine?.plant_id ? plants[machine.plant_id] : null;
            const matchesSearch =
                !q ||
                row.title.toLowerCase().includes(q) ||
                (row.description ?? "").toLowerCase().includes(q) ||
                (machine?.name ?? "").toLowerCase().includes(q) ||
                (plant?.name ?? "").toLowerCase().includes(q);
            const matchesMachine = machineFilter === "all" || row.machine_id === machineFilter;
            const normalizedType = String(row.checklist_type ?? "inspection").toLowerCase();
            const matchesType = typeFilter === "all" || normalizedType === typeFilter;
            const matchesActive =
                activeFilter === "all" ||
                (activeFilter === "active" ? Boolean(row.is_active) : !Boolean(row.is_active));
            const matchesPlant =
                plantFilter === "all" ||
                (machine?.plant_id ? machine.plant_id === plantFilter : false);
            return matchesSearch && matchesMachine && matchesType && matchesActive && matchesPlant;
        });
    }, [activeFilter, machineFilter, machines, plantFilter, plants, rows, search, typeFilter]);

    const stats = useMemo(() => {
        return {
            total: rows.length,
            inspection: countByType(rows, "inspection"),
            active: rows.filter((row) => row.is_active !== false).length,
            executionsThisMonth: monthExecutions.length,
        };
    }, [monthExecutions.length, rows]);

    const groupedByPlant = useMemo(() => {
        if (!isManufacturer) return [] as Array<{ key: string; label: string; rows: ChecklistRow[] }>;
        const groups = new Map < string, { key: string; label: string; rows: ChecklistRow[]
    }> ();
    for (const row of filteredRows) {
        const machine = row.machine_id ? machines[row.machine_id] : null;
        const plant = machine?.plant_id ? plants[machine.plant_id] : null;
        const key = plant?.id ?? "unassigned";
        const label = plant?.name ?? "Senza cliente";
        if (!groups.has(key)) groups.set(key, { key, label, rows: [] });
        groups.get(key)!.rows.push(row);
    }
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label, "it"));
}, [filteredRows, isManufacturer, machines, plants]);

const pageTitle = isManufacturer ? "Template checklist per clienti" : "Checklist";
const pageDescription = isManufacturer
    ? "Crea template checklist per le macchine vendute, raggruppati per cliente e con storico esecuzioni in sola lettura."
    : "Crea template checklist, monitora le esecuzioni e avvia rapidamente la compilazione sul campo.";

const renderChecklistCard = (row: ChecklistRow) => {
    const machine = row.machine_id ? machines[row.machine_id] : null;
    const plant = machine?.plant_id ? plants[machine.plant_id] : null;
    const latestExecution = latestExecutionByChecklist[row.id];
    const itemCount = itemsByChecklist[row.id] ?? 0;
    return (
        <Card key={row.id} className="rounded-2xl">
            <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-border bg-muted text-muted-foreground">{typeLabel(row.checklist_type)}</Badge>
                            <Badge variant="outline" className={row.is_active !== false ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border bg-muted text-muted-foreground"}>
                                {row.is_active !== false ? "Attiva" : "Disattivata"}
                            </Badge>
                            {row.is_template ? (
                                <Badge variant="outline" className="border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">Template</Badge>
                            ) : null}
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-foreground">{row.title}</div>
                            {row.description ? <div className="mt-1 text-sm text-muted-foreground">{row.description}</div> : null}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Link href={`/checklists/${row.id}`}>
                            <Button variant="outline">Dettaglio</Button>
                        </Link>
                        {canExecuteChecklist ? (
                            <Link href={`/checklists/execute/${row.id}${row.machine_id ? `?machine_id=${row.machine_id}` : ""}`}>
                                <Button>Esegui</Button>
                            </Link>
                        ) : null}
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InfoBlock label={"Macchina"} value={machine ? `${machine.name ?? "Macchina"}${machine.internal_code ? ` · ${machine.internal_code}` : ""}` : "Template generico"} />
                    <InfoBlock label={plantLabel} value={plant?.name ?? "—"} />
                    <InfoBlock label={"Punti controllo"} value={String(itemCount)} />
                    <InfoBlock label={"Ultima esecuzione"} value={formatDate(latestExecution?.completed_at ?? latestExecution?.executed_at ?? null)} />
                </div>

                {latestExecution ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/25 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Stato ultima esecuzione:</span>
                        <Badge variant="outline" className={statusBadgeClass(latestExecution.overall_status)}>
                            {statusLabel(latestExecution.overall_status)}
                        </Badge>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
};

return (
    <OrgContextGuard>
        <MainLayout userRole={membership?.role ?? "technician"}>
            <SEO title={`${pageTitle} - MACHINA`} />
            <div className="px-5 py-6 lg:px-8 lg:py-8">
                <div className="mx-auto max-w-[1440px] space-y-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{pageTitle}</h1>
                            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{pageDescription}</p>
                        </div>
                        <Link href="/checklists/new">
                            <Button className="rounded-2xl">
                                <Plus className="mr-2 h-4 w-4" />
                                Nuova checklist
                            </Button>
                        </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard title={isManufacturer ? "Template totali" : "Checklist totali"} value={stats.total} icon={CheckSquare} />
                        <MetricCard title="Attive" value={stats.active} icon={ClipboardCheck} tone="success" />
                        <MetricCard title="Ispezioni" value={stats.inspection} icon={Filter} />
                        <MetricCard title="Esecuzioni mese" value={stats.executionsThisMonth} icon={Wrench} tone="warning" />
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Filtri</CardTitle>
                            <CardDescription>Affina la lista per macchina, tipo e stato.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <div className="space-y-2 xl:col-span-2">
                                <Label htmlFor="checklist-search">Cerca</Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input id="checklist-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Titolo, descrizione, macchina..." className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Macchina</Label>
                                <Select value={machineFilter} onValueChange={setMachineFilter}>
                                    <SelectTrigger><SelectValue placeholder="Tutte" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutte</SelectItem>
                                        {machineOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger><SelectValue placeholder="Tutti" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutti</SelectItem>
                                        <SelectItem value="inspection">Ispezione</SelectItem>
                                        <SelectItem value="startup">Avvio</SelectItem>
                                        <SelectItem value="shutdown">Arresto</SelectItem>
                                        <SelectItem value="safety">Sicurezza</SelectItem>
                                        <SelectItem value="quality">Qualità</SelectItem>
                                        <SelectItem value="custom">Personalizzata</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Stato</Label>
                                <Select value={activeFilter} onValueChange={setActiveFilter}>
                                    <SelectTrigger><SelectValue placeholder="Attive" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Attive</SelectItem>
                                        <SelectItem value="inactive">Disattivate</SelectItem>
                                        <SelectItem value="all">Tutte</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {isManufacturer ? (
                                <div className="space-y-2 xl:col-span-2">
                                    <Label>{plantsLabel}</Label>
                                    <Select value={plantFilter} onValueChange={setPlantFilter}>
                                        <SelectTrigger><SelectValue placeholder={`Tutti i ${plantsLabel.toLowerCase()}`} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tutti i {plantsLabel.toLowerCase()}</SelectItem>
                                            {plantOptions.map((option) => (
                                                <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    {loading ? (
                        <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Caricamento checklist in corso...</CardContent></Card>
                    ) : filteredRows.length === 0 ? (
                        <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Nessuna checklist trovata con i filtri attivi.</CardContent></Card>
                    ) : isManufacturer ? (
                        <div className="space-y-6">
                            {groupedByPlant.map((group) => (
                                <section key={group.key} className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <h2 className="text-lg font-semibold text-foreground">{group.label}</h2>
                                        <Badge variant="outline">{group.rows.length}</Badge>
                                    </div>
                                    <div className="grid gap-4 xl:grid-cols-2">{group.rows.map(renderChecklistCard)}</div>
                                </section>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-4 xl:grid-cols-2">{filteredRows.map(renderChecklistCard)}</div>
                    )}
                </div>
            </div>
        </MainLayout>
    </OrgContextGuard>
);
}

function MetricCard({ title, value, icon: Icon, tone = "default" }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; tone?: "default" | "warning" | "success"; }) {
    const toneClass = tone === "warning" ? "text-amber-700 dark:text-amber-300" : tone === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-foreground";
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

function InfoBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border bg-muted/20 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{value || "—"}</div>
        </div>
    );
}

