import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/services/apiClient";
import {
    Factory,
    ArrowRight,
    Plus,
    Search,
    EyeOff,
    Eye,
    Package,
} from "lucide-react";

type OrgType = "manufacturer" | "customer";

interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
    lifecycle_state: string | null;
    organization_id: string | null;
    plant_id: string | null;
    production_line_id: string | null;
    is_archived: boolean | null;
    is_deleted?: boolean | null;
    created_at?: string | null;
}

interface EquipmentCatalogResponse {
    machines: MachineRow[];
    hiddenMachineIds: string[];
    assignmentCount: number;
}

function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-[22px] border border-border bg-card text-card-foreground shadow-[0_16px_30px_-22px_rgba(15,23,42,0.28)] ${className}`}>
            {children}
        </div>
    );
}

export default function EquipmentPage() {
    const { t } = useLanguage();
    const { loading: authLoading, organization, membership } = useAuth();

    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [hiddenMachineIds, setHiddenMachineIds] = useState < string[] > ([]);
    const [assignmentCount, setAssignmentCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showHidden, setShowHidden] = useState(false);

    const userRole = membership?.role ?? "technician";
    const orgType = (organization?.type as OrgType | undefined) ?? null;

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;
            if (!organization?.id || !organization?.type) {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const response = await apiFetch < { success: true; data: EquipmentCatalogResponse } > (
                    "/api/equipment/catalog"
                );
                if (!active) return;
                setMachines(response.data.machines ?? []);
                setHiddenMachineIds(response.data.hiddenMachineIds ?? []);
                setAssignmentCount(response.data.assignmentCount ?? 0);
            } catch (error) {
                console.error("Equipment load error:", error);
                if (!active) {
                    return;
                }
                setMachines([]);
                setHiddenMachineIds([]);
                setAssignmentCount(0);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, organization?.id, organization?.type]);

    const hiddenSet = useMemo(() => new Set(hiddenMachineIds), [hiddenMachineIds]);

    const visibleMachines = useMemo(() => {
        let rows = [...machines];

        if (!showHidden && orgType === "customer") {
            rows = rows.filter((machine) => !hiddenSet.has(machine.id));
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter((machine) =>
                [machine.name, machine.internal_code, machine.serial_number, machine.model, machine.brand].some(
                    (value) => (value ?? "").toLowerCase().includes(q)
                )
            );
        }

        return rows;
    }, [machines, orgType, hiddenSet, showHidden, search]);

    const stats = useMemo(
        () => ({
            total: visibleMachines.length,
            assigned: assignmentCount,
            hidden: orgType === "customer" ? hiddenMachineIds.length : 0,
        }),
        [visibleMachines.length, assignmentCount, orgType, hiddenMachineIds.length]
    );

    const subtitle =
        orgType === "manufacturer"
            ? t("equipment.subtitleManufacturer")
            : t("equipment.subtitleCustomer");

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("equipment.title")} - MACHINA`} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                    {t("equipment.title")}
                                </h1>
                                <p className="text-sm text-muted-foreground">{subtitle}</p>
                            </div>

                            <Link
                                href="/equipment/new"
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                            >
                                <Plus className="h-4 w-4" />
                                {t("equipment.new")}
                            </Link>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                                    <Factory className="h-5 w-5" />
                                </div>
                                <div className="text-3xl font-bold leading-none text-foreground md:text-4xl">{stats.total}</div>
                                <div className="mt-2 text-sm font-medium text-muted-foreground">{t("equipment.kpi.visibleMachines")}</div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div className="text-3xl font-bold leading-none text-foreground md:text-4xl">{stats.assigned}</div>
                                <div className="mt-2 text-sm font-medium text-muted-foreground">{t("equipment.kpi.activeAssignments")}</div>
                            </CardShell>

                            {orgType === "customer" && (
                                <CardShell className="p-6">
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
                                        <EyeOff className="h-5 w-5" />
                                    </div>
                                    <div className="text-3xl font-bold leading-none text-foreground md:text-4xl">{stats.hidden}</div>
                                    <div className="mt-2 text-sm font-medium text-muted-foreground">{t("equipment.kpi.hiddenMachines")}</div>
                                </CardShell>
                            )}
                        </div>

                        <CardShell className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder={t("equipment.search")}
                                        className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-foreground outline-none placeholder:text-muted-foreground"
                                    />
                                </div>

                                {orgType === "customer" && (
                                    <button
                                        type="button"
                                        onClick={() => setShowHidden((prev) => !prev)}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border px-5 font-medium text-foreground transition hover:bg-muted/50"
                                    >
                                        {showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        {showHidden ? t("equipment.hideHidden") : t("equipment.showHidden")}
                                    </button>
                                )}
                            </div>
                        </CardShell>

                        {loading ? (
                            <CardShell className="p-6 text-sm text-muted-foreground">{t("common.loading")}</CardShell>
                        ) : visibleMachines.length === 0 ? (
                            <CardShell className="p-10 text-center text-sm text-muted-foreground">{t("equipment.empty")}</CardShell>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {visibleMachines.map((machine) => {
                                    const isHidden = hiddenSet.has(machine.id);
                                    return (
                                        <Link key={machine.id} href={`/equipment/${machine.id}`} className="block">
                                            <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0 space-y-3">
                                                        <div>
                                                            <div className="truncate text-lg font-semibold text-foreground">
                                                                {machine.name || t("equipment.unnamedMachine")}
                                                            </div>
                                                            <div className="mt-1 text-sm text-muted-foreground">
                                                                {[machine.internal_code, machine.serial_number, machine.brand, machine.model]
                                                                    .filter(Boolean)
                                                                    .join(" · ") || "—"}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2 text-xs">
                                                            <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">
                                                                {machine.lifecycle_state || "active"}
                                                            </span>
                                                            {isHidden && orgType === "customer" ? (
                                                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300">
                                                                    {t("equipment.hidden")}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                                                </div>
                                            </CardShell>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
