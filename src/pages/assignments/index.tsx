import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Building2,
    Download,
    Factory,
    Search,
    UserCheck,
    Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";

type OrgType = "manufacturer" | "customer" | null;

interface AssignmentRow {
    id: string;
    machine_id: string;
    customer_org_id: string | null;
    manufacturer_org_id: string | null;
    assigned_by: string | null;
    assigned_at: string | null;
    is_active: boolean;
}

interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
}

interface CustomerRow {
    id: string;
    name: string | null;
    city: string | null;
    email: string | null;
}

interface ProfileRow {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString("it-IT", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
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

export default function AssignmentsIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < AssignmentRow[] > ([]);
    const [machineMap, setMachineMap] = useState < Map < string, MachineRow>> (new Map());
    const [customerMap, setCustomerMap] = useState < Map < string, CustomerRow>> (new Map());
    const [userMap, setUserMap] = useState < Map < string, ProfileRow>> (new Map());
    const [search, setSearch] = useState("");

    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;

            if (!orgId || orgType !== "manufacturer") {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const { data: assignments, error: assignmentsError } = await supabase
                    .from("machine_assignments")
                    .select(
                        "id, machine_id, customer_org_id, manufacturer_org_id, assigned_by, assigned_at, is_active"
                    )
                    .eq("manufacturer_org_id", orgId)
                    .eq("is_active", true)
                    .order("assigned_at", { ascending: false });

                if (assignmentsError) throw assignmentsError;

                const assignmentRows = (assignments ?? []) as AssignmentRow[];

                const machineIds = Array.from(
                    new Set(assignmentRows.map((row) => row.machine_id).filter(Boolean))
                );

                const customerIds = Array.from(
                    new Set(assignmentRows.map((row) => row.customer_org_id).filter(Boolean))
                ) as string[];

                const userIds = Array.from(
                    new Set(assignmentRows.map((row) => row.assigned_by).filter(Boolean))
                ) as string[];

                let nextMachineMap = new Map < string, MachineRow> ();
                let nextCustomerMap = new Map < string, CustomerRow> ();
                let nextUserMap = new Map < string, ProfileRow> ();

                if (machineIds.length > 0) {
                    const { data, error } = await supabase
                        .from("machines")
                        .select("id, name, internal_code, serial_number, model, brand")
                        .in("id", machineIds);

                    if (error) throw error;
                    nextMachineMap = new Map(
                        ((data ?? []) as MachineRow[]).map((row) => [row.id, row])
                    );
                }

                if (customerIds.length > 0) {
                    const { data, error } = await supabase
                        .from("organizations")
                        .select("id, name, city, email")
                        .in("id", customerIds);

                    if (error) throw error;
                    nextCustomerMap = new Map(
                        ((data ?? []) as CustomerRow[]).map((row) => [row.id, row])
                    );
                }

                if (userIds.length > 0) {
                    const { data, error } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .in("id", userIds);

                    if (error) throw error;
                    nextUserMap = new Map(
                        ((data ?? []) as ProfileRow[]).map((row) => [row.id, row])
                    );
                }

                if (!active) return;

                setRows(assignmentRows);
                setMachineMap(nextMachineMap);
                setCustomerMap(nextCustomerMap);
                setUserMap(nextUserMap);
            } catch (error) {
                console.error("Assignments load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, orgId, orgType]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;

        return rows.filter((row) => {
            const machine = machineMap.get(row.machine_id);
            const customer = row.customer_org_id
                ? customerMap.get(row.customer_org_id)
                : null;
            const user = row.assigned_by ? userMap.get(row.assigned_by) : null;

            const assignedByLabel =
                user?.display_name?.trim() ||
                `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
                user?.email ||
                "";

            return [
                machine?.name,
                machine?.internal_code,
                machine?.serial_number,
                machine?.model,
                machine?.brand,
                customer?.name,
                customer?.city,
                customer?.email,
                assignedByLabel,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q));
        });
    }, [rows, search, machineMap, customerMap, userMap]);

    const stats = useMemo(() => {
        const uniqueCustomers = new Set(
            rows.map((row) => row.customer_org_id).filter(Boolean)
        ).size;

        const recent30d = rows.filter((row) => {
            if (!row.assigned_at) return false;
            return Date.now() - new Date(row.assigned_at).getTime() <= 30 * 24 * 60 * 60 * 1000;
        }).length;

        return {
            total: rows.length,
            customers: uniqueCustomers,
            machines: new Set(rows.map((row) => row.machine_id)).size,
            recent30d,
        };
    }, [rows]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Assegnazioni - MACHINA" />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Caricamento assegnazioni...
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!orgId || orgType !== "manufacturer") {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Assegnazioni - MACHINA" />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Il registro assegnazioni è disponibile nel contesto costruttore.
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
                <SEO title="Assegnazioni - MACHINA" />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                Assegnazioni macchine
                            </h1>
                            <p className="text-base text-muted-foreground">
                                Registro delle macchine assegnate ai clienti nel contesto costruttore attivo.
                            </p>
                        </div>

                        <a href="/api/export/assignments">
                            <Button variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </a>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            icon={<Factory className="h-5 w-5" />}
                            title="Assegnazioni attive"
                            value={stats.total}
                        />
                        <KpiCard
                            icon={<Building2 className="h-5 w-5" />}
                            title="Clienti serviti"
                            value={stats.customers}
                        />
                        <KpiCard
                            icon={<Users className="h-5 w-5" />}
                            title="Macchine assegnate"
                            value={stats.machines}
                        />
                        <KpiCard
                            icon={<UserCheck className="h-5 w-5" />}
                            title="Ultimi 30 giorni"
                            value={stats.recent30d}
                        />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cerca macchina, cliente, assegnatario..."
                                    className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            {filteredRows.length === 0 ? (
                                <EmptyState
                                    title="Nessuna assegnazione trovata"
                                    description="Non ci sono assegnazioni attive oppure nessun elemento corrisponde alla ricerca."
                                    icon={<Factory className="h-10 w-10" />}
                                    actionLabel="Apri clienti"
                                    actionHref="/customers"
                                    secondaryActionLabel="Apri macchine"
                                    secondaryActionHref="/equipment"
                                />
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => {
                                        const machine = machineMap.get(row.machine_id);
                                        const customer = row.customer_org_id
                                            ? customerMap.get(row.customer_org_id)
                                            : null;
                                        const user = row.assigned_by
                                            ? userMap.get(row.assigned_by)
                                            : null;

                                        const assignedByLabel =
                                            user?.display_name?.trim() ||
                                            `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
                                            user?.email ||
                                            "—";

                                        return (
                                            <div
                                                key={row.id}
                                                className="rounded-2xl border border-border p-4 transition hover:bg-muted/30"
                                            >
                                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                    <div className="min-w-0 space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="text-lg font-semibold text-foreground">
                                                                {machine?.name || "Macchina"}
                                                            </div>

                                                            <Badge variant="outline">
                                                                {machine?.internal_code || "—"}
                                                            </Badge>

                                                            {machine?.serial_number && (
                                                                <Badge variant="secondary">
                                                                    {machine.serial_number}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <div className="text-sm text-muted-foreground">
                                                            Cliente: {customer?.name || "—"}
                                                            {customer?.city ? ` · ${customer.city}` : ""}
                                                            {customer?.email ? ` · ${customer.email}` : ""}
                                                        </div>

                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                            <span>
                                                                Assegnato da: {assignedByLabel}
                                                            </span>
                                                            <span>
                                                                Data assegnazione: {formatDate(row.assigned_at)}
                                                            </span>
                                                            {machine?.model && <span>Modello: {machine.model}</span>}
                                                            {machine?.brand && <span>Marca: {machine.brand}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <Link href={`/equipment/${row.machine_id}`}>
                                                            <Button variant="outline" size="sm">
                                                                Apri macchina
                                                            </Button>
                                                        </Link>

                                                        {row.customer_org_id && (
                                                            <Link href={`/customers/${row.customer_org_id}`}>
                                                                <Button variant="outline" size="sm">
                                                                    Apri cliente
                                                                </Button>
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
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