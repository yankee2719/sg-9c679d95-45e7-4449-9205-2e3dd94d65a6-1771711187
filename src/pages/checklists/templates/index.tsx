// src/pages/checklists/templates/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
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
    return (
        <div
            className={`rounded-[20px] border border-white/10 bg-[#1b2b45] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)] ${className}`}
        >
            {children}
        </div>
    );
}

function categoryStyle(category: string | null | undefined) {
    const value = (category || "").toLowerCase();
    if (value.includes("safety") || value.includes("sicur")) {
        return {
            iconWrap: "bg-red-500/15 text-red-400",
            badge: "bg-red-500/15 text-red-300 border border-red-500/30",
            label: category || "Safety",
        };
    }
    if (value.includes("quality") || value.includes("qualit")) {
        return {
            iconWrap: "bg-blue-500/15 text-blue-300",
            badge: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
            label: category || "Quality",
        };
    }
    return {
        iconWrap: "bg-emerald-500/15 text-emerald-400",
        badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
        label: category || "Operativa",
    };
}

export default function ChecklistTemplatesPage() {
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

            const normalized = (row.category ?? "").toLowerCase();
            const matchesCategory =
                categoryFilter === "all" ||
                normalized === categoryFilter ||
                normalized.includes(categoryFilter);

            return matchesSearch && matchesCategory;
        });
    }, [rows, search, categoryFilter]);

    const stats = useMemo(() => {
        return {
            total: rows.length,
            items: rows.reduce((sum, row) => sum + (row.item_count ?? 0), 0),
            safety: rows.filter((r) => ((r.category ?? "").toLowerCase().includes("safety") || (r.category ?? "").toLowerCase().includes("sicur"))).length,
        };
    }, [rows]);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Checklist - MACHINA" />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-white">Checklist</h1>
                                <p className="text-base text-slate-300">
                                    Gestisci template checklist per controlli, verifiche e procedure operative.
                                </p>
                            </div>

                            <Link
                                href="/checklists/templates/new"
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-400"
                            >
                                <Plus className="h-4 w-4" />
                                Nuovo Template
                            </Link>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                                    <CheckSquare className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-white">{stats.total}</div>
                                <div className="mt-2 text-[22px] font-medium text-slate-200">Template</div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-white">{stats.items}</div>
                                <div className="mt-2 text-[22px] font-medium text-slate-200">Voci Totali</div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/20 text-red-300">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-white">{stats.safety}</div>
                                <div className="mt-2 text-[22px] font-medium text-slate-200">Checklist Safety</div>
                            </CardShell>
                        </div>

                        <CardShell className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Cerca template checklist"
                                        className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] pl-12 pr-4 text-white outline-none placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="flex h-12 items-center gap-3 rounded-2xl border border-blue-500/20 bg-[#07152f] px-4 text-white xl:w-[220px]">
                                    <Filter className="h-5 w-5 text-slate-400" />
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="w-full bg-transparent outline-none"
                                    >
                                        <option value="all" className="text-black">Tutte</option>
                                        <option value="safety" className="text-black">Safety</option>
                                        <option value="quality" className="text-black">Quality</option>
                                        <option value="operativa" className="text-black">Operativa</option>
                                    </select>
                                </div>
                            </div>
                        </CardShell>

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-white">Elenco Template</h2>

                            {loading ? (
                                <CardShell className="p-6 text-slate-300">Caricamento template checklist...</CardShell>
                            ) : filteredRows.length === 0 ? (
                                <CardShell className="p-6 text-slate-300">Nessun template checklist trovato.</CardShell>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => {
                                        const style = categoryStyle(row.category);

                                        return (
                                            <Link key={row.id} href={`/checklists/templates/${row.id}`} className="block">
                                                <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex min-w-0 items-center gap-4">
                                                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconWrap}`}>
                                                                <CheckSquare className="h-5 w-5" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="truncate text-2xl font-bold text-white">
                                                                    {row.name ?? "Template checklist"}
                                                                </div>

                                                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg text-slate-300">
                                                                    <span>{row.item_count ?? 0} voci</span>
                                                                    <span>{row.frequency ?? "—"}</span>
                                                                    {row.description && <span className="truncate max-w-[500px]">{row.description}</span>}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex shrink-0 items-center gap-6">
                                                            <div className={`rounded-full px-4 py-1.5 text-lg font-semibold ${style.badge}`}>
                                                                {style.label}
                                                            </div>
                                                            <ArrowRight className="h-6 w-6 text-slate-400" />
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
