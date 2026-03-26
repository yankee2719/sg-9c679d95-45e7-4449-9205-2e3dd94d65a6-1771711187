import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Download,
    Factory,
    FileText,
    Filter,
    Search,
    ShieldCheck,
    FileBadge2,
    Languages,
} from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { authService } from "@/services/authService";
import { downloadCsv } from "@/lib/downloadCsv";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/feedback/EmptyState";

type DocumentRow = {
    id: string;
    title: string | null;
    description: string | null;
    category: string | null;
    language: string | null;
    regulatory_reference: string | null;
    machine_id: string | null;
    organization_id: string | null;
    version_count: number | null;
    file_size: number | null;
    updated_at: string | null;
    created_at: string | null;
};

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

function formatBytes(value: number | null | undefined) {
    if (!value || value <= 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function KpiCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">{icon}</div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function DocumentsIndexPage() {
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState < DocumentRow[] > ([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [languageFilter, setLanguageFilter] = useState("all");

    useEffect(() => {
        let alive = true;
        const load = async () => {
            setLoading(true);
            try {
                const session = await authService.getCurrentSession();
                if (!session) throw new Error("Not authenticated");

                const query = new URLSearchParams();
                if (search.trim()) query.set("q", search.trim());
                if (categoryFilter !== "all") query.set("category", categoryFilter);
                if (languageFilter !== "all") query.set("language", languageFilter);

                const response = await fetch(`/api/documents${query.toString() ? `?${query.toString()}` : ""}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });

                const text = await response.text();
                const payload = text ? JSON.parse(text) : null;
                if (!response.ok) throw new Error(payload?.error || payload?.message || `API error ${response.status}`);

                if (!alive) return;
                setDocuments((payload?.data ?? []) as DocumentRow[]);
            } catch (error) {
                console.error("Documents page load error:", error);
                if (alive) setDocuments([]);
            } finally {
                if (alive) setLoading(false);
            }
        };

        void load();
        return () => {
            alive = false;
        };
    }, [search, categoryFilter, languageFilter]);

    const categories = useMemo(() => Array.from(new Set(documents.map((d) => d.category).filter(Boolean))) as string[], [documents]);
    const languages = useMemo(() => Array.from(new Set(documents.map((d) => d.language).filter(Boolean))) as string[], [documents]);

    const stats = useMemo(() => ({
        total: documents.length,
        manuals: documents.filter((d) => d.category === "technical_manual" || d.category === "maintenance_manual").length,
        compliance: documents.filter((d) => Boolean(d.regulatory_reference)).length,
        multilingual: documents.filter((d) => Boolean(d.language)).length,
    }), [documents]);

    const exportRows = documents.map((doc) => ({
        id: doc.id,
        title: doc.title ?? "",
        category: doc.category ?? "",
        language: doc.language ?? "",
        versions: doc.version_count ?? 0,
        file_size: doc.file_size ?? 0,
        updated_at: doc.updated_at ?? "",
    }));

    return (
        <OrgContextGuard>
            <SEO title="Documents | MACHINA" />
            <MainLayout>
                <div className="space-y-6 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{t("documents.title") || "Documenti"}</h1>
                            <p className="mt-1 text-sm text-muted-foreground">{t("documents.subtitle") || "Archivio tecnico e operativo con accessi coerenti alle macchine assegnate."}</p>
                        </div>
                        <Button onClick={() => downloadCsv("documents", exportRows)} className="rounded-xl">
                            <Download className="mr-2 h-4 w-4" />
                            {t("common.export") || "Export"}
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<FileText className="h-6 w-6" />} title={t("documents.kpiTotal") || "Totale documenti"} value={stats.total} />
                        <KpiCard icon={<Factory className="h-6 w-6" />} title={t("documents.kpiManuals") || "Manuali"} value={stats.manuals} />
                        <KpiCard icon={<ShieldCheck className="h-6 w-6" />} title={t("documents.kpiCompliance") || "Con riferimenti normativi"} value={stats.compliance} />
                        <KpiCard icon={<Languages className="h-6 w-6" />} title={t("documents.kpiLanguages") || "Con lingua impostata"} value={stats.multilingual} />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    className="h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t("documents.searchPlaceholder") || "Cerca documenti"}
                                />
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border px-3">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <select className="h-11 w-full bg-transparent text-sm outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                                    <option value="all">{t("common.all") || "Tutti"}</option>
                                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border px-3">
                                <Languages className="h-4 w-4 text-muted-foreground" />
                                <select className="h-11 w-full bg-transparent text-sm outline-none" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
                                    <option value="all">{t("common.all") || "Tutti"}</option>
                                    {languages.map((lang) => <option key={lang} value={lang}>{lang.toUpperCase()}</option>)}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {loading ? (
                        <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">{t("common.loading") || "Caricamento..."}</CardContent></Card>
                    ) : documents.length === 0 ? (
                        <EmptyState title={t("documents.emptyTitle") || "Nessun documento"} description={t("documents.emptyDescription") || "Non ci sono documenti visibili per il contesto attivo."} icon={FileBadge2} />
                    ) : (
                        <div className="grid gap-4 xl:grid-cols-2">
                            {documents.map((doc) => (
                                <Card key={doc.id} className="rounded-2xl">
                                    <CardContent className="space-y-4 p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-lg font-semibold text-foreground">{doc.title || "—"}</div>
                                                <div className="mt-1 text-sm text-muted-foreground">{doc.description || "—"}</div>
                                            </div>
                                            <Badge variant="secondary" className="rounded-full">{doc.category || "other"}</Badge>
                                        </div>

                                        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                            <div>{t("documents.language") || "Lingua"}: <span className="text-foreground">{doc.language?.toUpperCase() || "—"}</span></div>
                                            <div>{t("documents.versions") || "Versioni"}: <span className="text-foreground">{doc.version_count ?? 0}</span></div>
                                            <div>{t("documents.fileSize") || "Dimensione"}: <span className="text-foreground">{formatBytes(doc.file_size)}</span></div>
                                            <div>{t("documents.updatedAt") || "Aggiornato"}: <span className="text-foreground">{formatDate(doc.updated_at, language)}</span></div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-xs text-muted-foreground">{doc.regulatory_reference || ""}</div>
                                            <Button asChild className="rounded-xl">
                                                <Link href={`/documents/${doc.id}`}>{t("documents.open") || "Apri"}</Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

