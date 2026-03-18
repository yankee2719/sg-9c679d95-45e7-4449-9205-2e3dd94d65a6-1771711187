import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    Download,
    Plus,
    Search,
    Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/feedback/EmptyState";
import WorkOrderStatusBadge from "@/components/work-orders/WorkOrderStatusBadge";
import WorkOrderPriorityBadge from "@/components/work-orders/WorkOrderPriorityBadge";

interface WorkOrderRow {
    id: string;
    title: string | null;
    description: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
    machine_id: string | null;
    assigned_to: string | null;
    organization_id: string | null;
    created_at: string | null;
    updated_at: string | null;
}

interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
}

interface ProfileRow {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString("it-IT", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
}

function isClosedStatus(status: string | null | undefined) {
    const key = String(status || "").toLowerCase();
    return ["completed", "closed", "cancelled"].includes(key);
}

function isOverdue(row: WorkOrderRow) {
    if (!row.due_date) return false;
    if (isClosedStatus(row.status)) return false;
    return new Date(row.due_date).getTime() < Date.now();
}

function KpiCard({
    icon,
    title,
    value,
    tone = "default",
}: {
    icon: React.ReactNode;
    title: string;
    value: number;
    tone?: "default" | "warning" | "success";
}) {
    const toneClass =
        tone === "warning"
            ? "text-amber-500"
            : tone === "success"
                ? "text-green-500"
                : "text-orange-500";

    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-current/10 ${toneClass}`}
                >
                    {icon}
                </div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function WorkOrdersIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < WorkOrderRow[] > ([]);
    const [machineMap, setMachineMap] = useState < Map < string, string>> (new Map());
    const [assigneeMap, setAssigneeMap] = useState < Map < string, string>> (new Map());

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");

    const orgId = organization?.id ?? null;
    const userRole = membership?.role ?? "technician";

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;

            if (!orgId) {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const { data, error } = await supabase
                    .from("work_orders")
                    .select(
                        "id, title, description, status, priority, due_date, machine_id, assigned_to, organization_id, created_at, updated_at"
                    )
                    .eq("organization_id", orgId)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                const workOrders = (data ?? []) as WorkOrderRow[];

                const machineIds = Array.from(
                    new Set(workOrders.map((row) => row.machine_id).filter(Boolean))
                ) as string[];

                const assigneeIds = Array.from(
                    new Set(workOrders.map((row) => row.assigned_to).filter(Boolean))
                ) as string[];

                let machines: MachineRow[] = [];
                let profiles: ProfileRow[] = [];

                if (machineIds.length > 0) {
                    const { data: machineRows, error: machineError } = await supabase
                        .from("machines")
                        .select("id, name, internal_code")
                        .in("id", machineIds);

                    if (machineError) throw machineError;
                    machines = (machineRows ?? []) as MachineRow[];
                }

                if (assigneeIds.length > 0) {
                    const { data: profileRows, error: profileError } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .in("id", assigneeIds);

                    if (profileError) throw profileError;
                    profiles = (profileRows ?? []) as ProfileRow[];
                }

                const nextMachineMap = new Map < string, string> ();
                for (const row of machines) {
                    nextMachineMap.set(
                        row.id,
                        row.name || row.internal_code || row.id
                    );
                }

                const nextAssigneeMap = new Map < string, string> ();
                for (const row of profiles) {
                    const label =
                        row.display_name?.trim() ||
                        `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() ||
                        row.email ||
                        row.id;
                    nextAssigneeMap.set(row.id, label);
                }

                if (!active) return;

