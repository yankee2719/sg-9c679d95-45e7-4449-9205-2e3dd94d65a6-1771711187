import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, Plus, Search, Wrench } from "lucide-react";
import { listWorkOrders } from "@/services/workOrderApi";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
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

function formatDate(value: string | null | undefined, lang: string) {
    if (!value) return "—";
    try {
        const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
        return new Date(value).toLocaleString(locale, {
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
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-current/10 ${toneClass}`}>
                    {icon}
                </div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function WorkOrdersIndexPage() {
    const { loading: authLoading, membership } = useAuth();
    const { t, language } = useLanguage();
    const userRole = membership?.role ?? "viewer";

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < WorkOrderRow[] > ([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const data = await listWorkOrders();
                if (!active) return;
                setRows(data as WorkOrderRow[]);
            } catch (error) {
                console.error("Work orders load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        if (!authLoading) void load();

        return () => {
            active = false;
        };
    }, [authLoading]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;

        return rows.filter((row) =>
            [row.title, row.description, row.status, row.priority]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q))
        );
    }, [rows, search]);

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
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">{t("workOrders.loading")}</div>
            </MainLayout>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("workOrders.title")} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                {t("workOrders.title")}
                            </h1>
                            <p className="text-base text-muted-foreground">
                                {t("workOrders.subtitle")}
                            </p>
                        </div>

                        <Link href="/work-orders/create">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                {t("workOrders.new")}
                            </Button>
                        </Link>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<ClipboardList className="h-5 w-5" />} title={t("common.all")} value={stats.total} />
                        <KpiCard icon={<Wrench className="h-5 w-5" />} title={t("workOrders.statusOpen")} value={stats.open} />
                        <KpiCard icon={<AlertTriangle className="h-5 w-5" />} title={t("workOrders.overdue") || "In ritardo"} value={stats.overdue} tone="warning" />
                        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} title={t("workOrders.statusCompleted")} value={stats.completed} tone="success" />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t("workOrders.search")}
                                    className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            {filteredRows.length === 0 ? (
                                <EmptyState
                                    title={t("workOrders.noResults")}
                                    description={t("workOrders.noResults")}
                                    icon={<ClipboardList className="h-10 w-10" />}
                                    actionLabel={t("workOrders.new")}
                                    actionHref="/work-orders/create"
                                />
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => (
                                        <Link key={row.id} href={`/work-orders/${row.id}`} className="block">
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
                                                            <span>Due: {formatDate(row.due_date, language)}</span>
                                                            <span>Updated: {formatDate(row.updated_at, language)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}