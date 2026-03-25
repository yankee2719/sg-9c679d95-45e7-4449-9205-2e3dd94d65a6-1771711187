import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Building2,
    GitBranch,
    Loader2,
    Plus,
    Search,
    Wrench,
} from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { listPlants, type PlantSummary } from "@/services/plantService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/feedback/EmptyState";
import { Input } from "@/components/ui/input";

type OrgType = "manufacturer" | "customer" | null;

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

export default function PlantsIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [plants, setPlants] = useState < PlantSummary[] > ([]);
    const [search, setSearch] = useState("");

    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;
            if (orgType !== "customer") {
                if (active) setLoading(false);
                return;
            }

            try {
                const data = await listPlants();
                if (!active) return;
                setPlants(data);
            } catch (error) {
                console.error("Plants page load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, orgType]);

    const filteredPlants = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return plants;

        return plants.filter((plant) => {
            const values = [
                plant.name,
                plant.code,
                ...plant.lines.map((line) => line.name),
                ...plant.lines.map((line) => line.code),
            ];

            return values
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [plants, search]);

    const stats = useMemo(() => {
        return plants.reduce(
            (acc, plant) => {
                acc.plants += 1;
                acc.lines += plant.lines_count;
                acc.machines += plant.machines_count;
                if (plant.machines_count > 0) acc.plantsWithMachines += 1;
                return acc;
            },
            { plants: 0, lines: 0, machines: 0, plantsWithMachines: 0 }
        );
    }, [plants]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${t("plants.title")} - MACHINA`} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {t("plants.loading")}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (orgType !== "customer") {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${t("plants.title")} - MACHINA`} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {t("plants.customerOnly") ||
                                    "La gestione stabilimenti è disponibile nel contesto cliente finale."}
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
                <SEO title={`${t("plants.title")} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                {t("plants.title")}
                            </h1>
                            <p className="text-base text-muted-foreground">
                                {t("plants.subtitle")}
                            </p>
                        </div>

                        {canEdit && (
                            <Link href="/plants/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t("plants.new") || "Nuovo stabilimento"}
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            icon={<Building2 className="h-5 w-5" />}
                            title={t("plants.title")}
                            value={stats.plants}
                        />
                        <KpiCard
                            icon={<GitBranch className="h-5 w-5" />}
                            title={t("plants.lines") || "Linee"}
                            value={stats.lines}
                        />
                        <KpiCard
                            icon={<Wrench className="h-5 w-5" />}
                            title={t("machines.title") || "Macchine"}
                            value={stats.machines}
                        />
                        <KpiCard
                            icon={<Building2 className="h-5 w-5" />}
                            title={t("plants.withMachines") || "Stabilimenti con macchine"}
                            value={stats.plantsWithMachines}
                        />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="p-5">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={
                                        t("plants.search") || "Cerca stabilimento, codice o linea..."
                                    }
                                    className="pl-10"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {filteredPlants.length === 0 ? (
                        <EmptyState
                            title={t("plants.noResults") || "Nessuno stabilimento trovato."}
                            description={
                                canEdit
                                    ? t("plants.emptyDescription") ||
                                    "Crea il primo stabilimento per iniziare a posizionare macchine e linee."
                                    : t("plants.emptyDescriptionReadOnly") ||
                                    "Non ci sono stabilimenti nel contesto attivo."
                            }
                            icon={<Building2 className="h-10 w-10" />}
                            actionLabel={
                                canEdit ? t("plants.new") || "Nuovo stabilimento" : undefined
                            }
                            actionHref={canEdit ? "/plants/new" : undefined}
                        />
                    ) : (
                        <div className="grid gap-5 xl:grid-cols-2">
                            {filteredPlants.map((plant) => (
                                <Link key={plant.id} href={`/plants/${plant.id}`} className="block">
                                    <Card className="h-full rounded-2xl transition hover:border-orange-500/30 hover:bg-muted/20">
                                        <CardContent className="space-y-5 p-6">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <h2 className="truncate text-xl font-semibold text-foreground">
                                                        {plant.name || t("plants.fallbackPlant") || "Stabilimento"}
                                                    </h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {plant.code || "—"}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground">
                                                    {plant.machines_count}{" "}
                                                    {t("machines.title")?.toLowerCase() || "macchine"}
                                                </div>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-2xl border border-border p-4">
                                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                        {t("plants.lines") || "Linee"}
                                                    </div>
                                                    <div className="mt-2 text-2xl font-bold text-foreground">
                                                        {plant.lines_count}
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-border p-4">
                                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                        {t("machines.title") || "Macchine"}
                                                    </div>
                                                    <div className="mt-2 text-2xl font-bold text-foreground">
                                                        {plant.machines_count}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-sm font-medium text-foreground">
                                                    {t("plants.linkedLines") || "Linee collegate"}
                                                </div>

                                                {plant.lines.length === 0 ? (
                                                    <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                                                        {t("plants.noLinkedLines") ||
                                                            "Nessuna linea collegata"}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {plant.lines.slice(0, 6).map((line) => (
                                                            <span
                                                                key={line.id}
                                                                className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
                                                            >
                                                                {line.name || t("plants.fallbackLine") || "Linea"}
                                                            </span>
                                                        ))}

                                                        {plant.lines.length > 6 && (
                                                            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                                                +{plant.lines.length - 6}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
