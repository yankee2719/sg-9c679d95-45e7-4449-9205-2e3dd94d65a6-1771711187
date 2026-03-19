import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Building2,
    Factory,
    GitBranch,
    Plus,
    Search,
    Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/feedback/EmptyState";

type OrgType = "manufacturer" | "customer" | null;

interface PlantRow {
    id: string;
    name: string | null;
    code: string | null;
    organization_id: string;
}

interface LineRow {
    id: string;
    name: string | null;
    code: string | null;
    plant_id: string | null;
}

interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    plant_id: string | null;
    production_line_id: string | null;
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

export default function PlantsIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [plants, setPlants] = useState < PlantRow[] > ([]);
    const [lines, setLines] = useState < LineRow[] > ([]);
    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [search, setSearch] = useState("");

    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;

            if (!orgId || orgType !== "customer") {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const [plantsRes, linesRes, machinesRes] = await Promise.all([
                    supabase
                        .from("plants")
                        .select("id, name, code, organization_id")
                        .eq("organization_id", orgId)
                        .order("name"),
                    supabase
                        .from("production_lines")
                        .select("id, name, code, plant_id")
                        .eq("organization_id", orgId)
                        .order("name"),
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id, production_line_id")
                        .eq("organization_id", orgId)
                        .eq("is_archived", false)
                        .or("is_deleted.is.null,is_deleted.eq.false"),
                ]);

                if (plantsRes.error) throw plantsRes.error;
                if (linesRes.error) throw linesRes.error;
                if (machinesRes.error) throw machinesRes.error;

                if (!active) return;

                setPlants((plantsRes.data ?? []) as PlantRow[]);
                setLines((linesRes.data ?? []) as LineRow[]);
                setMachines((machinesRes.data ?? []) as MachineRow[]);
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
    }, [authLoading, orgId, orgType]);

    const filteredPlants = useMemo(() => {
        const q = search.trim().toLowerCase();

        return plants.filter((plant) => {
            if (!q) return true;

            return [plant.name, plant.code]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q));
        });
    }, [plants, search]);

    const stats = useMemo(() => {
        return {
            plants: plants.length,
            lines: lines.length,
            machinesOnPlants: machines.filter((m) => !!m.plant_id).length,
            plantsWithMachines: new Set(
                machines.map((m) => m.plant_id).filter(Boolean)
            ).size,
        };
    }, [plants, lines, machines]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Stabilimenti - MACHINA" />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Caricamento stabilimenti...
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!orgId || orgType !== "customer") {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Stabilimenti - MACHINA" />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                La gestione stabilimenti è disponibile nel contesto cliente finale.
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
                <SEO title="Stabilimenti - MACHINA" />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                Stabilimenti
                            </h1>
                            <p className="text-base text-muted-foreground">
                                Gestisci stabilimenti e linee del cliente finale attivo.
                            </p>
                        </div>

                        {canEdit && (
                            <Link href="/plants/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nuovo stabilimento
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            icon={<Building2 className="h-5 w-5" />}
                            title="Stabilimenti"
                            value={stats.plants}
                        />
                        <KpiCard
                            icon={<GitBranch className="h-5 w-5" />}
                            title="Linee"
                            value={stats.lines}
                        />
                        <KpiCard
                            icon={<Wrench className="h-5 w-5" />}
                            title="Macchine posizionate"
                            value={stats.machinesOnPlants}
                        />
                        <KpiCard
                            icon={<Factory className="h-5 w-5" />}
                            title="Stabilimenti con macchine"
                            value={stats.plantsWithMachines}
                        />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cerca stabilimento..."
                                    className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            {filteredPlants.length === 0 ? (
                                <EmptyState
                                    title="Nessuno stabilimento trovato"
                                    description="Non ci sono stabilimenti nel contesto attivo oppure nessun elemento corrisponde alla ricerca."
                                    icon={<Building2 className="h-10 w-10" />}
                                    actionLabel={canEdit ? "Crea stabilimento" : undefined}
                                    actionHref={canEdit ? "/plants/new" : undefined}
                                    secondaryActionLabel="Apri macchine"
                                    secondaryActionHref="/equipment"
                                />
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredPlants.map((plant) => {
                                        const lineCount = lines.filter(
                                            (line) => line.plant_id === plant.id
                                        ).length;
                                        const machineCount = machines.filter(
                                            (machine) => machine.plant_id === plant.id
                                        ).length;

                                        return (
                                            <Link
                                                key={plant.id}
                                                href={`/plants/${plant.id}`}
                                                className="block"
                                            >
                                                <div className="rounded-2xl border border-border p-5 transition hover:bg-muted/30">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="text-xl font-semibold text-foreground">
                                                                {plant.name || "Stabilimento"}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {plant.code || "—"}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div className="rounded-xl bg-muted p-3">
                                                                <div className="text-muted-foreground">
                                                                    Linee
                                                                </div>
                                                                <div className="font-medium text-foreground">
                                                                    {lineCount}
                                                                </div>
                                                            </div>

                                                            <div className="rounded-xl bg-muted p-3">
                                                                <div className="text-muted-foreground">
                                                                    Macchine
                                                                </div>
                                                                <div className="font-medium text-foreground">
                                                                    {machineCount}
                                                                </div>
                                                            </div>
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