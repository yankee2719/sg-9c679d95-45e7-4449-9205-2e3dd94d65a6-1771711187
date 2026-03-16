import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
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
    created_at?: string | null;
}

interface AssignmentRow {
    machine_id: string;
    customer_org_id: string | null;
    manufacturer_org_id: string | null;
    is_active: boolean | null;
}

interface HiddenRow {
    machine_id: string;
}

function CardShell({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-[22px] border border-border bg-card text-card-foreground shadow-[0_16px_30px_-22px_rgba(15,23,42,0.28)] ${className}`}
        >
            {children}
        </div>
    );
}

export default function EquipmentPage() {
    const { t } = useLanguage();
    const { loading: authLoading, organization, membership } = useAuth();

    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [assignments, setAssignments] = useState < AssignmentRow[] > ([]);
    const [hiddenRows, setHiddenRows] = useState < HiddenRow[] > ([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showHidden, setShowHidden] = useState(false);

    const userRole = membership?.role ?? "technician";
    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;

            if (!orgId || !orgType) {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const [machinesRes, assignmentsRes] = await Promise.all([
                    supabase
                        .from("machines")
                        .select(
                            "id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, plant_id, production_line_id, is_archived, created_at"
                        )
                        .eq("is_archived", false)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("machine_assignments")
                        .select("machine_id, customer_org_id, manufacturer_org_id, is_active")
                        .eq("is_active", true),
                ]);

                if (machinesRes.error) throw machinesRes.error;
                if (assignmentsRes.error) throw assignmentsRes.error;

                if (!active) return;

                setMachines((machinesRes.data ?? []) as MachineRow[]);
                setAssignments((assignmentsRes.data ?? []) as AssignmentRow[]);

                if (orgType === "customer") {
                    const hiddenRes = await supabase
                        .from("customer_hidden_machines")
                        .select("machine_id")
                        .eq("customer_org_id", orgId);

                    if (hiddenRes.error) throw hiddenRes.error;
                    setHiddenRows((hiddenRes.data ?? []) as HiddenRow[]);
                } else {
                    setHiddenRows([]);
                }
            } catch (error) {
                console.error("Equipment load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, orgId, orgType]);

    const hiddenMachineIds = useMemo(
        () => new Set(hiddenRows.map((x) => x.machine_id)),
        [hiddenRows]
    );

    const visibleMachines = useMemo(() => {
        let rows = machines;

        if (orgType === "manufacturer" && orgId) {
            rows = rows.filter((machine) => machine.organization_id === orgId);
        }

        if (orgType === "customer" && orgId) {
            const assignedIds = new Set(
                assignments
                    .filter((a) => a.customer_org_id === orgId && a.is_active)
                    .map((a) => a.machine_id)
            );

            rows = rows.filter(
                (machine) => machine.organization_id === orgId || assignedIds.has(machine.id)
            );
        }

        if (!showHidden && orgType === "customer") {
            rows = rows.filter((machine) => !hiddenMachineIds.has(machine.id));
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter((machine) =>
                [
                    machine.name,
                    machine.internal_code,
                    machine.serial_number,
                    machine.model,
                    machine.brand,
                ].some((value) => (value ?? "").toLowerCase().includes(q))
            );
        }

        return rows;
    }, [machines, assignments, orgType, orgId, hiddenMachineIds, showHidden, search]);

    const stats = useMemo(() => {
        const assignedCount =
            orgType === "manufacturer"
                ? assignments.filter((a) => a.manufacturer_org_id === orgId && a.is_active).length
                : assignments.filter((a) => a.customer_org_id === orgId && a.is_active).length;

        return {
            total: visibleMachines.length,
            assigned: assignedCount,
            hidden: orgType === "customer" ? hiddenRows.length : 0,
        };
    }, [visibleMachines.length, assignments, orgType, orgId, hiddenRows.length]);

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
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                    {t("equipment.title")}
                                </h1>
                                <p className="text-base text-muted-foreground">{subtitle}</p>
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
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                                    <Factory className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.total}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("equipment.kpi.visibleMachines")}
                                </div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {stats.assigned}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("equipment.kpi.activeAssignments")}
                                </div>
                            </CardShell>

                            {orgType === "customer" && (
                                <CardShell className="p-6">
                                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
                                        <EyeOff className="h-5 w-5" />
                                    </div>
                                    <div className="text-5xl font-bold leading-none text-foreground">
                                        {stats.hidden}
                                    </div>
                                    <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                        {t("equipment.kpi.hiddenMachines")}
                                    </div>
                                </CardShell>
                            )}
                        </div>

                        <CardShell className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={t("equipment.searchPlaceholder")}
                                        className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-foreground outline-none placeholder:text-muted-foreground"
                                    />
                                </div>

                                {orgType === "customer" && (
                                    <button
                                        type="button"
                                        onClick={() => setShowHidden((prev) => !prev)}
                                        className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border bg-card px-4 font-medium text-foreground transition hover:bg-muted"
                                    >
                                        {showHidden ? (
                                            <>
                                                <Eye className="h-4 w-4" />
                                                {t("equipment.showOnlyVisible")}
                                            </>
                                        ) : (
                                            <>
                                                <EyeOff className="h-4 w-4" />
                                                {t("equipment.showHiddenToo")}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </CardShell>

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-foreground">
                                {t("equipment.listTitle")}
                            </h2>

                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("equipment.loading")}
                                </CardShell>
                            ) : visibleMachines.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("equipment.noResults")}
                                </CardShell>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {visibleMachines.map((machine) => (
                                        <Link
                                            key={machine.id}
                                            href={`/equipment/${machine.id}`}
                                            className="block"
                                        >
                                            <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-2xl font-bold text-foreground">
                                                                {machine.name ?? t("equipment.fallbackName")}
                                                            </div>
                                                            <div className="truncate text-sm text-muted-foreground">
                                                                {machine.internal_code ||
                                                                    machine.serial_number ||
                                                                    "—"}
                                                            </div>
                                                        </div>
                                                        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {machine.model && (
                                                            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground/80">
                                                                {machine.model}
                                                            </span>
                                                        )}
                                                        {machine.brand && (
                                                            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground/80">
                                                                {machine.brand}
                                                            </span>
                                                        )}
                                                        {machine.lifecycle_state && (
                                                            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground/80">
                                                                {machine.lifecycle_state}
                                                            </span>
                                                        )}
                                                        {orgType === "customer" &&
                                                            hiddenMachineIds.has(machine.id) && (
                                                                <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
                                                                    hidden
                                                                </span>
                                                            )}
                                                    </div>
                                                </div>
                                            </CardShell>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}