                setRows(workOrders);
                setMachineMap(nextMachineMap);
                setAssigneeMap(nextAssigneeMap);
            } catch (error) {
                console.error("Work orders load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, orgId]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return rows.filter((row) => {
            const matchesSearch =
                !q ||
                [
                    row.title,
                    row.description,
                    row.status,
                    row.priority,
                    row.machine_id ? machineMap.get(row.machine_id) : "",
                    row.assigned_to ? assigneeMap.get(row.assigned_to) : "",
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(q));

            const matchesStatus =
                statusFilter === "all" ||
                String(row.status || "").toLowerCase() === statusFilter;

            const matchesPriority =
                priorityFilter === "all" ||
                String(row.priority || "").toLowerCase() === priorityFilter;

            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [rows, search, statusFilter, priorityFilter, machineMap, assigneeMap]);

    const stats = useMemo(() => {
        return {
            total: rows.length,
            open: rows.filter((row) => !isClosedStatus(row.status)).length,
            overdue: rows.filter((row) => isOverdue(row)).length,
            completed: rows.filter((row) =>
                ["completed", "closed"].includes(String(row.status || "").toLowerCase())
            ).length,
        };
    }, [rows]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Work Orders - MACHINA" />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Caricamento work orders...
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Work Orders - MACHINA" />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                Work Orders
                            </h1>
                            <p className="text-base text-muted-foreground">
                                Registro operativo degli ordini di lavoro nel contesto attivo.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <a href="/api/export/work-orders">
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    Export CSV
                                </Button>
                            </a>

                            <Link href="/work-orders/create">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nuovo work order
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            icon={<ClipboardList className="h-5 w-5" />}
                            title="Totali"
                            value={stats.total}
                        />
                        <KpiCard
                            icon={<Wrench className="h-5 w-5" />}
                            title="Aperti"
                            value={stats.open}
                        />
                        <KpiCard
                            icon={<AlertTriangle className="h-5 w-5" />}
                            title="In ritardo"
                            value={stats.overdue}
                            tone="warning"
                        />
                        <KpiCard
                            icon={<CheckCircle2 className="h-5 w-5" />}
                            title="Completati"
                            value={stats.completed}
                            tone="success"
                        />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="grid gap-4 p-6 xl:grid-cols-[1.5fr_1fr_1fr]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cerca titolo, macchina, assegnatario..."
                                    className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none"
                            >
                                <option value="all">Tutti gli stati</option>
                                <option value="open">Open</option>
                                <option value="in_progress">In progress</option>
                                <option value="on_hold">On hold</option>
                                <option value="completed">Completed</option>
                                <option value="closed">Closed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>

                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none"
                            >
                                <option value="all">Tutte le priorità</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            {filteredRows.length === 0 ? (
                                <EmptyState
                                    title="Nessun work order trovato"
                                    description="Non ci sono ordini di lavoro oppure nessun elemento corrisponde ai filtri attivi."
                                    icon={<ClipboardList className="h-10 w-10" />}
                                    actionLabel="Crea work order"
                                    actionHref="/work-orders/create"
                                    secondaryActionLabel="Apri macchine"
                                    secondaryActionHref="/equipment"
                                />
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => {
                                        const machineLabel = row.machine_id
                                            ? machineMap.get(row.machine_id) || row.machine_id
                                            : "—";

                                        const assigneeLabel = row.assigned_to
                                            ? assigneeMap.get(row.assigned_to) || row.assigned_to
                                            : "Non assegnato";

                                        return (
                                            <Link
                                                key={row.id}
                                                href={`/work-orders/${row.id}`}
                                                className="block"
                                            >
                                                <div className="rounded-2xl border border-border p-4 transition hover:bg-muted/30">
                                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                        <div className="min-w-0 space-y-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div className="truncate text-lg font-semibold text-foreground">
                                                                    {row.title || "Work order"}
                                                                </div>
                                                                <WorkOrderStatusBadge status={row.status} />
                                                                <WorkOrderPriorityBadge priority={row.priority} />
                                                            </div>

                                                            {row.description && (
                                                                <div className="text-sm text-muted-foreground">
                                                                    {row.description}
                                                                </div>
                                                            )}

                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                                <span>Macchina: {machineLabel}</span>
                                                                <span>Assegnato a: {assigneeLabel}</span>
                                                                <span>Due: {formatDate(row.due_date)}</span>
                                                                <span>Updated: {formatDate(row.updated_at)}</span>
                                                            </div>
                                                        </div>

                                                        {isOverdue(row) && (
                                                            <Badge className="border border-red-300 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300">
                                                                Overdue
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}