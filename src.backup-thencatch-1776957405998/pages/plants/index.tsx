import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Factory, GitBranch, Plus, Search, Wrench } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { hasMinimumOrgRole } from "@/lib/roles";
import { useLanguage } from "@/contexts/LanguageContext";
import { listPlantsOverview, type LineRow, type MachineRow, type PlantRow } from "@/services/plantService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/feedback/EmptyState";

type OrgType = "manufacturer" | "customer" | null;

function KpiCard({ icon, title, value }: { icon: ReactNode; title: string; value: number }) {
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
    const tx = (key: string, fallback: string) => {
        const value = t(key);
        return value === key ? fallback : value;
    };

    const [loading, setLoading] = useState(true);
    const [plants, setPlants] = useState<PlantRow[]>([]);
    const [lines, setLines] = useState<LineRow[]>([]);
    const [machines, setMachines] = useState<MachineRow[]>([]);
    const [search, setSearch] = useState("");

    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";
    const canEdit = hasMinimumOrgRole(userRole, "supervisor");

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;
            if (orgType !== "customer") {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const data = await listPlantsOverview();
                if (!active) return;
                setPlants(data.plants ?? []);
                setLines(data.lines ?? []);
                setMachines(data.machines ?? []);
            } catch (error) {
                console.error("Plants load error:", error);
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
        const q = search.trim().toLowerCase();
        return plants.filter((plant) => {
            if (!q) return true;
            return [plant.name, plant.code]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q));
        });
    }, [plants, search]);

    const lineCountByPlant = useMemo(() => {
        const map = new Map<string, number>();
        for (const line of lines) {
            if (!line.plant_id) continue;
            map.set(line.plant_id, (map.get(line.plant_id) ?? 0) + 1);
        }
        return map;
    }, [lines]);

    const machineCountByPlant = useMemo(() => {
        const map = new Map<string, number>();
        for (const machine of machines) {
            if (!machine.plant_id) continue;
            map.set(machine.plant_id, (map.get(machine.plant_id) ?? 0) + 1);
        }
        return map;
    }, [machines]);

    const stats = useMemo(
        () => ({
            plants: plants.length,
            lines: lines.length,
            machinesOnPlants: machines.filter((row) => !!row.plant_id).length,
            plantsWithMachines: new Set(machines.map((row) => row.plant_id).filter(Boolean)).size,
        }),
        [plants, lines, machines]
    );

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${tx("plants.title", "Stabilimenti")} - MACHINA`} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {tx("plants.loading", "Caricamento stabilimenti...")}
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
                    <SEO title={`${tx("plants.title", "Stabilimenti")} - MACHINA`} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {tx("plants.customerOnly", "La gestione stabilimenti è disponibile solo nel contesto cliente finale.")}
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
                <SEO title={`${tx("plants.title", "Stabilimenti")} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                {tx("plants.title", "Stabilimenti")}
                            </h1>
                            <p className="text-base text-muted-foreground">
                                {tx("plants.subtitle", "Gestisci stabilimenti, linee e posizionamento macchine.")}
                            </p>
                        </div>

                        {canEdit && (
                            <Link href="/plants/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {tx("plants.new", "Nuovo Stabilimento")}
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<Building2 className="h-5 w-5" />} title={tx("plants.title", "Stabilimenti")} value={stats.plants} />
                        <KpiCard icon={<GitBranch className="h-5 w-5" />} title={tx("plants.lines", "Linee")} value={stats.lines} />
                        <KpiCard icon={<Wrench className="h-5 w-5" />} title={tx("plants.machinesPlaced", "Macchine posizionate")} value={stats.machinesOnPlants} />
                        <KpiCard icon={<Factory className="h-5 w-5" />} title={tx("plants.plantsWithMachines", "Stabilimenti con macchine")} value={stats.plantsWithMachines} />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={tx("plants.search", "Cerca per nome o codice")}
                                    className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            {filteredPlants.length === 0 ? (
                                <EmptyState
                                    title={tx("plants.emptyTitle", "Nessuno stabilimento trovato")}
                                    description={tx("plants.emptyDesc", "Crea il primo stabilimento per strutturare macchine e linee produttive.")}
                                    icon={<Building2 className="h-10 w-10" />}
                                    actionLabel={canEdit ? tx("plants.new", "Nuovo Stabilimento") : undefined}
                                    actionHref={canEdit ? "/plants/new" : undefined}
                                />
                            ) : (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    {filteredPlants.map((plant) => {
                                        const linesCount = lineCountByPlant.get(plant.id) ?? 0;
                                        const machinesCount = machineCountByPlant.get(plant.id) ?? 0;

                                        return (
                                            <Link key={plant.id} href={`/plants/${plant.id}`} className="block">
                                                <div className="rounded-2xl border border-border p-5 transition hover:bg-muted/30">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <div className="text-lg font-semibold text-foreground">
                                                                {plant.name || t("plants.title") || "Plant"}
                                                            </div>
                                                            <div className="mt-1 text-sm text-muted-foreground">
                                                                {plant.code || "—"}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                            {machinesCount} {t("machines.title") || "machines"}
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                        <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                                {tx("plants.lines", "Linee")}
                                                            </div>
                                                            <div className="mt-1 text-2xl font-semibold text-foreground">{linesCount}</div>
                                                        </div>
                                                        <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                                                {t("machines.title") || "Machines"}
                                                            </div>
                                                            <div className="mt-1 text-2xl font-semibold text-foreground">{machinesCount}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
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
