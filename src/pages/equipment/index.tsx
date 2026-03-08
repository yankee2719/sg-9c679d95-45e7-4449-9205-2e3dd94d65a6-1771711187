import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
    Factory,
    ArrowRight,
    Plus,
    Search,
    Building2,
    Wrench,
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

function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`rounded-[20px] border border-border bg-card shadow-sm ${className}`}>{children}</div>;
}

export default function EquipmentPage() {
    const [userRole, setUserRole] = useState("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [orgType, setOrgType] = useState < OrgType | null > (null);
    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [assignments, setAssignments] = useState < AssignmentRow[] > ([]);
    const [hiddenRows, setHiddenRows] = useState < HiddenRow[] > ([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showHidden, setShowHidden] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId || !ctx?.orgType) return;

                setUserRole(ctx.role ?? "technician");
                setOrgId(ctx.orgId);
                setOrgType(ctx.orgType as OrgType);

                const [machinesRes, assignmentsRes] = await Promise.all([
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, plant_id, production_line_id, is_archived, created_at")
                        .order("created_at", { ascending: false }),
                    supabase.from("machine_assignments").select("machine_id, customer_org_id, manufacturer_org_id, is_active").eq("is_active", true),
                ]);

                if (machinesRes.error) throw machinesRes.error;
                if (assignmentsRes.error) throw assignmentsRes.error;

                setMachines((machinesRes.data ?? []) as MachineRow[]);
                setAssignments((assignmentsRes.data ?? []) as AssignmentRow[]);

                if (ctx.orgType === "customer") {
                    const hiddenRes = await supabase.from("customer_hidden_machines").select("machine_id").eq("customer_org_id", ctx.orgId);
                    if (hiddenRes.error) throw hiddenRes.error;
                    setHiddenRows((hiddenRes.data ?? []) as HiddenRow[]);
                } else {
                    setHiddenRows([]);
                }
            } catch (error) {
                console.error("Equipment load error:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const hiddenMachineIds = useMemo(() => new Set(hiddenRows.map((x) => x.machine_id)), [hiddenRows]);

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
            rows = rows.filter((machine) =>
                (machine.name ?? "").toLowerCase().includes(q) ||
                (machine.internal_code ?? "").toLowerCase().includes(q) ||
                (machine.serial_number ?? "").toLowerCase().includes(q) ||
                (machine.model ?? "").toLowerCase().includes(q) ||
                (machine.brand ?? "").toLowerCase().includes(q),
            );
        }

        return rows;
    }, [machines, assignments, orgType, orgId, hiddenMachineIds, showHidden, search]);

    const stats = useMemo(() => {
        const assignedCount =
            orgType === "manufacturer"
                ? assignments.filter((a) => a.manufacturer_org_id === orgId && a.is_active).length
                : assignments.filter((a) => a.customer_org_id === orgId && a.is_active).length;

        const hiddenCount = orgType === "customer" ? hiddenRows.length : 0;

        return {
            total: visibleMachines.length,
            assigned: assignedCount,
            hidden: hiddenCount,
        };
    }, [visibleMachines.length, assignments, orgType, orgId, hiddenRows.length]);

    const subtitle =
        orgType === "manufacturer"
            ? "Gestisci il catalogo macchine del costruttore attivo."
            : "Gestisci macchine proprie e macchine assegnate nel contesto cliente attivo.";

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Macchine - MACHINA" />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1440px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">Macchine</h1>
                                <p className="text-base text-muted-foreground">{subtitle}</p>
                            </div>

                            <Link
                                href="/equipment/new"
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-400"
                            >
                                <Plus className="h-4 w-4" />
                                Nuova Macchina
                            </Link>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                                    <Factory className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">{stats.total}</div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">Macchine Visibili</div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">{stats.assigned}</div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">Assegnazioni Attive</div>
                            </CardShell>

                            {orgType === "customer" && (
                                <CardShell className="p-6">
                                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
                                        <EyeOff className="h-5 w-5" />
                                    </div>
                                    <div className="text-5xl font-bold leading-none text-foreground">{stats.hidden}</div>
                                    <div className="mt-2 text-[22px] font-medium text-muted-foreground">Macchine Nascoste</div>
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
                                        placeholder="Cerca macchina"
                                        className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-foreground outline-none placeholder:text-muted-foreground"
                                    />
                                </div>

                                {orgType === "customer" && (
                                    <button
                                        onClick={() => setShowHidden((v) => !v)}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 font-semibold text-foreground transition hover:bg-muted"
                                    >
                                        {showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        {showHidden ? "Nascondi archiviate locali" : "Mostra nascoste"}
                                    </button>
                                )}
                            </div>
                        </CardShell>

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-foreground">Elenco Macchine</h2>

                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">Caricamento macchine...</CardShell>
                            ) : visibleMachines.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">Nessuna macchina trovata.</CardShell>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {visibleMachines.map((machine) => {
                                        const isAssigned = !!orgId && assignments.some((a) => a.machine_id === machine.id && a.customer_org_id === orgId && a.is_active);
                                        const isOwner = machine.organization_id === orgId;

                                        return (
                                            <Link key={machine.id} href={`/equipment/${machine.id}`} className="block">
                                                <CardShell className="p-5 transition hover:-translate-y-[2px]">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex min-w-0 items-center gap-4">
                                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                                                                    <Wrench className="h-5 w-5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="truncate text-xl font-semibold text-foreground">{machine.name ?? "Macchina"}</div>
                                                                    <div className="truncate text-sm text-muted-foreground">{machine.serial_number ?? machine.internal_code ?? "—"}</div>
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            {isOwner && <span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm font-semibold text-blue-600 dark:text-blue-300">Propria</span>}
                                                            {isAssigned && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">Assegnata</span>}
                                                            {machine.lifecycle_state && <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground">{machine.lifecycle_state}</span>}
                                                            {machine.is_archived && <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-semibold text-red-600 dark:text-red-300">Archiviata</span>}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                                                            <div className="rounded-2xl border border-border bg-muted/40 p-3">
                                                                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Marca</div>
                                                                <div className="truncate text-foreground">{machine.brand ?? "—"}</div>
                                                            </div>
                                                            <div className="rounded-2xl border border-border bg-muted/40 p-3">
                                                                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Modello</div>
                                                                <div className="truncate text-foreground">{machine.model ?? "—"}</div>
                                                            </div>
                                                        </div>

                                                        {machine.plant_id && (
                                                            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Building2 className="h-4 w-4" />
                                                                Collegata a stabilimento
                                                            </div>
                                                        )}
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
