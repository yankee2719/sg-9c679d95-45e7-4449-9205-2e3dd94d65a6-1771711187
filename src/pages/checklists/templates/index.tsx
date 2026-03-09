// src/pages/checklists/templates/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    CheckSquare,
    ArrowRight,
    Plus,
    Search,
    ClipboardList,
    Filter,
    ShieldCheck,
} from "lucide-react";

interface ChecklistTemplateRow {
    id: string;
    name: string | null;
    description: string | null;
    category: string | null;
    frequency: string | null;
    created_at?: string | null;
    item_count?: number;
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

function normalizeCategory(category: string | null | undefined) {
    const value = (category || "").toLowerCase();
    if (value.includes("safety") || value.includes("sicur")) return "safety";
    if (value.includes("quality") || value.includes("qualit")) return "quality";
    return "operational";
}

function categoryStyle(
    category: string | null | undefined,
    t: (key: string) => string
) {
    const normalized = normalizeCategory(category);

    if (normalized === "safety") {
        return {
            iconWrap: "bg-red-500/15 text-red-400",
            badge: "bg-red-500/15 text-red-300 border border-red-500/30",
            label: t("checklists.category.safety"),
        };
    }

    if (normalized === "quality") {
        return {
            iconWrap: "bg-blue-500/15 text-blue-300",
            badge: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
            label: t("checklists.category.quality"),
        };
    }

    return {
        iconWrap: "bg-emerald-500/15 text-emerald-400",
        badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
        label: t("checklists.category.operational"),
    };
}

export default function ChecklistTemplatesPage() {
    const { t } = useLanguage();

    const [userRole, setUserRole] = useState("technician");
    const [rows, setRows] = useState < ChecklistTemplateRow[] > ([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId) return;

                setUserRole(ctx.role ?? "technician");

                const { data, error } = await supabase
                    .from("checklist_templates")
                    .select("id, name, description, category, frequency, created_at")
                    .eq("organization_id", ctx.orgId)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                const templateIds = (data ?? []).map((x: any) => x.id);

                const itemCounts = templateIds.length
                    ? await supabase
                        .from("checklist_template_items")
                        .select("template_id")
                        .in("template_id", templateIds)
                    : ({ data: [] } as any);

                const countMap = new Map < string, number> ();
                (itemCounts.data ?? []).forEach((item: any) => {
                    countMap.set(item.template_id, (countMap.get(item.template_id) ?? 0) + 1);
                });

                setRows(
                    (data ?? []).map((row: any) => ({
                        id: row.id,
                        name: row.name,
                        description: row.description,
                        category: row.category ?? null,
                        frequency: row.frequency ?? null,
                        created_at: row.created_at ?? null,
                        item_count: countMap.get(row.id) ?? 0,
                    }))
                );
            } catch (error) {
                console.error("Checklist templates load error:", error);
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
                (row.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (row.description ?? "").toLowerCase().includes(search.toLowerCase());

            const normalized = normalizeCategory(row.category);
            const matchesCategory =
                categoryFilter === "all" || normalized === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [rows, search, categoryFilter]);

    const stats = useMemo(() => {
        return {
            total: rows.length,
            items: rows.reduce((sum, row) => sum + (row.item_count ?? 0), 0),
            safety: rows.filter((r) => normalizeCategory(r.category) === "safety").length,
        };
    }, [rows]);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("checklists.title")} - MACHINA`} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                    {t("checklists.title")}
                                </h1>
                                <p className="text-base text-muted-foreground">
                                    {t("checklists.subtitle")}
                                </p>
                            </div>

                            <Link
                                href="/checklists/templates/new"
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                            >
                                <Plus className="h-4 w-4" />
                                {t("checklists.newTemplate")}
                            </Link>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                                    <CheckSquare className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.total}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("checklists.kpi.templates")}
                                </div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.items}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("checklists.kpi.totalItems")}
                                </div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/20 text-red-300">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.safety}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("checklists.kpi.safetyChecklists")}
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
                                        placeholder={t("checklists.searchPlaceholder")}
                                        className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-foreground outline-none placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-background px-4 text-foreground xl:w-[220px]">
                                    <Filter className="h-5 w-5 text-muted-foreground" />
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="w-full bg-transparent outline-none"
                                    >
                                        <option value="all">{t("common.all")}</option>
                                        <option value="safety">{t("checklists.category.safety")}</option>
                                        <option value="quality">{t("checklists.category.quality")}</option>
                                        <option value="operational">
                                            {t("checklists.category.operational")}
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </CardShell>

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-foreground">
                                {t("checklists.listTitle")}
                            </h2>

                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("checklists.loading")}
                                </CardShell>
                            ) : filteredRows.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("checklists.noResults")}
                                </CardShell>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => {
                                        const style = categoryStyle(row.category, t);

                                        return (
                                            <Link key={row.id} href={`/checklists/templates/${row.id}`} className="block">
                                                <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex min-w-0 items-center gap-4">
                                                            <div
                                                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconWrap}`}
                                                            >
                                                                <CheckSquare className="h-5 w-5" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="truncate text-2xl font-bold text-foreground">
                                                                    {row.name ?? t("checklists.fallbackTitle")}
                                                                </div>

                                                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg text-muted-foreground">
                                                                    <span>
                                                                        {row.item_count ?? 0} {t("checklists.itemsLabel")}
                                                                    </span>
                                                                    <span>{row.frequency ?? "—"}</span>
                                                                    {row.description && (
                                                                        <span className="truncate max-w-[500px]">
                                                                            {row.description}
                                                                        </span>
                                                                    )}
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