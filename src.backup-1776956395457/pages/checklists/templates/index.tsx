import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
    formatChecklistDate,
    getChecklistTexts,
    translateChecklistTarget,
} from "@/lib/checklistsPageText";
import {
    CheckSquare,
    ArrowRight,
    Plus,
    Search,
    ClipboardList,
    Layers3,
    ShieldCheck,
} from "lucide-react";
import { checklistTemplateApi, type ChecklistTemplateCatalogRow } from "@/lib/checklistTemplateApi";

type TemplateRow = ChecklistTemplateCatalogRow;

function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`surface-panel ${className}`}>{children}</div>;
}

export default function ChecklistTemplatesPage() {
    const { language } = useLanguage();
    const text = getChecklistTexts(language);
    const { loading: authLoading, organization, membership } = useAuth();

    const [rows, setRows] = useState < TemplateRow[] > ([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [targetFilter, setTargetFilter] = useState("all");

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
                const payload = await checklistTemplateApi.list();
                if (!active) return;
                setRows(payload.rows ?? []);
            } catch (error) {
                console.error("Checklist templates load error:", error);
                if (active) setRows([]);
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
                (row.name ?? "").toLowerCase().includes(q) ||
                (row.description ?? "").toLowerCase().includes(q);

            const normalizedTarget = row.target_type === "production_line" ? "production_line" : "machine";
            const matchesTarget = targetFilter === "all" || normalizedTarget === targetFilter;

            return matchesSearch && matchesTarget;
        });
    }, [rows, search, targetFilter]);

    const stats = useMemo(
        () => ({
            total: rows.length,
            active: rows.filter((row) => row.is_active).length,
            items: rows.reduce((sum, row) => sum + (row.item_count ?? 0), 0),
        }),
        [rows]
    );

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${text.templates.title} - MACHINA`} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                                    {text.templates.title}
                                </h1>
                                <p className="text-base text-muted-foreground">{text.templates.subtitle}</p>
                            </div>

                            <Link
                                href="/checklists/templates/new"
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                            >
                                <Plus className="h-4 w-4" />
                                {text.templates.new}
                            </Link>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                                    <CheckSquare className="h-5 w-5" />
                                </div>
                                <div className="text-3xl font-semibold leading-none text-foreground">{stats.total}</div>
                                <div className="mt-2 text-sm font-medium text-muted-foreground">{text.templates.total}</div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="text-3xl font-semibold leading-none text-foreground">{stats.active}</div>
                                <div className="mt-2 text-sm font-medium text-muted-foreground">{text.templates.active}</div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <div className="text-3xl font-semibold leading-none text-foreground">{stats.items}</div>
                                <div className="mt-2 text-sm font-medium text-muted-foreground">{text.templates.items}</div>
                            </CardShell>
                        </div>

                        <CardShell className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={text.common.search}
                                        className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-foreground outline-none placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-background px-4 text-foreground xl:w-[260px]">
                                    <Layers3 className="h-5 w-5 text-muted-foreground" />
                                    <select
                                        value={targetFilter}
                                        onChange={(e) => setTargetFilter(e.target.value)}
                                        className="w-full bg-transparent outline-none"
                                    >
                                        <option value="all">{text.common.all}</option>
                                        <option value="machine">{text.templates.targetMachine}</option>
                                        <option value="production_line">{text.templates.targetLine}</option>
                                    </select>
                                </div>
                            </div>
                        </CardShell>

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-foreground">{text.templates.listTitle}</h2>

                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">{text.common.loading}</CardShell>
                            ) : filteredRows.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">{text.templates.noResults}</CardShell>
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => (
                                        <Link key={row.id} href={`/checklists/templates/${row.id}`} className="block">
                                            <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex min-w-0 items-center gap-4">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                                                            <CheckSquare className="h-5 w-5" />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="truncate text-lg font-semibold text-foreground md:text-xl">
                                                                {row.name ?? text.templates.newTemplate}
                                                            </div>

                                                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                                <span>{row.item_count ?? 0} {text.templates.itemCount}</span>
                                                                <span>{text.templates.version} {row.version ?? 1}</span>
                                                                <span>{translateChecklistTarget(row.target_type, language)}</span>
                                                                <span>{row.is_active ? text.templates.statusActive : text.templates.statusInactive}</span>
                                                                {row.created_at && <span>{formatChecklistDate(row.created_at, language)}</span>}
                                                            </div>

                                                            {row.description && (
                                                                <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                                                    {row.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex shrink-0 items-center gap-6">
                                                        <div className="rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300">
                                                            {translateChecklistTarget(row.target_type, language)}
                                                        </div>
                                                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            </CardShell>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
