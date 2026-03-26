import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    CalendarDays,
    Search,
    Filter,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Wrench,
} from "lucide-react";

type PreventiveWorkOrderRow = {
    id: string;
    title: string | null;
    machine_id: string | null;
    machine_name?: string | null;
    due_date?: string | null;
    priority?: string | null;
    status?: string | null;
    created_at?: string | null;
};

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
    const v = String(value || "").toLowerCase();
    if (v === "critical" || v.includes("alta") || v === "high") return "high";
    if (v.includes("media") || v === "medium") return "medium";
    return "low";
}

function isClosedStatus(status: string | null | undefined) {
    const value = String(status || "").toLowerCase();
    return ["completed", "approved", "cancelled", "closed"].includes(value);
}

function priorityStyles(priority: string | null | undefined, t: (key: string) => string) {
    const normalized = normalizePriority(priority);

    if (normalized === "high") {
        return {
            iconWrap: "bg-red-500/15 text-red-600 dark:text-red-300",
            badge: "bg-red-500/15 text-red-700 dark:text-red-300",
            label: t("maintenance.priority.high") || "High",
        };
    }

    if (normalized === "medium") {
        return {
            iconWrap: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
            badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
            label: t("maintenance.priority.medium") || "Medium",
        };
    }

    return {
        iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
        badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        label: t("maintenance.priority.low") || "Low",
    };
}

function statusLabel(status: string | null | undefined, t: (key: string) => string) {
    const value = String(status || "").toLowerCase();
    if (value === "draft") return t("workOrders.statusDraft") || "Draft";
    if (value === "scheduled") return t("workOrders.statusScheduled") || "Scheduled";
    if (value === "in_progress") return t("workOrders.statusInProgress") || "In progress";
    if (value === "pending_review") return t("workOrders.statusPendingReview") || "Pending review";
    if (value === "completed") return t("workOrders.statusCompleted") || "Completed";
    if (value === "cancelled") return t("workOrders.statusCancelled") || "Cancelled";
    return status || "—";
}

function formatDate(value: string | null | undefined, locale: string) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleDateString(locale);
    } catch {
        return value;
    }
}

