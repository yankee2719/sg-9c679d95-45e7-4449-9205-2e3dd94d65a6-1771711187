import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    ArrowLeft,
    Building2,
    Factory,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Shield,
    Users,
    Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type OrgType = "manufacturer" | "customer" | null;

interface CustomerRow {
    id: string;
    name: string | null;
    slug: string | null;
    type: string | null;
    manufacturer_org_id: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    subscription_status: string | null;
    subscription_plan: string | null;
    created_at: string | null;
    is_deleted?: boolean | null;
}

interface MembershipRow {
    id: string;
    user_id: string;
    role: string | null;
    is_active: boolean;
    created_at: string | null;
}

interface ProfileRow {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
}

interface AssignmentRow {
    id: string;
    machine_id: string;
    assigned_at: string | null;
    assigned_by: string | null;
    is_active: boolean;
}

interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
    lifecycle_state: string | null;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString("it-IT", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    } catch {
        return value;
    }
}

function displayName(profile: ProfileRow | undefined) {
    if (!profile) return "—";
    return (
        profile.display_name?.trim() ||
        `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
        profile.email ||
        profile.id
    );
}

function KpiCard({
    icon,
    title,
    value,
}: {
    icon: React.ReactNode;
    title: string;
    value: number | string;
}) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div className="text-3xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function CustomerDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { loading: authLoading, organization, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState<CustomerRow | null>(null);
    const [memberships, setMemberships] = useState<MembershipRow[]>([]);
    const [profilesMap, setProfilesMap] = useState<Map<string, ProfileRow>>(new Map());
    const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
    const [machinesMap, setMachinesMap] = useState<Map<string, MachineRow>>(new Map());

    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";

    const resolvedId = useMemo(() => {
        return typeof id === "string" ? id : null;
    }, [id]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;

            if (!resolvedId || !orgId || !orgType) {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                let customerRow: CustomerRow | null = null;

                if (orgType === "manufacturer") {
                    const { data, error } = await supabase
                        .from("organizations")
                        .select(
                            "id, name, slug, type, manufacturer_org_id, city, country, email, phone, subscription_status, subscription_plan, created_at, is_deleted"
                        )
                        .eq("id", resolvedId)
                        .eq("manufacturer_org_id", orgId)
                        .eq("type", "customer")
                        .or("is_deleted.is.null,is_deleted.eq.false")
                        .maybeSingle();

                    if (error) throw error;
                    customerRow = (data as CustomerRow | null) ?? null;
                } else {
                    if (resolvedId !== orgId) {
                        void router.replace("/dashboard");
                        return;
                    }

                    const { data, error } = await supabase
                        .from("organizations")
                        .select(
                            "id, name, slug, type, manufacturer_org_id, city, country, email, phone, subscription_status, subscription_plan, created_at, is_deleted"
                        )
                        .eq("id", orgId)
                        .eq("type", "customer")
                        .or("is_deleted.is.null,is_deleted.eq.false")
                        .maybeSingle();

                    if (error) throw error;
                    customerRow = (data as CustomerRow | null) ?? null;
                }

                if (!customerRow) {
                    void router.replace(orgType === "manufacturer" ? "/customers" : "/dashboard");
                    return;
                }

                if (!active) return;
                setCustomer(customerRow);

                const [membershipsRes, assignmentsRes] = await Promise.all([
                    supabase
                        .from("organization_memberships")
                        .select("id, user_id, role, is_active, created_at")
                        .eq("organization_id", customerRow.id)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("machine_assignments")
                        .select("id, machine_id, assigned_at, assigned_by, is_active")
                        .eq("customer_org_id", customerRow.id)
                        .eq("is_active", true)
                        .order("assigned_at", { ascending: false }),
                ]);

                if (membershipsRes.error) throw membershipsRes.error;
                if (assignmentsRes.error) throw assignmentsRes.error;

                const membershipRows = (membershipsRes.data ?? []) as MembershipRow[];
                const assignmentRows = (assignmentsRes.data ?? []) as AssignmentRow[];

                if (!active) return;
                setMemberships(membershipRows);
                setAssignments(assignmentRows);

                const userIds = Array.from(
                    new Set(membershipRows.map((row) => row.user_id).filter(Boolean))
                );

                if (userIds.length > 0) {
                    const { data: profilesData, error: profilesError } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .in("id", userIds);

                    if (profilesError) throw profilesError;

                    const nextProfilesMap = new Map<string, ProfileRow>();
                    for (const row of (profilesData ?? []) as ProfileRow[]) {
                        nextProfilesMap.set(row.id, row);
                    }
                    if (active) setProfilesMap(nextProfilesMap);
                } else {
                    if (active) setProfilesMap(new Map());
                }

                const machineIds = Array.from(
                    new Set(assignmentRows.map((row) => row.machine_id).filter(Boolean))
                );

                if (machineIds.length > 0) {
                    const { data: machineData, error: machineError } = await supabase
                        .from("machines")
                        .select(
                            "id, name, internal_code, serial_number, model, brand, lifecycle_state"
                        )
                        .in("id", machineIds);

                    if (machineError) throw machineError;

                    const nextMachinesMap = new Map<string, MachineRow>();
                    for (const row of (machineData ?? []) as MachineRow[]) {
                        nextMachinesMap.set(row.id, row);
                    }
                    if (active) setMachinesMap(nextMachinesMap);
                } else {
                    if (active) setMachinesMap(new Map());
                }
            } catch (error) {
                console.error("Customer detail load error:", error);
                void router.replace(orgType === "manufacturer" ? "/customers" : "/dashboard");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, resolvedId, orgId, orgType, router]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Cliente - MACHINA" />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Caricamento cliente...
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!customer) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Cliente - MACHINA" />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-muted-foreground">
                                Cliente non trovato.
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    const activeUsers = memberships.filter((row) => row.is_active).length;
    const adminUsers = memberships.filter((row) =>
        ["owner", "admin", "supervisor"].includes(String(row.role || "").toLowerCase())
    ).length;

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${customer.name || "Cliente"} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex items-center gap-3">
                        <Link href={orgType === "manufacturer" ? "/customers" : "/dashboard"}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">{customer.name || "Cliente"}</h1>
                            <p className="text-sm text-muted-foreground">
                                Dettaglio cliente nel contesto attivo.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            icon={<Users className="h-5 w-5" />}
                            title="Utenti attivi"
                            value={activeUsers}
                        />
                        <KpiCard
                            icon={<Shield className="h-5 w-5" />}
                            title="Ruoli gestionali"
                            value={adminUsers}
                        />
                        <KpiCard
                            icon={<Wrench className="h-5 w-5" />}
                            title="Macchine assegnate"
                            value={assignments.length}
                        />
                        <KpiCard
                            icon={<Factory className="h-5 w-5" />}
                            title="Piano"
                            value={customer.subscription_plan || "—"}
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Anagrafica cliente
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow label="Nome" value={customer.name} />
                                <InfoRow label="Slug" value={customer.slug} />
                                <InfoRow label="Città" value={customer.city} />
                                <InfoRow label="Paese" value={customer.country} />
                                <InfoRow label="Email" value={customer.email} />
                                <InfoRow label="Telefono" value={customer.phone} />
                                <InfoRow
                                    label="Subscription status"
                                    value={customer.subscription_status}
                                />
                                <InfoRow
                                    label="Creato il"
                                    value={formatDate(customer.created_at)}
                                />

                                <div className="grid gap-3 pt-2 md:grid-cols-2">
                                    {customer.email && (
                                        <a
                                            href={`mailto:${customer.email}`}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-muted"
                                        >
                                            <Mail className="h-4 w-4" />
                                            Scrivi email
                                        </a>
                                    )}

                                    {customer.phone && (
                                        <a
                                            href={`tel:${customer.phone}`}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-muted"
                                        >
                                            <Phone className="h-4 w-4" />
                                            Chiama
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Utenti cliente
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {memberships.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                        Nessuna membership trovata.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {memberships.slice(0, 8).map((row) => (
                                            <div
                                                key={row.id}
                                                className="rounded-2xl border border-border p-4"
                                            >
                                                <div className="font-semibold text-foreground">
                                                    {displayName(profilesMap.get(row.user_id))}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    {profilesMap.get(row.user_id)?.email || "—"}
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                        {row.role || "—"}
                                                    </span>
                                                    <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                        {row.is_active ? "active" : "inactive"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wrench className="h-5 w-5" />
                                Macchine assegnate
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {assignments.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    Nessuna macchina assegnata a questo cliente.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {assignments.map((assignment) => {
                                        const machine = machinesMap.get(assignment.machine_id);

                                        return (
                                            <Link
                                                key={assignment.id}
                                                href={`/equipment/${assignment.machine_id}`}
                                                className="block"
                                            >
                                                <div className="rounded-2xl border border-border p-4 transition hover:bg-muted/30">
                                                    <div className="space-y-2">
                                                        <div className="text-lg font-semibold text-foreground">
                                                            {machine?.name || "Macchina"}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {machine?.internal_code ||
                                                                machine?.serial_number ||
                                                                assignment.machine_id}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            {machine?.model && (
                                                                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                                    {machine.model}
                                                                </span>
                                                            )}
                                                            {machine?.brand && (
                                                                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                                    {machine.brand}
                                                                </span>
                                                            )}
                                                            {machine?.lifecycle_state && (
                                                                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                                    {machine.lifecycle_state}
                                                                </span>
                                                            )}
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

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="max-w-[60%] text-right text-sm font-medium text-foreground">
                {value || "—"}
            </div>
        </div>
    );
}