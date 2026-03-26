import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Search, Filter, Factory, Building2 } from "lucide-react";
import { apiFetch } from "@/services/apiClient";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DocumentRow {
    id: string;
    title: string | null;
    description: string | null;
    category: string | null;
    language: string | null;
    regulatory_reference: string | null;
    machine_id: string | null;
    machine_label: string | null;
    organization_id: string | null;
    version_count: number | null;
    file_size: number | null;
    updated_at: string | null;
    created_at: string | null;
    tags?: string[] | null;
}

type FallbackMap = Record<Language, string>;

const fb = (language: Language, map: FallbackMap) => map[language] || map.en;

function formatDate(value: string | null | undefined, lang: string) {
    if (!value) return "—";
    try {
        const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
        return new Date(value).toLocaleString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
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

export default function DocumentsIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();
    const { t, language } = useLanguage();
    const tr = (key: string, map: FallbackMap) => {
        const value = t(key);
        return value === key ? fb(language, map) : value;
    };

    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState < DocumentRow[] > ([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");

    useEffect(() => {
        if (authLoading || !organization?.id) return;
        let mounted = true;
        setLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (category !== "all") params.set("category", category);
        apiFetch < any > (`/api/documents?${params.toString()}`)
            .then((payload) => {
                if (!mounted) return;
                setDocuments(payload.documents ?? []);
            })
            .catch((error) => {
                console.error("Documents load error:", error);
                if (mounted) setDocuments([]);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [authLoading, organization?.id, search, category]);

    const categories = useMemo(
        () => Array.from(new Set(documents.map((row) => row.category).filter(Boolean))) as string[],
        [documents]
    );
    const userRole = membership?.role ?? "technician";
    const orgType = organization?.type ?? null;

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${tr("documents.title", { it: "Documenti", en: "Documents", fr: "Documents", es: "Documentos" })} - MACHINA`} />
                <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {tr("documents.title", { it: "Documenti", en: "Documents", fr: "Documents", es: "Documentos" })}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {tr("documents.subtitle", {
                                    it: "Documentazione tecnica e operativa",
                                    en: "Technical and operational documents",
                                    fr: "Documents techniques et opérationnels",
                                    es: "Documentos técnicos y operativos",
                                })}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {orgType === "manufacturer" ? <Factory className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            <span>
                                {orgType === "manufacturer"
                                    ? tr("documents.manufacturerView", { it: "Vista costruttore", en: "Manufacturer view", fr: "Vue constructeur", es: "Vista fabricante" })
                                    : tr("documents.customerView", { it: "Vista cliente", en: "Customer view", fr: "Vue client", es: "Vista cliente" })}
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{tr("documents.total", { it: "Documenti totali", en: "Total documents", fr: "Documents totaux", es: "Documentos totales" })}</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-semibold">{documents.length}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{tr("documents.categories", { it: "Categorie", en: "Categories", fr: "Catégories", es: "Categorías" })}</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-semibold">{categories.length}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{tr("documents.withMachine", { it: "Con macchina", en: "With machine", fr: "Avec machine", es: "Con máquina" })}</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-semibold">{documents.filter((row) => !!row.machine_id).length}</div></CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_220px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={tr("documents.search", { it: "Cerca documenti", en: "Search documents", fr: "Rechercher des documents", es: "Buscar documentos" })}
                                    className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none">
                                    <option value="all">{tr("common.all", { it: "Tutti", en: "All", fr: "Tous", es: "Todos" })}</option>
                                    {categories.map((item) => (<option key={item} value={item}>{item}</option>))}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {loading ? (
                            <Card><CardContent className="p-6 text-sm text-muted-foreground">{tr("common.loading", { it: "Caricamento...", en: "Loading...", fr: "Chargement...", es: "Cargando..." })}</CardContent></Card>
                        ) : documents.length === 0 ? (
                            <Card><CardContent className="p-6 text-sm text-muted-foreground">{tr("documents.noResults", { it: "Nessun documento trovato", en: "No documents found", fr: "Aucun document trouvé", es: "No se encontraron documentos" })}</CardContent></Card>
                        ) : documents.map((doc) => (
                            <Link key={doc.id} href={`/documents/${doc.id}`} className="block">
                                <Card className="transition hover:-translate-y-0.5 hover:border-orange-500/40">
                                    <CardContent className="flex items-start justify-between gap-4 p-5">
                                        <div className="min-w-0 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500"><FileText className="h-5 w-5" /></div>
                                                <div>
                                                    <div className="truncate text-lg font-semibold text-foreground">{doc.title || tr("documents.title", { it: "Documento", en: "Document", fr: "Document", es: "Documento" })}</div>
                                                    <div className="text-sm text-muted-foreground">{doc.machine_label || tr("documents.noMachine", { it: "Documento generale", en: "General document", fr: "Document général", es: "Documento general" })}</div>
                                                </div>
                                            </div>
                                            {doc.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{doc.description}</p> : null}
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <Badge variant="secondary">{doc.category || "other"}</Badge>
                                                <span>{formatBytes(doc.file_size)}</span>
                                                <span>{tr("documents.versions", { it: "Versioni", en: "Versions", fr: "Versions", es: "Versiones" })}: {doc.version_count || 1}</span>
                                                <span>{formatDate(doc.updated_at, language)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
