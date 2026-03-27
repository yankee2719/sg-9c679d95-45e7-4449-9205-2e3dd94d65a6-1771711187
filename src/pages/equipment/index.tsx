import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Factory, ArrowRight, Plus, Search, EyeOff, Eye, Package } from "lucide-react";
import { listMachineCatalog } from "@/lib/machineWorkspaceApi";

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

interface AssignmentRow {
    machine_id: string;
    customer_org_id: string | null;
    manufacturer_org_id: string | null;
    is_active: boolean | null;
}

function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`rounded-[22px] border border-border bg-card text-card-foreground shadow-[0_16px_30px_-22px_rgba(15,23,42,0.28)] ${className}`}>{children}</div>;
}

export default function EquipmentPage() {
    const { t } = useLanguage();
    const { loading: authLoading, organization, membership } = useAuth();

    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [assignments, setAssignments] = useState < AssignmentRow[] > ([]);
    const [hiddenMachineIds, setHiddenMachineIds] = useState < Set < string >> (new Set());
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
            try {
                setLoading(true);
                const data = await listMachineCatalog();
                if (!active) return;
                setMachines((data.machines ?? []) as MachineRow[]);
                setAssignments((data.assignments ?? []) as AssignmentRow[]);
                setHiddenMachineIds(new Set((data.hidden_machine_ids ?? []) as string[]));
            } catch (error) {
                console.error("Equipment load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, orgId, orgType]);

    const visibleMachines = useMemo(() => {
        let rows = machines;
        if (orgType === "manufacturer" && orgId) {
            rows = rows.filter((machine) => machine.organization_id === orgId);
        }
        if (orgType === "customer" && orgId) {
            const assignedIds = new Set(assignments.filter((a) => a.customer_org_id === orgId && a.is_active).map((a) => a.machine_id));
            rows = rows.filter((machine) => machine.organization_id === orgId || assignedIds.has(machine.id));
        }
        if (!showHidden && orgType === "customer") {
            rows = rows.filter((machine) => !hiddenMachineIds.has(machine.id));
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter((machine) => [machine.name, machine.internal_code, machine.serial_number, machine.model, machine.brand].some((value) => (value ?? "").toLowerCase().includes(q)));
        }
        return rows;
    }, [machines, assignments, orgType, orgId, hiddenMachineIds, showHidden, search]);

    const stats = useMemo(() => ({
        total: visibleMachines.length,
        assigned: orgType === "manufacturer"
            ? assignments.filter((a) => a.manufacturer_org_id === orgId && a.is_active).length
            : assignments.filter((a) => a.customer_org_id === orgId && a.is_active).length,
        hidden: orgType === "customer" ? hiddenMachineIds.size : 0,
    }), [visibleMachines.length, assignments, orgType, orgId, hiddenMachineIds]);

    const subtitle = orgType === "manufacturer" ? t("equipment.subtitleManufacturer") : t("equipment.subtitleCustomer");

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("equipment.title")} - MACHINA`} />
                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{t("equipment.title")}</h1>
                                <p className="text-sm text-muted-foreground">{subtitle}</p>
                            </div>
                            <Link href="/equipment/new" className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600">
                                <Plus className="h-4 w-4" />{t("equipment.new")}
                            </Link>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300"><Factory className="h-5 w-5" /></div><div className="text-3xl font-bold leading-none text-foreground md:text-4xl">{stats.total}</div><div className="mt-2 text-sm font-medium text-muted-foreground">{t("equipment.kpi.visibleMachines")}</div></CardShell>
                            <CardShell className="p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"><Package className="h-5 w-5" /></div><div className="text-3xl font-bold leading-none text-foreground md:text-4xl">{stats.assigned}</div><div className="mt-2 text-sm font-medium text-muted-foreground">{t("equipment.kpi.activeAssignments")}</div></CardShell>
                            {orgType === "customer" && <CardShell className="p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300"><EyeOff className="h-5 w-5" /></div><div className="text-3xl font-bold leading-none text-foreground md:text-4xl">{stats.hidden}</div><div className="mt-2 text-sm font-medium text-muted-foreground">{t("equipment.kpi.hiddenMachines")}</div></CardShell>}
                        </div>
                        <CardShell className="p-5">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search") || "Cerca..."} className="h-12 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm outline-none ring-0 transition placeholder:text-muted-foreground focus:border-orange-500" /></div>
                                {orgType === "customer" && <button type="button" onClick={() => setShowHidden((v) => !v)} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted">{showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{showHidden ? (t("equipment.hideHidden") || "Nascondi") : (t("equipment.showHidden") || "Mostra nascoste")}</button>}
                            </div>
                        </CardShell>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {loading ? (
                                <CardShell className="p-6 text-sm text-muted-foreground">{t("common.loading") || "Caricamento..."}</CardShell>
                            ) : visibleMachines.length === 0 ? (
                                <CardShell className="p-6 text-sm text-muted-foreground">{t("machines.noResults") || "Nessuna macchina trovata"}</CardShell>
                            ) : visibleMachines.map((machine) => (
                                <Link key={machine.id} href={`/equipment/${machine.id}`}>
                                    <CardShell className="group p-6 transition hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-[0_22px_42px_-30px_rgba(15,23,42,0.35)]">
                                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-semibold text-foreground">{machine.name || t("equipment.machineFallback") || "Macchina"}</h3><p className="mt-1 truncate text-sm text-muted-foreground">{machine.internal_code || machine.serial_number || "—"}</p></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-orange-500" /></div>
                                        <div className="mt-5 grid gap-3 text-sm text-muted-foreground"><div className="flex items-center justify-between"><span>{t("equipment.field.brand") || "Marca"}</span><span className="font-medium text-foreground">{machine.brand || "—"}</span></div><div className="flex items-center justify-between"><span>{t("equipment.field.model") || "Modello"}</span><span className="font-medium text-foreground">{machine.model || "—"}</span></div><div className="flex items-center justify-between"><span>{t("machines.status") || "Stato"}</span><span className="font-medium text-foreground">{machine.lifecycle_state || "active"}</span></div></div>
                                    </CardShell>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
