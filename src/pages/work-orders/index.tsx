// src/pages/work-orders/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
    ClipboardList,
    ArrowRight,
    Plus,
    Search,
    CalendarDays,
    Wrench,
    Filter,
    AlertTriangle,
} from "lucide-react";

interface WorkOrderRow {
    id: string;
    title: string | null;
    description: string | null;
    machine_id: string | null;
    machine_name?: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
    created_at?: string | null;
}

function CardShell({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-[20px] border border-border bg-card text-card-foreground shadow-sm ${className}`}
        >
            {children}
        </div>
    );
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleDateString("it-IT");
    } catch {
        return value;
    }
}

function priorityStyles(priority: string | null | undefined) {
    const value = (priority || "").toLowerCase();
    if (value.includes("alta") || value === "high") {
        return {
            iconWrap: "bg-red-500/15 text-red-400",
            badge: "bg-red-500/15 text-red-300 border border-red-500/30",
            label: "Alta",
        };
    }
    if (value.includes("media") || value === "medium") {
        return {
            iconWrap: "bg-amber-500/15 text-amber-400",
            badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
            label: "Media",
        };
    }
    return {
        iconWrap: "bg-emerald-500/15 text-emerald-400",
        badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
        label: "Bassa",
    };
}

function statusLabel(status: string | null | undefined) {
    const value = (status || "").toLowerCase();
    if (value.includes("open") || value.includes("apert")) return "Aperto";
    if (value.includes("progress") || value.includes("corso")) return "In corso";
    if (value.includes("closed") || value.includes("chius")) return "Chiuso";
    return status || "—";
}

export default function WorkOrdersPage() {
    const [userRole, setUserRole] = useState("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [rows, setRows] = useState < WorkOrderRow[] > ([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId) return;

                setUserRole(ctx.role ?? "technician");
                setOrgId(ctx.orgId);

                const { data: workOrders, error } = await supabase
                    .from("work_orders")
                    .select("id, title, description, machine_id, status, priority, due_date, created_at")
                    .eq("organization_id", ctx.orgId)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                const machineIds = (workOrders ?? []).map((x: any) => x.machine_id).filter(Boolean);
                const { data: machines } = machineIds.length
                    ? await supabase.from("machines").select("id, name").in("id", machineIds)
                    : ({ data: [] } as any);

                const machineMap = new Map((machines ?? []).map((m: any) => [m.id, m.name]));

                setRows(
                    (workOrders ?? []).map((row: any) => ({
                        id: row.id,
                        title: row.title,
                        description: row.description,
                        machine_id: row.machine_id,
                        machine_name: machineMap.get(row.machine_id) ?? null,
                        status: row.status ?? null,
                        priority: row.priority ?? null,
                        due_date: row.due_date ?? null,
                        created_at: row.created_at ?? null,
                    }))
                );
            } catch (error) {
                console.error("Work orders load error:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const matchesSearch =
                !search ||
                (row.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (row.machine_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (row.description ?? "").toLowerCase().includes(search.toLowerCase());

            const normalized = (row.priority ?? "").toLowerCase();
            const matchesPriority =
                priorityFilter === "all" ||
                normalized === priorityFilter ||
                normalized.includes(priorityFilter);

            return matchesSearch && matchesPriority;
        });
    }, [rows, search, priorityFilter]);

    const stats = useMemo(() => {
        return {
            total: rows.length,
            open: rows.filter((r) => {
                const s = (r.status || "").toLowerCase();
                return s.includes("open") || s.includes("apert");
            }).length,
            urgent: rows.filter((r) => {
                const p = (r.priority || "").toLowerCase();
                return p.includes("alta") || p === "high";
            }).length,
        };
    }, [rows]);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Ordini di lavoro - MACHINA" />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">Ordini di lavoro</h1>
                                <p className="text-base text-muted-foreground">
                                    Pianifica, assegna e monitora le attività operative sulle macchine.
                                </p>
                            </div>

                            <Link
                                href="/work-orders/create"
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-foreground transition hover:bg-orange-400"
                            >
                                <Plus className="h-4 w-4" />
                                Nuovo Work Order
                            </Link>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">{stats.total}</div>
                                <div className="mt-2 text-[22px] font-medium text-foreground">Totali</div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">{stats.open}</div>
                                <div className="mt-2 text-[22px] font-medium text-foreground">Aperti</div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/20 text-red-300">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">{stats.urgent}</div>
                                <div className="mt-2 text-[22px] font-medium text-foreground">Alta Priorità</div>
                            </CardShell>
                        </div>

                        <CardShell className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Cerca work order"
                                        className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-foreground outline-none placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div className="flex h-12 items-center gap-3 rounded-2xl border border-blue-500/20 bg-background px-4 text-foreground xl:w-[180px]">
                                    <Filter className="h-5 w-5 text-muted-foreground" />
                                    <select
                                        value={priorityFilter}
                                        onChange={(e) => setPriorityFilter(e.target.value)}
                                        className="w-full bg-transparent outline-none"
                                    >
                                        <option value="all" className="text-black">Tutti</option>
                                        <option value="alta" className="text-black">Alta</option>
                                        <option value="media" className="text-black">Media</option>
                                        <option value="bassa" className="text-black">Bassa</option>
                                    </select>
                                </div>
                            </div>
                        </CardShell>

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-foreground">Elenco Work Orders</h2>

                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">Caricamento work orders...</CardShell>
                            ) : filteredRows.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">Nessun work order trovato.</CardShell>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => {
                                        const style = priorityStyles(row.priority);

                                        return (
                                            <Link key={row.id} href={`/work-orders/${row.id}`} className="block">
                                                <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex min-w-0 items-center gap-4">
                                                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconWrap}`}>
                                                                <ClipboardList className="h-5 w-5" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="truncate text-2xl font-bold text-foreground">
                                                                    {row.title ?? "Work Order"}
                                                                </div>

                                                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg text-muted-foreground">
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <Wrench className="h-4 w-4" />
                                                                        {row.machine_name ?? "Macchina"}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <CalendarDays className="h-4 w-4" />
                                                                        {formatDate(row.due_date)}
                                                                    </span>
                                                                    <span>{statusLabel(row.status)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex shrink-0 items-center gap-6">
                                                            <div className={`rounded-full px-4 py-1.5 text-lg font-semibold ${style.badge}`}>
                                                                {style.label}
                                                            </div>
                                                            <ArrowRight className="h-6 w-6 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                </CardShell>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
