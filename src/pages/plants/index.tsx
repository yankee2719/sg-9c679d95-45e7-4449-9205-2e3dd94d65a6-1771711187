import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Building2, ArrowRight, Plus, GitBranch, Save, X } from "lucide-react";

interface PlantRow {
    id: string;
    name: string | null;
    code: string | null;
}

interface LineRow {
    id: string;
    name: string | null;
    code: string | null;
    plant_id: string | null;
}

function CardShell({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={`surface-panel ${className}`}>{children}</div>;
}

export default function PlantsPage() {
    const { t } = useLanguage();
    const { loading: authLoading, organization, membership, canManagePlants } = useAuth();

    const [plants, setPlants] = useState < PlantRow[] > ([]);
    const [lines, setLines] = useState < LineRow[] > ([]);
    const [loading, setLoading] = useState(true);

    const [showPlantForm, setShowPlantForm] = useState(false);
    const [showLineForm, setShowLineForm] = useState(false);
    const [savingPlant, setSavingPlant] = useState(false);
    const [savingLine, setSavingLine] = useState(false);

    const [plantName, setPlantName] = useState("");
    const [plantCode, setPlantCode] = useState("");
    const [lineName, setLineName] = useState("");
    const [lineCode, setLineCode] = useState("");
    const [linePlantId, setLinePlantId] = useState("");

    const userRole = membership?.role ?? "technician";
    const orgId = organization?.id ?? null;

    const loadData = async () => {
        if (!orgId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const [plantsRes, linesRes] = await Promise.all([
                supabase
                    .from("plants")
                    .select("id, name, code")
                    .eq("organization_id", orgId)
                    .eq("is_archived", false)
                    .order("name", { ascending: true }),
                supabase
                    .from("production_lines")
                    .select("id, name, code, plant_id")
                    .eq("organization_id", orgId)
                    .eq("is_archived", false)
                    .order("name", { ascending: true }),
            ]);

            if (plantsRes.error) throw plantsRes.error;
            if (linesRes.error) throw linesRes.error;

            setPlants((plantsRes.data ?? []) as PlantRow[]);
            setLines((linesRes.data ?? []) as LineRow[]);
        } catch (error) {
            console.error("Plants load error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        void loadData();
    }, [authLoading, orgId]);

    const linesByPlant = useMemo(() => {
        const map = new Map < string, LineRow[]> ();
        for (const line of lines) {
            const plantId = line.plant_id ?? "";
            if (!map.has(plantId)) map.set(plantId, []);
            map.get(plantId)!.push(line);
        }
        return map;
    }, [lines]);

    const stats = useMemo(() => {
        return {
            plants: plants.length,
            lines: lines.length,
            avgLinesPerPlant:
                plants.length > 0 ? Math.round((lines.length / plants.length) * 10) / 10 : 0,
        };
    }, [plants, lines]);

    const resetPlantForm = () => {
        setPlantName("");
        setPlantCode("");
        setShowPlantForm(false);
    };

    const resetLineForm = () => {
        setLineName("");
        setLineCode("");
        setLinePlantId("");
        setShowLineForm(false);
    };

    const handleCreatePlant = async () => {
        if (!orgId || !plantName.trim()) return;

        try {
            setSavingPlant(true);

            const { error } = await supabase.from("plants").insert({
                organization_id: orgId,
                name: plantName.trim(),
                code: plantCode.trim() || null,
                is_archived: false,
            });

            if (error) throw error;

            resetPlantForm();
            await loadData();
        } catch (error) {
            console.error("Create plant error:", error);
        } finally {
            setSavingPlant(false);
        }
    };

    const handleCreateLine = async () => {
        if (!orgId || !lineName.trim() || !linePlantId) return;

        try {
            setSavingLine(true);

            const { error } = await supabase.from("production_lines").insert({
                organization_id: orgId,
                plant_id: linePlantId,
                name: lineName.trim(),
                code: lineCode.trim() || null,
                is_archived: false,
            });

            if (error) throw error;

            resetLineForm();
            await loadData();
        } catch (error) {
            console.error("Create line error:", error);
        } finally {
            setSavingLine(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("plants.title")} - MACHINA`} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                    {t("plants.title")}
                                </h1>
                                <p className="text-base text-muted-foreground">
                                    {t("plants.subtitle")}
                                </p>
                            </div>

                            {canManagePlants && (
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPlantForm((prev) => !prev)}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {t("plants.newPlant")}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowLineForm((prev) => !prev)}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 font-semibold text-foreground transition hover:bg-muted"
                                    >
                                        <GitBranch className="h-4 w-4" />
                                        {t("plants.newLine")}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.plants}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("plants.totalPlants")}
                                </div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                                    <GitBranch className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.lines}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("plants.totalLines")}
                                </div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
                                    <GitBranch className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.avgLinesPerPlant}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("plants.avgLinesPerPlant")}
                                </div>
                            </CardShell>
                        </div>

                        {canManagePlants && showPlantForm && (
                            <CardShell className="p-5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h2 className="text-2xl font-bold text-foreground">
                                            {t("plants.newPlant")}
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={resetPlantForm}
                                            className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <input
                                            value={plantName}
                                            onChange={(e) => setPlantName(e.target.value)}
                                            placeholder={t("plants.plantName")}
                                            className="h-12 rounded-2xl border border-border bg-background px-4 text-foreground outline-none placeholder:text-muted-foreground"
                                        />
                                        <input
                                            value={plantCode}
                                            onChange={(e) => setPlantCode(e.target.value)}
                                            placeholder={t("plants.plantCode")}
                                            className="h-12 rounded-2xl border border-border bg-background px-4 text-foreground outline-none placeholder:text-muted-foreground"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleCreatePlant}
                                            disabled={savingPlant || !plantName.trim()}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Save className="h-4 w-4" />
                                            {savingPlant ? t("common.saving") : t("common.save")}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={resetPlantForm}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 font-semibold text-foreground transition hover:bg-muted"
                                        >
                                            <X className="h-4 w-4" />
                                            {t("common.cancel")}
                                        </button>
                                    </div>
                                </div>
                            </CardShell>
                        )}

                        {canManagePlants && showLineForm && (
                            <CardShell className="p-5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h2 className="text-2xl font-bold text-foreground">
                                            {t("plants.newLine")}
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={resetLineForm}
                                            className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <select
                                            value={linePlantId}
                                            onChange={(e) => setLinePlantId(e.target.value)}
                                            className="h-12 rounded-2xl border border-border bg-background px-4 text-foreground outline-none"
                                        >
                                            <option value="">{t("plants.selectPlant")}</option>
                                            {plants.map((plant) => (
                                                <option key={plant.id} value={plant.id}>
                                                    {plant.name ?? plant.code ?? plant.id}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            value={lineName}
                                            onChange={(e) => setLineName(e.target.value)}
                                            placeholder={t("plants.lineName")}
                                            className="h-12 rounded-2xl border border-border bg-background px-4 text-foreground outline-none placeholder:text-muted-foreground"
                                        />

                                        <input
                                            value={lineCode}
                                            onChange={(e) => setLineCode(e.target.value)}
                                            placeholder={t("plants.lineCode")}
                                            className="h-12 rounded-2xl border border-border bg-background px-4 text-foreground outline-none placeholder:text-muted-foreground"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleCreateLine}
                                            disabled={savingLine || !lineName.trim() || !linePlantId}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Save className="h-4 w-4" />
                                            {savingLine ? t("common.saving") : t("common.save")}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={resetLineForm}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 font-semibold text-foreground transition hover:bg-muted"
                                        >
                                            <X className="h-4 w-4" />
                                            {t("common.cancel")}
                                        </button>
                                    </div>
                                </div>
                            </CardShell>
                        )}

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-foreground">
                                {t("plants.listTitle")}
                            </h2>

                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("plants.loading")}
                                </CardShell>
                            ) : plants.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("plants.noResults")}
                                </CardShell>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {plants.map((plant) => {
                                        const plantLines = linesByPlant.get(plant.id) ?? [];

                                        return (
                                            <Link
                                                key={plant.id}
                                                href={`/plants/${plant.id}`}
                                                className="block"
                                            >
                                                <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex min-w-0 items-center gap-4">
                                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                                                                    <Building2 className="h-5 w-5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-xl font-semibold text-foreground">
                                                                        {plant.name ??
                                                                            t("plants.fallbackPlant")}
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {plant.code ?? "—"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                                                        </div>

                                                        <div className="rounded-2xl bg-muted p-3">
                                                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                                                <GitBranch className="h-4 w-4 text-emerald-300" />
                                                                {t("plants.linkedLines")}
                                                            </div>

                                                            {plantLines.length === 0 ? (
                                                                <div className="text-sm text-muted-foreground">
                                                                    {t("plants.noLinkedLines")}
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {plantLines.map((line) => (
                                                                        <span
                                                                            key={line.id}
                                                                            className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300"
                                                                        >
                                                                            {line.name ??
                                                                                line.code ??
                                                                                t("plants.fallbackLine")}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardShell>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}