export default function MaintenancePage() {
    const { t, language } = useLanguage();

    const [userRole, setUserRole] = useState("technician");
    const [items, setItems] = useState < PreventiveWorkOrderRow[] > ([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId) return;

                setUserRole(ctx.role ?? "technician");

                const { data: workOrders, error } = await supabase
                    .from("work_orders")
                    .select("id, title, machine_id, due_date, priority, status, created_at, work_type")
                    .eq("organization_id", ctx.orgId)
                    .eq("work_type", "preventive")
                    .order("created_at", { ascending: false });

                if (error) throw error;

                const machineIds = Array.from(
                    new Set((workOrders ?? []).map((row: any) => row.machine_id).filter(Boolean))
                ) as string[];

                const { data: machines, error: machinesError } = machineIds.length
                    ? await supabase.from("machines").select("id, name").in("id", machineIds)
                    : ({ data: [], error: null } as { data: Array<{ id: string; name: string | null }>; error: null });

                if (machinesError) throw machinesError;

                const machineMap = new Map((machines ?? []).map((machine) => [machine.id, machine.name]));

                if (!active) return;
                setItems(
                    ((workOrders ?? []) as any[]).map((row) => ({
                        id: row.id,
                        title: row.title ?? null,
                        machine_id: row.machine_id ?? null,
                        machine_name: row.machine_id ? machineMap.get(row.machine_id) ?? null : null,
                        due_date: row.due_date ?? null,
                        priority: row.priority ?? null,
                        status: row.status ?? null,
                        created_at: row.created_at ?? null,
                    }))
                );
            } catch (error) {
                console.error("Maintenance load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, []);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const q = search.trim().toLowerCase();
            const matchesSearch =
                !q ||
                (item.title ?? "").toLowerCase().includes(q) ||
                (item.machine_name ?? "").toLowerCase().includes(q) ||
                String(item.status ?? "").toLowerCase().includes(q);

            const normalized = normalizePriority(item.priority);
            const matchesPriority = priorityFilter === "all" || normalized === priorityFilter;

            return matchesSearch && matchesPriority;
        });
    }, [items, search, priorityFilter]);

    const stats = useMemo(() => {
        return {
            total: items.length,
            open: items.filter((item) => !isClosedStatus(item.status)).length,
            overdue: items.filter((item) => {
                if (!item.due_date || isClosedStatus(item.status)) return false;
                return new Date(item.due_date).getTime() < Date.now();
            }).length,
            completed: items.filter((item) => String(item.status || "").toLowerCase() === "completed").length,
        };
    }, [items]);

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
                <SEO title={`${t("maintenance.title")} - MACHINA`} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                    {t("maintenance.title")}
                                </h1>
                                <p className="text-base text-muted-foreground">
                                    {t("maintenance.subtitle") || t("workOrders.subtitle")}
                                </p>
                            </div>

                            <Link
                                href="/work-orders/create?work_type=preventive"
                                className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 font-semibold text-foreground transition hover:bg-muted shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)]"
                            >
                                <CalendarDays className="h-5 w-5" />
                                {t("maintenance.newPlan") || t("workOrders.new")}
                            </Link>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <CardShell className="p-6">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                                    <CalendarDays className="h-5 w-5" />
                                </div>
                                <div className="text-4xl font-bold text-foreground">{stats.total}</div>
                                <div className="mt-2 text-sm text-muted-foreground">{t("common.all")}</div>
                            </CardShell>
                            <CardShell className="p-6">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                <div className="text-4xl font-bold text-foreground">{stats.open}</div>
                                <div className="mt-2 text-sm text-muted-foreground">{t("workOrders.statusOpen") || "Open"}</div>
                            </CardShell>
                            <CardShell className="p-6">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                                    <Clock3 className="h-5 w-5" />
                                </div>
                                <div className="text-4xl font-bold text-foreground">{stats.overdue}</div>
                                <div className="mt-2 text-sm text-muted-foreground">{t("workOrders.overdue") || "Overdue"}</div>
                            </CardShell>
                            <CardShell className="p-6">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div className="text-4xl font-bold text-foreground">{stats.completed}</div>
                                <div className="mt-2 text-sm text-muted-foreground">{t("workOrders.statusCompleted") || "Completed"}</div>
                            </CardShell>
                        </div>

                        <CardShell className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={t("maintenance.searchPlaceholder") || t("workOrders.search")}
                                        className="surface-input h-12 w-full pl-12 pr-4 outline-none"
                                    />
                                </div>

                                <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 text-foreground xl:w-[180px]">
                                    <Filter className="h-5 w-5 text-muted-foreground" />
                                    <select
                                        value={priorityFilter}
                                        onChange={(e) => setPriorityFilter(e.target.value)}
                                        className="w-full bg-transparent outline-none"
                                    >
                                        <option value="all">{t("common.all")}</option>
                                        <option value="high">{t("maintenance.priority.high") || "High"}</option>
                                        <option value="medium">{t("maintenance.priority.medium") || "Medium"}</option>
                                        <option value="low">{t("maintenance.priority.low") || "Low"}</option>
                                    </select>
                                </div>
                            </div>
                        </CardShell>

                        <div className="space-y-4">
                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("maintenance.loading") || t("common.loading") || "Loading..."}
                                </CardShell>
                            ) : filteredItems.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("maintenance.noPlans") || t("workOrders.noResults")}
                                </CardShell>
                            ) : (
                                filteredItems.map((item) => {
                                    const style = priorityStyles(item.priority, t);

                                    return (
                                        <Link
                                            key={item.id}
                                            href={`/work-orders/${item.id}`}
                                            className="block"
                                            aria-label={item.title ?? t("maintenance.planFallback") || "Preventive work order"}
                                        >
                                            <CardShell className="p-5 transition hover:-translate-y-0.5">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex min-w-0 items-center gap-4">
                                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconWrap}`}>
                                                            <CalendarDays className="h-5 w-5" />
                                                        </div>

                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div className="truncate text-lg font-semibold text-foreground">
                                                                    {item.title || t("maintenance.planFallback") || "Preventive work order"}
                                                                </div>
                                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                                                                    {style.label}
                                                                </span>
                                                            </div>

                                                            <div className="text-sm text-muted-foreground">
                                                                {item.machine_name || t("equipment.machineNotFound") || "Machine not found"}
                                                            </div>

                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                                <span>{t("workOrders.status") || "Status"}: {statusLabel(item.status, t)}</span>
                                                                <span>{t("workOrders.dueDate") || "Due date"}: {formatDate(item.due_date, locale)}</span>
                                                                <span>{t("common.createdAt") || "Created"}: {formatDate(item.created_at, locale)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                                                </div>
                                            </CardShell>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
