import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Building2, Factory, GitBranch, Loader2, Pencil, Plus, Wrench } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { hasMinimumOrgRole } from "@/lib/roles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/feedback/EmptyState";
import { createProductionLine, getPlantDetail, type LineRow, type MachineRow, type PlantRow } from "@/services/plantService";

type OrgType = "manufacturer" | "customer" | null;

function InfoCard({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
    return (
        <div className="rounded-2xl border border-border p-4">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">{icon}</div>
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
    const [plant, setPlant] = useState<PlantRow | null>(null);
    const [lines, setLines] = useState<LineRow[]>([]);
    const [machines, setMachines] = useState<MachineRow[]>([]);
    const [lineName, setLineName] = useState("");
    const [lineCode, setLineCode] = useState("");

    const resolvedId = typeof id === "string" ? id : null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";
    const canEdit = hasMinimumOrgRole(userRole, "supervisor");

    const loadPlant = async (plantId: string) => {
        const data = await getPlantDetail(plantId);
        setPlant(data.plant ?? null);
        setLines(data.lines ?? []);
        setMachines(data.machines ?? []);
    };

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!resolvedId || authLoading) return;
            if (orgType !== "customer") {
                if (active) setLoading(false);
                return;
            }

            try {
                const data = await getPlantDetail(resolvedId);
                if (!active) return;
                setPlant(data.plant ?? null);
                setLines(data.lines ?? []);
                setMachines(data.machines ?? []);
            } catch (error) {
                console.error(error);
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
        const map = new Map<string, number>();
        for (const machine of machines) {
            if (!machine.production_line_id) continue;
            map.set(machine.production_line_id, (map.get(machine.production_line_id) ?? 0) + 1);
        }
        return map;
    }, [machines]);

    const handleCreateLine = async () => {
        if (!plant || !canEdit) return;
        if (!lineName.trim()) {
            toast({
                title: t("common.error") || "Error",
                description: t("plants.errorLineNameRequired") || "Enter the line name.",
                variant: "destructive",
            });
            return;
        }

        setSavingLine(true);
        try {
            await createProductionLine({
                plant_id: plant.id,
                name: lineName.trim(),
                code: lineCode.trim() || null,
            });
            setLineName("");
            setLineCode("");
            await loadPlant(plant.id);
            toast({
                title: t("plants.lineCreated") || "Line created",
                description: t("plants.lineCreatedDesc") || "The new line has been added.",
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: t("common.error") || "Error",
                description: error?.message || t("plants.errorCreateLine") || "Error while creating line",
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
                    <SEO title={`${t("plants.title") || "Plants"} - MACHINA`} />
                    <div className="mx-auto max-w-6xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {t("plants.loading") || "Loading plant..."}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (orgType !== "customer" || !plant) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${t("plants.title") || "Plants"} - MACHINA`} />
                    <div className="mx-auto max-w-6xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {t("plants.notAvailable") || "Plant not available in the active context."}
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
                <SEO title={`${plant.name || t("plants.title") || "Plants"} - MACHINA`} />

                <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/plants">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold">{plant.name || t("plants.title") || "Plant"}</h1>
                                <p className="text-sm text-muted-foreground">{plant.code || "—"}</p>
                            </div>
                        </div>
                        {canEdit && (
                            <Link href={`/plants/${plant.id}/edit`}>
                                <Button variant="outline">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t("plants.edit") || "Edit"}
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <InfoCard title={t("plants.lines") || "Lines"} value={lines.length} icon={<GitBranch className="h-5 w-5" />} />
                        <InfoCard title={t("machines.title") || "Machines"} value={machines.length} icon={<Wrench className="h-5 w-5" />} />
                        <InfoCard title={t("plants.code") || "Code"} value={plant.code || "—"} icon={<Building2 className="h-5 w-5" />} />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GitBranch className="h-5 w-5" />
                                    {t("plants.linesTitle") || "Plant lines"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {canEdit && (
                                    <div className="grid gap-4 rounded-2xl border border-border p-4 md:grid-cols-[1fr_1fr_auto]">
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-foreground">{t("plants.lineNameLabel") || "Line name"}</div>
                                            <Input value={lineName} onChange={(e) => setLineName(e.target.value)} placeholder={t("plants.lineNamePlaceholder") || "e.g. Shredding line"} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-foreground">{t("plants.lineCodeLabel") || "Line code"}</div>
                                            <Input value={lineCode} onChange={(e) => setLineCode(e.target.value)} placeholder="e.g. LN-SHRED-01" />
                                        </div>
                                        <div className="flex items-end">
                                            <Button onClick={handleCreateLine} disabled={savingLine} className="w-full md:w-auto">
                                                {savingLine ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                {t("plants.addLine") || "Add line"}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {lines.length === 0 ? (
                                    <EmptyState
                                        title={t("plants.noLines") || "No lines yet"}
                                        description={t("plants.noLinesDesc") || "Add at least one production line."}
                                        icon={<GitBranch className="h-10 w-10" />}
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {lines.map((line) => (
                                            <div key={line.id} className="rounded-2xl border border-border p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className="font-semibold text-foreground">{line.name || t("plants.line") || "Line"}</div>
                                                        <div className="text-sm text-muted-foreground">{line.code || "—"}</div>
                                                    </div>
                                                    <div className="rounded-xl bg-muted px-3 py-2 text-sm">
                                                        {lineMachineMap.get(line.id) ?? 0} {(t("machines.title") || "Machines").toLowerCase()}
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
                                    {t("plants.machines") || "Machines"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {machines.length === 0 ? (
                                    <EmptyState
                                        title={t("plants.noMachines") || "No machines in this plant"}
                                        description={t("plants.noMachinesDesc") || "Assigned machines will appear here."}
                                        icon={<Factory className="h-10 w-10" />}
                                        actionLabel={t("nav.equipment") || "Machines"}
                                        actionHref="/equipment"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {machines.map((machine) => {
                                            const lineNameResolved = machine.production_line_id
                                                ? lines.find((line) => line.id === machine.production_line_id)?.name || machine.production_line_id
                                                : t("plants.unassigned") || "Unassigned";

                                            return (
                                                <Link key={machine.id} href={`/equipment/${machine.id}`} className="block">
                                                    <div className="rounded-2xl border border-border p-4 transition hover:bg-muted/30">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <div className="font-semibold text-foreground">{machine.name || t("machines.title") || "Machine"}</div>
                                                                <div className="text-sm text-muted-foreground">{machine.internal_code || "—"}</div>
                                                                <div className="mt-1 text-xs text-muted-foreground">
                                                                    {t("plants.line") || "Line"}: {lineNameResolved}
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
