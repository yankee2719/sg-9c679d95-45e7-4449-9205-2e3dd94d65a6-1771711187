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
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { downloadCsv } from "@/lib/downloadCsv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/feedback/EmptyState";

type OrgType = "manufacturer" | "customer" | null;

interface DocumentRow {
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
    is_archived?: boolean | null;
}

interface MachineLabelRow {
    id: string;
    name: string | null;
    internal_code: string | null;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString("it-IT", {
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

function categoryLabel(value: string | null | undefined) {
    if (!value) return "Altro";

    const map: Record<string, string> = {
        technical_manual: "Manuale tecnico",
        risk_assessment: "Valutazione rischi",
        ce_declaration: "Dichiarazione CE",
        electrical_schema: "Schema elettrico",
        maintenance_manual: "Manuale manutenzione",
        spare_parts_catalog: "Catalogo ricambi",
        training_material: "Materiale formazione",
        inspection_report: "Rapporto ispezione",
        certificate: "Certificato",
        photo: "Foto",
        video: "Video",
        other: "Altro",
    };

    return map[value] ?? value;
}

function KpiCard({
    icon,
    title,
    value,
}: {
    icon: React.ReactNode;
    title: string;
    value: number;
}) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function DocumentsIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState < DocumentRow[] > ([]);
    const [machineMap, setMachineMap] = useState < Map < string, string>> (new Map());

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [languageFilter, setLanguageFilter] = useState("all");

    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";

    useEffect(() => {
        let active = true;

        const loadDocuments = async () => {
            if (authLoading) return;

            if (!orgId || !orgType) {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                let docRows: DocumentRow[] = [];

                if (orgType === "manufacturer") {
                    const { data, error } = await supabase
                        .from("documents")
                        .select(
                            "id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, updated_at, created_at, is_archived"
                        )
                        .eq("organization_id", orgId)
                        .eq("is_archived", false)
                        .order("updated_at", { ascending: false });

                    if (error) throw error;
                    docRows = (data ?? []) as DocumentRow[];
                } else {
                    const [{ data: ownMachines, error: ownMachinesError }, { data: assignments, error: assignmentsError }] =
                        await Promise.all([
                            supabase
                                .from("machines")
                                .select("id")
                                .eq("organization_id", orgId)
                                .eq("is_archived", false)
                                .or("is_deleted.is.null,is_deleted.eq.false"),
                            supabase
                                .from("machine_assignments")
                                .select("machine_id")
                                .eq("customer_org_id", orgId)
                                .eq("is_active", true),
                        ]);

                    if (ownMachinesError) throw ownMachinesError;
                    if (assignmentsError) throw assignmentsError;

                    const accessibleMachineIds = Array.from(
                        new Set([
                            ...(ownMachines ?? []).map((row: any) => row.id),
                            ...(assignments ?? []).map((row: any) => row.machine_id),
                        ].filter(Boolean))
                    );

                    const [{ data: orgDocs, error: orgDocsError }, machineDocsRes] = await Promise.all([
                        supabase
                            .from("documents")
                            .select(
                                "id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, updated_at, created_at, is_archived"
                            )
                            .eq("organization_id", orgId)
                            .eq("is_archived", false)
                            .order("updated_at", { ascending: false }),
                        accessibleMachineIds.length > 0
                            ? supabase
                                .from("documents")
                                .select(
                                    "id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, updated_at, created_at, is_archived"
                                )
                                .in("machine_id", accessibleMachineIds)
                                .eq("is_archived", false)
                                .order("updated_at", { ascending: false })
                            : Promise.resolve({ data: [], error: null } as any),
                    ]);

                    if (orgDocsError) throw orgDocsError;
                    if (machineDocsRes.error) throw machineDocsRes.error;

                    const merged = new Map < string, DocumentRow> ();
                    for (const row of orgDocs ?? []) merged.set((row as any).id, row as DocumentRow);
                    for (const row of machineDocsRes.data ?? []) {
                        merged.set((row as any).id, row as DocumentRow);
                    }

                    docRows = Array.from(merged.values()).sort((a, b) => {
                        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                        const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                        return db - da;
                    });
                }

                const machineIds = Array.from(
                    new Set(docRows.map((row) => row.machine_id).filter(Boolean))
                ) as string[];

                let labelMap = new Map < string, string> ();
                if (machineIds.length > 0) {
                    const { data: machines, error: machinesError } = await supabase
                        .from("machines")
                        .select("id, name, internal_code")
                        .in("id", machineIds);

                    if (machinesError) throw machinesError;

                    labelMap = new Map(
                        ((machines ?? []) as MachineLabelRow[]).map((row) => [
                            row.id,
                            row.name || row.internal_code || row.id,
                        ])
                    );
                }

                if (!active) return;

                setDocuments(docRows);
                setMachineMap(labelMap);
            } catch (error) {
                console.error("Documents index load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadDocuments();

        return () => {
            active = false;
        };
    }, [authLoading, orgId, orgType]);

    const categories = useMemo(() => {
        return Array.from(
            new Set(documents.map((row) => row.category).filter(Boolean))
        ) as string[];
    }, [documents]);

    const languages = useMemo(() => {
        return Array.from(
            new Set(documents.map((row) => row.language).filter(Boolean))
        ) as string[];
    }, [documents]);

    const filteredDocuments = useMemo(() => {
        const q = search.trim().toLowerCase();

        return documents.filter((row) => {
            const matchesSearch =
                !q ||
                [
                    row.title,
                    row.description,
                    row.category,
                    row.language,
                    row.regulatory_reference,
                    row.machine_id ? machineMap.get(row.machine_id) : "",
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(q));

            const matchesCategory =
                categoryFilter === "all" || row.category === categoryFilter;

            const matchesLanguage =
                languageFilter === "all" || row.language === languageFilter;

            return matchesSearch && matchesCategory && matchesLanguage;
        });
    }, [documents, search, categoryFilter, languageFilter, machineMap]);

    const stats = useMemo(() => {
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        return {
            total: documents.length,
            linkedToMachines: documents.filter((row) => !!row.machine_id).length,
            multilingual: new Set(documents.map((row) => row.language).filter(Boolean)).size,
            updatedLast30d: documents.filter((row) => {
                if (!row.updated_at) return false;
                return now - new Date(row.updated_at).getTime() <= thirtyDaysMs;
            }).length,
        };
    }, [documents]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Documenti - MACHINA" />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Caricamento archivio documentale...
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Documenti - MACHINA" />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                Archivio documentale
                            </h1>
                            <p className="text-base text-muted-foreground">
                                Vista globale dei documenti tecnici, normativi e operativi nel contesto attivo.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => downloadCsv("/api/export/documents", "documenti.csv")}>
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            icon={<FileText className="h-5 w-5" />}
                            title="Documenti attivi"
                            value={stats.total}
                        />
                        <KpiCard
                            icon={<Factory className="h-5 w-5" />}
                            title="Collegati a macchina"
                            value={stats.linkedToMachines}
                        />
                        <KpiCard
                            icon={<Languages className="h-5 w-5" />}
                            title="Lingue presenti"
                            value={stats.multilingual}
                        />
                        <KpiCard
                            icon={<ShieldCheck className="h-5 w-5" />}
                            title="Aggiornati ultimi 30 gg"
                            value={stats.updatedLast30d}
                        />
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filtri archivio
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cerca titolo, categoria, norma, macchina..."
                                    className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>

                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none"
                            >
                                <option value="all">Tutte le categorie</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {categoryLabel(category)}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={languageFilter}
                                onChange={(e) => setLanguageFilter(e.target.value)}
                                className="h-11 rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none"
                            >
                                <option value="all">Tutte le lingue</option>
                                {languages.map((lang) => (
                                    <option key={lang} value={lang}>
                                        {lang}
                                    </option>
                                ))}
                            </select>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Registro documenti</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {filteredDocuments.length === 0 ? (
                                <EmptyState
                                    title="Nessun documento trovato"
                                    description="L’archivio documentale è vuoto oppure nessun elemento corrisponde ai filtri correnti."
                                    icon={<FileBadge2 className="h-10 w-10" />}
                                    actionLabel="Apri macchine"
                                    actionHref="/equipment"
                                    secondaryActionLabel="Vai a work orders"
                                    secondaryActionHref="/work-orders"
                                />
                            ) : (
                                <div className="space-y-4">
                                    {filteredDocuments.map((row) => {
                                        const machineLabel = row.machine_id
                                            ? machineMap.get(row.machine_id) || row.machine_id
                                            : null;

                                        return (
                                            <div
                                                key={row.id}
                                                className="rounded-2xl border border-border p-4 transition hover:bg-muted/30"
                                            >
                                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                    <div className="min-w-0 space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="truncate text-lg font-semibold text-foreground">
                                                                {row.title || "Documento"}
                                                            </div>

                                                            <Badge variant="outline">
                                                                {categoryLabel(row.category)}
                                                            </Badge>

                                                            {row.language && (
                                                                <Badge variant="secondary">
                                                                    {row.language}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {row.description && (
                                                            <div className="text-sm text-muted-foreground">
                                                                {row.description}
                                                            </div>
                                                        )}

                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                            <span>
                                                                Versioni: {row.version_count ?? 1}
                                                            </span>
                                                            <span>
                                                                Size: {formatBytes(row.file_size)}
                                                            </span>
                                                            <span>
                                                                Aggiornato: {formatDate(row.updated_at)}
                                                            </span>
                                                            {row.regulatory_reference && (
                                                                <span>
                                                                    Norma: {row.regulatory_reference}
                                                                </span>
                                                            )}
                                                            {machineLabel && (
                                                                <span>Macchina: {machineLabel}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {row.machine_id ? (
                                                            <Button variant="outline" asChild>
                                                                <Link
                                                                    href={`/equipment/${row.machine_id}#machine-documents`}
                                                                >
                                                                    Apri macchina
                                                                </Link>
                                                            </Button>
                                                        ) : (
                                                            <Button variant="outline" asChild>
                                                                <Link href="/equipment">
                                                                    Vai a macchine
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}