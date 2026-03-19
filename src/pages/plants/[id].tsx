import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    ArrowLeft,
    Building2,
    Factory,
    GitBranch,
    Loader2,
    Pencil,
    Plus,
    Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    lifecycle_state: string | null;
    plant_id: string | null;
    production_line_id: string | null;
}

function InfoCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-border p-4">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div>
                    <div className="text-sm text-muted-foreground">{title}</div>
                    <div className="mt-1 text-xl font-semibold text-foreground">
                        {value}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PlantDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { loading: authLoading, organization, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [savingLine, setSavingLine] = useState(false);
    const [plant, setPlant] = useState < PlantRow | null > (null);
    const [lines, setLines] = useState < LineRow[] > ([]);
    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [lineName, setLineName] = useState("");
    const [lineCode, setLineCode] = useState("");

    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);

    const resolvedId = useMemo(() => {
        return typeof id === "string" ? id : null;
    }, [id]);

    const loadAll = async (plantId: string, currentOrgId: string) => {
        const [plantRes, linesRes, machinesRes] = await Promise.all([
            supabase
                .from("plants")
                .select("id, name, code, organization_id")
                .eq("id", plantId)
                .maybeSingle(),
            supabase
                .from("production_lines")
                .select("id, name, code, plant_id")
                .eq("organization_id", currentOrgId)
                .eq("plant_id", plantId)
                .order("name"),
            supabase
                .from("machines")
                .select(
                    "id, name, internal_code, lifecycle_state, plant_id, production_line_id"
                )
                .eq("organization_id", currentOrgId)
                .eq("plant_id", plantId)
                .eq("is_archived", false)
                .or("is_deleted.is.null,is_deleted.eq.false")
                .order("name"),
        ]);

        if (plantRes.error) throw plantRes.error;
        if (linesRes.error) throw linesRes.error;
        if (machinesRes.error) throw machinesRes.error;

        const plantRow = plantRes.data as PlantRow | null;
        if (!plantRow || plantRow.organization_id !== currentOrgId) {
            throw new Error("Plant not found in active context");
        }

        setPlant(plantRow);
        setLines((linesRes.data ?? []) as LineRow[]);
        setMachines((machinesRes.data ?? []) as MachineRow[]);
    };

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;

            if (!resolvedId || !orgId || orgType !== "customer") {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                await loadAll(resolvedId, orgId);
            } catch (error) {
                console.error("Plant detail load error:", error);
                void router.replace("/plants");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, resolvedId, orgId, orgType, router]);

    const lineMachineMap = useMemo(() => {
        const map = new Map < string, number> ();

        for (const machine of machines) {
            if (!machine.production_line_id) continue;
            map.set(
                machine.production_line_id,
                (map.get(machine.production_line_id) ?? 0) + 1
            );
        }

        return map;
    }, [machines]);

    const handleCreateLine = async () => {
        if (!orgId || !plant || !canEdit) return;

        if (!lineName.trim()) {
            toast({
                title: "Errore",
                description: "Inserisci il nome della linea.",
                variant: "destructive",
            });
            return;
        }

        setSavingLine(true);

        try {
            const { error } = await supabase.from("production_lines").insert({
                organization_id: orgId,
                plant_id: plant.id,
                name: lineName.trim(),
                code: lineCode.trim() || null,
            });

            if (error) throw error;

            setLineName("");
            setLineCode("");

            await loadAll(plant.id, orgId);

            toast({
                title: "Linea creata",
                description: "La nuova linea è stata aggiunta allo stabilimento.",
            });
        } catch (error: any) {
            console.error("Create line error:", error);
            toast({
                title: "Errore",
                description: error?.message || "Errore creazione linea",
                variant: "destructive",
            });
        } finally {
            setSavingLine(false);
        }
    };

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Stabilimento - MACHINA" />
                    <div className="mx-auto max-w-6xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Caricamento stabilimento...
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!orgId || orgType !== "customer" || !plant) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Stabilimento - MACHINA" />
                    <div className="mx-auto max-w-6xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Stabilimento non disponibile nel contesto attivo.
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
                <SEO title={`${plant.name || "Stabilimento"} - MACHINA`} />

                <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/plants">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold">
                                    {plant.name || "Stabilimento"}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {plant.code || "—"}
                                </p>
                            </div>
                        </div>

                        {canEdit && (
                            <Link href={`/plants/${plant.id}/edit`}>
                                <Button variant="outline">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Modifica stabilimento
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <InfoCard
                            title="Linee"
                            value={lines.length}
                            icon={<GitBranch className="h-5 w-5" />}
                        />
                        <InfoCard
                            title="Macchine"
                            value={machines.length}
                            icon={<Wrench className="h-5 w-5" />}
                        />
                        <InfoCard
                            title="Codice"
                            value={plant.code || "—"}
                            icon={<Building2 className="h-5 w-5" />}
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GitBranch className="h-5 w-5" />
                                    Linee dello stabilimento
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {canEdit && (
                                    <div className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-[1fr_1fr_auto]">
                                        <div className="space-y-2">
                                            <FieldLabel>Nome linea</FieldLabel>
                                            <Input
                                                value={lineName}
                                                onChange={(e) => setLineName(e.target.value)}
                                                placeholder="Es. Linea triturazione"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <FieldLabel>Codice linea</FieldLabel>
                                            <Input
                                                value={lineCode}
                                                onChange={(e) => setLineCode(e.target.value)}
                                                placeholder="Es. LN-TRIT-01"
                                            />
                                        </div>

                                        <div className="flex items-end">
                                            <Button
                                                onClick={handleCreateLine}
                                                disabled={savingLine}
                                                className="w-full md:w-auto"
                                            >
                                                {savingLine ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Plus className="mr-2 h-4 w-4" />
                                                )}
                                                Aggiungi linea
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {lines.length === 0 ? (
                                    <EmptyState
                                        title="Nessuna linea presente"
                                        description="Aggiungi almeno una linea per completare il contesto operativo dello stabilimento."
                                        icon={<GitBranch className="h-10 w-10" />}
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {lines.map((line) => (
                                            <div
                                                key={line.id}
                                                className="rounded-2xl border border-border p-4"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className="font-semibold text-foreground">
                                                            {line.name || "Linea"}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {line.code || "—"}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-xl bg-muted px-3 py-2 text-sm">
                                                        {lineMachineMap.get(line.id) ?? 0} macchine
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Factory className="h-5 w-5" />
                                    Macchine nello stabilimento
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {machines.length === 0 ? (
                                    <EmptyState
                                        title="Nessuna macchina nello stabilimento"
                                        description="Le macchine assegnate a questo stabilimento compariranno qui."
                                        icon={<Factory className="h-10 w-10" />}
                                        actionLabel="Apri macchine"
                                        actionHref="/equipment"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {machines.map((machine) => (
                                            <Link
                                                key={machine.id}
                                                href={`/equipment/${machine.id}`}
                                                className="block"
                                            >
                                                <div className="rounded-2xl border border-border p-4 transition hover:bg-muted/30">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <div className="font-semibold text-foreground">
                                                                {machine.name || "Macchina"}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {machine.internal_code || "—"}
                                                            </div>
                                                            <div className="mt-1 text-xs text-muted-foreground">
                                                                Linea:{" "}
                                                                {machine.production_line_id
                                                                    ? lines.find(
                                                                        (line) =>
                                                                            line.id ===
                                                                            machine.production_line_id
                                                                    )?.name ||
                                                                    machine.production_line_id
                                                                    : "Non assegnata"}
                                                            </div>
                                                        </div>

                                                        {machine.lifecycle_state && (
                                                            <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                                {machine.lifecycle_state}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <div className="text-sm font-medium text-foreground">{children}</div>;
}