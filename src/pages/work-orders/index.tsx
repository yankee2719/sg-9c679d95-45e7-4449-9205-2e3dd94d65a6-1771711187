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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock3,
    Plus,
    Search,
    User,
    Wrench,
} from "lucide-react";

type WorkOrderStatus = "draft" | "scheduled" | "in_progress" | "pending_review" | "completed" | "cancelled" | string;
type WorkOrderPriority = "low" | "medium" | "high" | "critical" | string;
type WorkType = "preventive" | "corrective" | "predictive" | "inspection" | "emergency" | string;

type WorkOrderRow = {
    id: string;
    title: string;
    description: string | null;
    work_type: WorkType;
    priority: WorkOrderPriority | null;
    status: WorkOrderStatus | null;
    scheduled_date: string | null;
    due_date: string | null;
    assigned_to: string | null;
    machine_id: string;
    plant_id: string;
    maintenance_plan_id: string | null;
    created_at: string | null;
    updated_at: string | null;
    machine: {
        id: string;
        name: string | null;
        internal_code: string | null;
        area: string | null;
    } | { id: string; name: string | null; internal_code: string | null; area: string | null }[] | null;
    plant: {
        id: string;
        name: string | null;
        type: string | null;
    } | { id: string; name: string | null; type: string | null }[] | null;
};

type ProfileLite = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
};

const STATUS_COLUMNS: Array<{ key: WorkOrderStatus; label: string }> = [
    { key: "draft", label: "Bozza" },
    { key: "scheduled", label: "Pianificati" },
    { key: "in_progress", label: "In corso" },
    { key: "pending_review", label: "In revisione" },
    { key: "completed", label: "Completati" },
];

const PRIORITY_LABELS: Record<string, string> = {
    low: "Bassa",
    medium: "Media",
    high: "Alta",
    critical: "Critica",
};

