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
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
    createProductionLine,
    getPlant,
    type PlantDetail,
} from "@/services/plantService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/feedback/EmptyState";

type OrgType = "manufacturer" | "customer" | null;

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
                    <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
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
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [savingLine, setSavingLine] = useState(false);
    const [data, setData] = useState < PlantDetail | null > (null);
    const [lineName, setLineName] = useState("");
    const [lineCode, setLineCode] = useState("");

    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole);
    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);

    const loadPlantDetail = async (plantId: string) => {
        const result = await getPlant(plantId);
        setData(result);
    };

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;
            if (!resolvedId || orgType !== "customer") {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const result = await getPlant(resolvedId);
                if (!active) return;
                setData(result);
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
    }, [authLoading, orgType, resolvedId, router]);

    const lineMachineMap = useMemo(() => {
        const map = new Map < string, number> ();
        for (const machine of data?.machines ?? []) {
            if (!machine.production_line_id) continue;
            map.set(
                machine.production_line_id,
                (map.get(machine.production_line_id) ?? 0) + 1
            );
        }
        return map;
    }, [data?.machines]);

    const handleCreateLine = async () => {
        if (!data?.plant?.id || !canEdit) return;

        const name = lineName.trim();
        if (!name) {
            toast({
                title: t("common.error") || "Errore",
                description:
                    t("plants.errorLineNameRequired") ||
                    "Inserisci il nome della linea.",
                variant: "destructive",
            });
            return;
        }

        setSavingLine(true);

        try {
            await createProductionLine({
                plant_id: data.plant.id,
                name,
                code: lineCode.trim() || null,
            });

            setLineName("");
            setLineCode("");
            await loadPlantDetail(data.plant.id);

            toast({
                title: t("plants.lineCreated") || "Linea creata",
                description:
                    t("plants.lineCreatedDesc") ||
                    "La nuova linea è stata aggiunta.",
            });
        } catch (error: any) {
            console.error("Create production line error:", error);
            toast({
                title: t("common.error") || "Errore",
                description:
                    error?.message ||
                    t("plants.errorLineCreate") ||
                    "Errore creazione linea",
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
                    <SEO title={`${t("plants.title")} - MACHINA`} />
                    <div className="mx-auto max-w-6xl px-4 py-8">
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

    if (orgType !== "customer" || !data?.plant) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${t("plants.title")} - MACHINA`} />
                    <div className="mx-auto max-w-6xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {t("plants.notAvailable") ||
                                    "Stabilimento non disponibile nel contesto attivo."}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    const { plant, lines, machines } = data;

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${plant.name || t("plants.title")} - MACHINA`} />

                <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/plants">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>

                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                    {plant.name || t("plants.title")}
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
                                    {t("plants.edit") || "Modifica"}
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <InfoCard
                            title={t("plants.lines") || "Linee"}
                            value={lines.length}
                            icon={<GitBranch className="h-5 w-5" />}
                        />
                        <InfoCard
                            title={t("machines.title") || "Macchine"}
                            value={machines.length}
                            icon={<Wrench className="h-5 w-5" />}
                        />
                        <InfoCard
                            title={t("plants.code") || "Codice"}
                            value={plant.code || "—"}
                            icon={<Building2 className="h-5 w-5" />}
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GitBranch className="h-5 w-5" />
                                    {t("plants.linesTitle") || "Linee dello stabilimento"}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {canEdit && (
                                    <div className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-[1fr_1fr_auto]">
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-foreground">
                                                {t("plants.lineNameLabel") || "Nome linea"}
                                            </div>
                                            <Input
                                                value={lineName}
                                                onChange={(event) => setLineName(event.target.value)}
                                                placeholder={
                                                    t("plants.lineNamePlaceholder") ||
                                                    "Es. Linea triturazione"
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-foreground">
                                                {t("plants.lineCodeLabel") || "Codice linea"}
                                            </div>
                                            <Input
                                                value={lineCode}
                                                onChange={(event) => setLineCode(event.target.value)}
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
                                                {t("plants.addLine") || "Aggiungi linea"}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {lines.length === 0 ? (
                                    <EmptyState
                                        title={
                                            t("plants.noLines") || "Nessuna linea presente"
                                        }
                                        description={
                                            t("plants.noLinesDesc") ||
                                            "Aggiungi almeno una linea per organizzare il layout dell'impianto."
                                        }
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
                                                            {line.name ||
                                                                t("plants.fallbackLine") ||
                                                                "Linea"}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {line.code || "—"}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-xl bg-muted px-3 py-2 text-sm">
                                                        {lineMachineMap.get(line.id) ?? 0}{" "}
                                                        {t("machines.title")?.toLowerCase() ||
                                                            "macchine"}
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
                                    {t("plants.machines") || "Macchine nello stabilimento"}
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                {machines.length === 0 ? (
                                    <EmptyState
                                        title={
                                            t("plants.noMachines") ||
                                            "Nessuna macchina in questo stabilimento."
                                        }
                                        description={
                                            t("plants.noMachinesDesc") ||
                                            "Le macchine assegnate a questo stabilimento compariranno qui."
                                        }
                                        icon={<Factory className="h-10 w-10" />}
                                        actionLabel={t("nav.equipment") || "Macchine"}
                                        actionHref="/equipment"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {machines.map((machine) => {
                                            const lineName =
                                                machine.production_line_id
                                                    ? lines.find(
                                                        (line) =>
                                                            line.id ===
                                                            machine.production_line_id
                                                    )?.name
                                                    : null;

                                            return (
                                                <Link
                                                    key={machine.id}
                                                    href={`/equipment/${machine.id}`}
                                                    className="block"
                                                >
                                                    <div className="rounded-2xl border border-border p-4 transition hover:bg-muted/30">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <div className="font-semibold text-foreground">
                                                                    {machine.name ||
                                                                        t("machines.title") ||
                                                                        "Macchina"}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {machine.internal_code || "—"}
                                                                </div>
                                                                <div className="mt-1 text-xs text-muted-foreground">
                                                                    {t("plants.line") || "Linea"}:{" "}
                                                                    {lineName ||
                                                                        t("plants.unassigned") ||
                                                                        "Non assegnata"}
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
                                            );
                                        })}
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
