import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
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
    return <div className={`surface-panel ${className}`}>{children}</div>;
}

function normalizePriority(value: string | null | undefined) {
    const v = (value || "").toLowerCase();
    if (v.includes("alta") || v === "high") return "high";
    if (v.includes("media") || v === "medium") return "medium";
    return "low";
}

function formatDate(value: string | null | undefined, locale: string) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleDateString(locale);
    } catch {
        return value;
    }
}

function priorityStyles(priority: string | null | undefined, t: (key: string) => string) {
    const normalized = normalizePriority(priority);

    if (normalized === "high") {
        return {
            iconWrap: "bg-red-500/15 text-red-400",
            badge: "bg-red-500/15 text-red-300 border border-red-500/30",
            label: t("workOrders.priority.high"),
        };
    }

    if (normalized === "medium") {
        return {
            iconWrap: "bg-amber-500/15 text-amber-400",
            badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
            label: t("workOrders.priority.medium"),
        };
    }

    return {
        iconWrap: "bg-emerald-500/15 text-emerald-400",
        badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
        label: t("workOrders.priority.low"),
    };
}

function statusLabel(status: string | null | undefined, t: (key: string) => string) {
    const value = (status || "").toLowerCase();
    if (value.includes("open") || value.includes("apert")) {
        return t("workOrders.status.open");
    }
    if (value.includes("progress") || value.includes("corso")) {
        return t("workOrders.status.inProgress");
    }
    if (value.includes("closed") || value.includes("chius")) {
        return t("workOrders.status.closed");
    }
    return status || "—";
}

export default function WorkOrdersPage() {
    const { t, language } = useLanguage();
    const { loading: authLoading, organization, membership } = useAuth();

    const [rows, setRows] = useState < WorkOrderRow[] > ([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
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

            try {
                setLoading(true);

                const { data: workOrders, error } = await supabase
                    .from("work_orders")
                    .select(
                        "id, title, description, machine_id, status, priority, due_date, created_at"
                    )
                    .eq("organization_id", orgId)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                const machineIds = (workOrders ?? [])
                    .map((row: any) => row.machine_id)
                    .filter(Boolean);

                const { data: machines } = machineIds.length
                    ? await supabase.from("machines").select("id, name").in("id", machineIds)
                    : ({ data: [] } as any);

                const machineMap = new Map((machines ?? []).map((m: any) => [m.id, m.name]));

                if (!active) return;

                setRows(
                    ((workOrders ?? []) as any[]).map((row) => ({
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
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, orgId]);

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const q = search.trim().toLowerCase();

            const matchesSearch =
                !q ||
                (row.title ?? "").toLowerCase().includes(q) ||
                (row.machine_name ?? "").toLowerCase().includes(q) ||
                (row.description ?? "").toLowerCase().includes(q);

            const normalized = normalizePriority(row.priority);
            const matchesPriority = priorityFilter === "all" || normalized === priorityFilter;

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

    const locale =
        language === "it"
            ? "it-IT"
            : language === "fr"
                ? "fr-FR"
                : language === "es"
                    ? "es-ES"
                    : "en-GB";

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("workOrders.title")} - MACHINA`} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                    {t("workOrders.title")}
                                </h1>
                                <p className="text-base text-muted-foreground">
                                    {t("workOrders.subtitle")}
                                </p>
                            </div>

                            <Link
                                href="/work-orders/create"
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                            >
                                <Plus className="h-4 w-4" />
                                {t("workOrders.new")}
                            </Link>
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.total}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("workOrders.total")}
                                </div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.open}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("workOrders.open")}
                                </div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/20 text-red-300">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.urgent}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("workOrders.urgent")}
                                </div>
                            </CardShell>
                        </div>

                        <CardShell className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={t("common.search")}
                                        className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-foreground outline-none placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-background px-4 text-foreground xl:w-[260px]">
                                    <Filter className="h-5 w-5 text-muted-foreground" />
                                    <select
                                        value={priorityFilter}
                                        onChange={(e) => setPriorityFilter(e.target.value)}
                                        className="w-full bg-transparent outline-none"
                                    >
                                        <option value="all">{t("common.all")}</option>
                                        <option value="high">{t("workOrders.priority.high")}</option>
                                        <option value="medium">{t("workOrders.priority.medium")}</option>
                                        <option value="low">{t("workOrders.priority.low")}</option>
                                    </select>
                                </div>
                            </div>
                        </CardShell>

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-foreground">
                                {t("workOrders.listTitle")}
                            </h2>

                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("workOrders.loading")}
                                </CardShell>
                            ) : filteredRows.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("workOrders.noResults")}
                                </CardShell>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => {
                                        const style = priorityStyles(row.priority, t);

                                        return (
                                            <Link
                                                key={row.id}
                                                href={`/work-orders/${row.id}`}
                                                className="block"
                                            >
                                                <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex min-w-0 items-center gap-4">
                                                            <div
                                                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconWrap}`}
                                                            >
                                                                <ClipboardList className="h-5 w-5" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="truncate text-2xl font-bold text-foreground">
                                                                    {row.title ??
                                                                        t("workOrders.fallbackTitle")}
                                                                </div>

                                                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg text-muted-foreground">
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <Wrench className="h-4 w-4" />
                                                                        {row.machine_name ??
                                                                            t(
                                                                                "workOrders.machineFallback"
                                                                            )}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <CalendarDays className="h-4 w-4" />
                                                                        {formatDate(row.due_date, locale)}
                                                                    </span>
                                                                    <span>
                                                                        {statusLabel(row.status, t)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex shrink-0 items-center gap-6">
                                                            <div
                                                                className={`rounded-full px-4 py-1.5 text-lg font-semibold ${style.badge}`}
                                                            >
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
