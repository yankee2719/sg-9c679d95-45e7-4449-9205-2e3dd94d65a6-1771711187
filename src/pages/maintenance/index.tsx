import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { CalendarDays, Search, Filter, CheckCircle2, ChevronRight, Clock3, Wrench } from "lucide-react";
import { getMaintenanceOverview, type MaintenanceOverviewItem } from "@/lib/maintenanceOverviewApi";

function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
    const { loading: authLoading, membership } = useAuth();

    const [items, setItems] = useState < MaintenanceOverviewItem[] > ([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");

    const userRole = membership?.role ?? "viewer";

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;
            try {
                setLoading(true);
                const data = await getMaintenanceOverview();
                if (!active) return;
                setItems(data.items ?? []);
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
    }, [authLoading]);

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

    const stats = useMemo(() => ({
        total: items.length,
        open: items.filter((item) => !isClosedStatus(item.status)).length,
        overdue: items.filter((item) => item.due_date && !isClosedStatus(item.status) && new Date(item.due_date).getTime() < Date.now()).length,
        completed: items.filter((item) => String(item.status || "").toLowerCase() === "completed").length,
    }), [items]);

    const locale = language === "it" ? "it-IT" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-GB";

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("maintenance.title")} - MACHINA`} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">{t("maintenance.title")}</h1>
                                <p className="text-base text-muted-foreground">{t("maintenance.subtitle") || t("workOrders.subtitle")}</p>
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
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500"><CalendarDays className="h-5 w-5" /></div>
                                <div className="text-4xl font-bold text-foreground">{stats.total}</div>
                                <div className="mt-2 text-sm text-muted-foreground">{t("common.all")}</div>
                            </CardShell>
                            <CardShell className="p-6">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500"><Wrench className="h-5 w-5" /></div>
                                <div className="text-4xl font-bold text-foreground">{stats.open}</div>
                                <div className="mt-2 text-sm text-muted-foreground">{t("workOrders.statusOpen") || "Aperti"}</div>
                            </CardShell>
                            <CardShell className="p-6">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500"><Clock3 className="h-5 w-5" /></div>
                                <div className="text-4xl font-bold text-foreground">{stats.overdue}</div>
                                <div className="mt-2 text-sm text-muted-foreground">{t("workOrders.overdue") || "Scaduti"}</div>
                            </CardShell>
                            <CardShell className="p-6">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="h-5 w-5" /></div>
                                <div className="text-4xl font-bold text-foreground">{stats.completed}</div>
                                <div className="mt-2 text-sm text-muted-foreground">{t("workOrders.statusCompleted") || "Completati"}</div>
                            </CardShell>
                        </div>

                        <CardShell className="p-5">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={t("common.search") || "Cerca..."}
                                        className="h-12 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm outline-none ring-0 transition placeholder:text-muted-foreground focus:border-orange-500"
                                    />
                                </div>
                                <div className="relative">
                                    <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <select
                                        value={priorityFilter}
                                        onChange={(e) => setPriorityFilter(e.target.value)}
                                        className="h-12 w-full appearance-none rounded-2xl border border-border bg-background pl-11 pr-4 text-sm outline-none transition focus:border-orange-500"
                                    >
                                        <option value="all">{t("common.all")}</option>
                                        <option value="high">{t("maintenance.priority.high") || "High"}</option>
                                        <option value="medium">{t("maintenance.priority.medium") || "Medium"}</option>
                                        <option value="low">{t("maintenance.priority.low") || "Low"}</option>
                                    </select>
                                </div>
                            </div>
                        </CardShell>

                        <div className="grid gap-4">
                            {loading ? (
                                <CardShell className="p-8 text-sm text-muted-foreground">{t("common.loading") || "Caricamento..."}</CardShell>
                            ) : filteredItems.length === 0 ? (
                                <CardShell className="p-8 text-sm text-muted-foreground">{t("common.noData") || "Nessun dato disponibile"}</CardShell>
                            ) : (
                                filteredItems.map((item) => {
                                    const priority = priorityStyles(item.priority, t);
                                    return (
                                        <Link key={item.id} href={`/work-orders/${item.id}`}>
                                            <CardShell className="group p-5 transition hover:border-orange-500/40 hover:shadow-md">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="min-w-0 space-y-3">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${priority.badge}`}>{priority.label}</span>
                                                            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{statusLabel(item.status, t)}</span>
                                                        </div>
                                                        <div>
                                                            <h3 className="truncate text-lg font-semibold text-foreground">{item.title || t("maintenance.untitled") || "Work order"}</h3>
                                                            <p className="mt-1 text-sm text-muted-foreground">{item.machine_name || t("workOrders.noMachine") || "Macchina non disponibile"}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right text-sm text-muted-foreground">
                                                            <div>{t("workOrders.dueDate") || "Scadenza"}</div>
                                                            <div className="font-medium text-foreground">{formatDate(item.due_date, locale)}</div>
                                                        </div>
                                                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${priority.iconWrap}`}>
                                                            <ChevronRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                                                        </div>
                                                    </div>
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