const PRIORITY_CLASSES: Record<string, string> = {
    low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    medium: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    high: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    critical: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const STATUS_LABELS: Record<string, string> = {
    draft: "Bozza",
    scheduled: "Pianificato",
    in_progress: "In corso",
    pending_review: "In revisione",
    completed: "Completato",
    cancelled: "Annullato",
};

const STATUS_CLASSES: Record<string, string> = {
    draft: "border-border bg-muted text-muted-foreground",
    scheduled: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    in_progress: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    pending_review: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    cancelled: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
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

function isClosedStatus(status: string | null | undefined) {
    const key = String(status ?? "").toLowerCase();
    return key === "completed" || key === "cancelled";
}

function isLate(row: WorkOrderRow) {
    if (!row.due_date || isClosedStatus(row.status)) return false;
    const due = new Date(`${row.due_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
}

function formatAssignee(profile: ProfileLite | null | undefined) {
    if (!profile) return "Non assegnato";
    const display = profile.display_name?.trim();
    if (display) return display;
    const fallback = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    return fallback || profile.email || "Utente";
}

function MetricCard({
    title,
    value,
    icon: Icon,
    tone = "default",
}: {
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    tone?: "default" | "warning" | "danger" | "success";
}) {
    const toneClass = {
        default: "text-foreground",
        warning: "text-amber-700 dark:text-amber-300",
        danger: "text-rose-700 dark:text-rose-300",
        success: "text-emerald-700 dark:text-emerald-300",
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

export default function WorkOrdersIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();
    const { plantLabel, plantsLabel, isManufacturer, canExecuteChecklist } = useOrgType();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < WorkOrderRow[] > ([]);
    const [profiles, setProfiles] = useState < Record < string, ProfileLite>> ({});
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState < string > ("all");
    const [machineFilter, setMachineFilter] = useState < string > ("all");
    const [assignedFilter, setAssignedFilter] = useState < string > ("all");
    const [priorityFilter, setPriorityFilter] = useState < string > ("all");
    const [viewMode, setViewMode] = useState < "kanban" | "list" > ("kanban");

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
                const { data, error } = await supabase
                    .from("work_orders")
                    .select(`
                        id,
                        title,
                        description,
                        work_type,
                        priority,
                        status,
                        scheduled_date,
                        due_date,
                        assigned_to,
                        machine_id,
                        plant_id,
                        maintenance_plan_id,
                        created_at,
                        updated_at,
                        machine:machines(id, name, internal_code, area),
                        plant:plants(id, name, type)
                    `)
                    .eq("organization_id", organization.id)
                    .order("scheduled_date", { ascending: true })
                    .order("due_date", { ascending: true })
                    .order("created_at", { ascending: false });

                if (error) throw error;

                const orderRows = (data ?? []) as WorkOrderRow[];
                const assigneeIds = Array.from(new Set(orderRows.map((row) => row.assigned_to).filter(Boolean))) as string[];

                let profileMap: Record<string, ProfileLite> = {};
                if (assigneeIds.length > 0) {
                    const { data: profileRows, error: profilesError } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .in("id", assigneeIds);

                    if (profilesError) throw profilesError;
                    profileMap = Object.fromEntries(((profileRows ?? []) as ProfileLite[]).map((row) => [row.id, row]));
                }

                if (active) {
                    setRows(orderRows);
                    setProfiles(profileMap);
                }
            } catch (error: any) {
                console.error("work orders load error:", error);
                toast({
                    title: "Errore caricamento ordini",
                    description: error?.message || "Impossibile caricare gli ordini di lavoro.",
                    variant: "destructive",
                });
                if (active) {
                    setRows([]);
                    setProfiles({});
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
        const map = new Map < string, string> ();
        rows.forEach((row) => {
            const machine = unwrapRelation(row.machine);
            if (!machine) return;
            map.set(row.machine_id, machine.internal_code?.trim() ? `${machine.internal_code} · ${machine.name ?? "Macchina"}` : machine.name ?? "Macchina");
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "it"));
    }, [rows]);

    const assigneeOptions = useMemo(() => {
        const map = new Map < string, string> ();
        rows.forEach((row) => {
            if (!row.assigned_to) return;
            map.set(row.assigned_to, formatAssignee(profiles[row.assigned_to]));
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "it"));
    }, [profiles, rows]);

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return rows.filter((row) => {
            const machine = unwrapRelation(row.machine);
            const plant = unwrapRelation(row.plant);
            const assigneeLabel = row.assigned_to ? formatAssignee(profiles[row.assigned_to]) : "";

            const matchesSearch = !query || [
                row.title,
                row.description,
                row.work_type,
                machine?.name,
                machine?.internal_code,
                machine?.area,
                plant?.name,
                assigneeLabel,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));

            const matchesStatus = statusFilter === "all" || row.status === statusFilter;
            const matchesMachine = machineFilter === "all" || row.machine_id === machineFilter;
            const matchesAssigned = assignedFilter === "all" || row.assigned_to === assignedFilter;
            const matchesPriority = priorityFilter === "all" || row.priority === priorityFilter;

            return matchesSearch && matchesStatus && matchesMachine && matchesAssigned && matchesPriority;
        });
    }, [assignedFilter, machineFilter, priorityFilter, profiles, rows, search, statusFilter]);

    const stats = useMemo(() => ({
        total: rows.length,
        open: rows.filter((row) => !isClosedStatus(row.status)).length,
        late: rows.filter((row) => isLate(row)).length,
        completedThisWeek: rows.filter((row) => {
            if (row.status !== "completed" || !row.updated_at) return false;
            const updated = new Date(row.updated_at).getTime();
            return Date.now() - updated <= 7 * 86400000;
        }).length,
    }), [rows]);

    const groupedByStatus = useMemo(() => {
        return STATUS_COLUMNS.map((column) => ({
            ...column,
            rows: filteredRows.filter((row) => row.status === column.key),
        }));
    }, [filteredRows]);

    const userRole = membership?.role ?? "viewer";
    const canCreate = ["owner", "admin", "supervisor"].includes(userRole);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Ordini di lavoro - MACHINA" />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Ordini di lavoro</h1>
                            <p className="max-w-3xl text-sm text-muted-foreground">
                                {isManufacturer
                                    ? `Monitora e programma gli ordini per le macchine vendute ai tuoi ${plantsLabel.toLowerCase()}.`
                                    : "Gestisci gli ordini di lavoro interni, assegnali ai tecnici e controlla l'avanzamento delle attività."}
                            </p>
                        </div>

                        {canCreate && (
                            <Link href="/work-orders/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nuovo ordine di lavoro
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard title="Totale ordini" value={stats.total} icon={ClipboardList} />
                        <MetricCard title="Aperti" value={stats.open} icon={Wrench} />
                        <MetricCard title="In ritardo" value={stats.late} icon={AlertTriangle} tone="danger" />
                        <MetricCard title="Completati 7 giorni" value={stats.completedThisWeek} icon={CheckCircle2} tone="success" />
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-base">Filtri e vista</CardTitle>
                            <CardDescription>
                                Filtra per stato, macchina, assegnatario e priorità. La vista Kanban è comoda per il flusso operativo, la lista per il controllo rapido.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid gap-4 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
                                <div className="space-y-2 lg:col-span-1">
                                    <Label htmlFor="wo-search">Cerca</Label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="wo-search"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Titolo, macchina, area, assegnatario..."
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Stato</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tutti" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tutti</SelectItem>
                                            {STATUS_COLUMNS.map((status) => (
                                                <SelectItem key={status.key} value={status.key}>
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="cancelled">Annullati</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Macchina</Label>
                                    <Select value={machineFilter} onValueChange={setMachineFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tutte" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tutte</SelectItem>
                                            {machineOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Assegnatario</Label>
                                    <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tutti" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tutti</SelectItem>
                                            {assigneeOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Priorità</Label>
                                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tutte" />
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
                            </div>

                            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "kanban" | "list")}>
                                <TabsList>
                                    <TabsTrigger value="kanban">Kanban</TabsTrigger>
                                    <TabsTrigger value="list">Lista</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {loading ? (
                        <Card className="rounded-2xl">
                            <CardContent className="p-6 text-sm text-muted-foreground">Caricamento ordini di lavoro...</CardContent>
                        </Card>
                    ) : filteredRows.length === 0 ? (
                        <Card className="rounded-2xl border-dashed">
                            <CardContent className="flex flex-col items-start gap-3 p-8 text-sm text-muted-foreground">
                                <ClipboardList className="h-8 w-8 text-muted-foreground" />
                                <div>
                                    <div className="font-medium text-foreground">Nessun ordine trovato</div>
                                    <div>Prova a cambiare filtri oppure crea un nuovo ordine di lavoro.</div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : viewMode === "kanban" ? (
                        <div className="grid gap-4 xl:grid-cols-5">
                            {groupedByStatus.map((column) => (
                                <div key={column.key} className="rounded-2xl border border-border bg-card/70 p-3">
                                    <div className="mb-3 flex items-center justify-between gap-2 px-1">
                                        <div>
                                            <div className="text-sm font-semibold text-foreground">{column.label}</div>
                                            <div className="text-xs text-muted-foreground">{column.rows.length} ordini</div>
                                        </div>
                                        <Badge variant="outline">{column.rows.length}</Badge>
                                    </div>
                                    <div className="space-y-3">
                                        {column.rows.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                                                Nessun ordine in questa colonna.
                                            </div>
                                        ) : (
                                            column.rows.map((row) => {
                                                const machine = unwrapRelation(row.machine);
                                                const plant = unwrapRelation(row.plant);
                                                const priorityKey = String(row.priority ?? "medium").toLowerCase();
                                                const assignee = row.assigned_to ? formatAssignee(profiles[row.assigned_to]) : "Non assegnato";
                                                return (
                                                    <Link key={row.id} href={`/work-orders/${row.id}`} className="block rounded-2xl border border-border bg-background p-4 transition hover:border-primary/30 hover:shadow-sm">
                                                        <div className="space-y-3">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-sm font-semibold text-foreground">{row.title}</div>
                                                                    <div className="mt-1 text-xs text-muted-foreground">{machine?.name ?? "Macchina"}</div>
                                                                </div>
                                                                <Badge className={PRIORITY_CLASSES[priorityKey] ?? PRIORITY_CLASSES.medium} variant="outline">
                                                                    {PRIORITY_LABELS[priorityKey] ?? priorityKey}
                                                                </Badge>
                                                            </div>
                                                            <div className="space-y-2 text-xs text-muted-foreground">
                                                                <div className="flex items-center gap-2">
                                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                                    <span>Scadenza {formatDate(row.due_date)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <User className="h-3.5 w-3.5" />
                                                                    <span className="truncate">{assignee}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Clock3 className="h-3.5 w-3.5" />
                                                                    <span>{isManufacturer ? `${plantLabel}: ${plant?.name ?? "—"}` : `${plant?.name ?? "—"}${machine?.area ? ` · ${machine.area}` : ""}`}</span>
                                                                </div>
                                                            </div>
                                                            {isLate(row) && (
                                                                <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                                                                    In ritardo
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </Link>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredRows.map((row) => {
                                const machine = unwrapRelation(row.machine);
                                const plant = unwrapRelation(row.plant);
                                const priorityKey = String(row.priority ?? "medium").toLowerCase();
                                const statusKey = String(row.status ?? "draft").toLowerCase();
                                const assignee = row.assigned_to ? formatAssignee(profiles[row.assigned_to]) : "Non assegnato";
                                return (
                                    <Link key={row.id} href={`/work-orders/${row.id}`}>
                                        <Card className="rounded-2xl transition hover:border-primary/30 hover:shadow-sm">
                                            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="min-w-0 space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="text-base font-semibold text-foreground">{row.title}</div>
                                                        <Badge variant="outline" className={STATUS_CLASSES[statusKey] ?? STATUS_CLASSES.draft}>{STATUS_LABELS[statusKey] ?? statusKey}</Badge>
                                                        <Badge variant="outline" className={PRIORITY_CLASSES[priorityKey] ?? PRIORITY_CLASSES.medium}>{PRIORITY_LABELS[priorityKey] ?? priorityKey}</Badge>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {machine?.internal_code?.trim() ? `${machine.internal_code} · ` : ""}{machine?.name ?? "Macchina"}
                                                        {plant?.name ? ` · ${plantLabel} ${plant.name}` : ""}
                                                        {!isManufacturer && machine?.area ? ` · ${machine.area}` : ""}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                                                        <span>Tipo: {row.work_type || "preventive"}</span>
                                                        <span>Assegnato a: {assignee}</span>
                                                        <span>Scadenza: {formatDate(row.due_date)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {isLate(row) && (
                                                        <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300">In ritardo</Badge>
                                                    )}
                                                    {canExecuteChecklist && statusKey !== "completed" && statusKey !== "cancelled" && (
                                                        <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                                                            Eseguibile
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

