import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    Building2,
    ArrowRight,
    Users,
    Plus,
    Search,
    Package,
} from "lucide-react";

interface CustomerRow {
    id: string;
    name: string | null;
    city: string | null;
    email: string | null;
    created_at: string | null;
    machine_count: number;
    member_count: number;
}

const copy = {
    it: {
        seo: "Clienti - MACHINA",
        title: "Clienti",
        subtitle: "Gestisci le organizzazioni cliente collegate al costruttore.",
        new: "Nuovo cliente",
        total: "Clienti totali",
        activeOrganizations: "Organizzazioni attive",
        assignedMachines: "Macchine assegnate",
        listTitle: "Elenco clienti",
        loading: "Caricamento clienti...",
        noResults: "Nessun cliente trovato.",
        fallbackTitle: "Cliente senza nome",
        customerOrganization: "Organizzazione cliente",
        search: "Cerca cliente...",
        unknown: "—",
    },
    en: {
        seo: "Customers - MACHINA",
        title: "Customers",
        subtitle: "Manage customer organizations linked to the manufacturer.",
        new: "New customer",
        total: "Total customers",
        activeOrganizations: "Active organizations",
        assignedMachines: "Assigned machines",
        listTitle: "Customer list",
        loading: "Loading customers...",
        noResults: "No customers found.",
        fallbackTitle: "Unnamed customer",
        customerOrganization: "Customer organization",
        search: "Search customer...",
        unknown: "—",
    },
    fr: {
        seo: "Clients - MACHINA",
        title: "Clients",
        subtitle: "Gérez les organisations clientes liées au constructeur.",
        new: "Nouveau client",
        total: "Clients totaux",
        activeOrganizations: "Organisations actives",
        assignedMachines: "Machines assignées",
        listTitle: "Liste des clients",
        loading: "Chargement des clients...",
        noResults: "Aucun client trouvé.",
        fallbackTitle: "Client sans nom",
        customerOrganization: "Organisation cliente",
        search: "Rechercher un client...",
        unknown: "—",
    },
    es: {
        seo: "Clientes - MACHINA",
        title: "Clientes",
        subtitle: "Gestiona las organizaciones cliente vinculadas al fabricante.",
        new: "Nuevo cliente",
        total: "Clientes totales",
        activeOrganizations: "Organizaciones activas",
        assignedMachines: "Máquinas asignadas",
        listTitle: "Lista de clientes",
        loading: "Cargando clientes...",
        noResults: "No se encontraron clientes.",
        fallbackTitle: "Cliente sin nombre",
        customerOrganization: "Organización cliente",
        search: "Buscar cliente...",
        unknown: "—",
    },
} as const;

function CardShell({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-[20px] border border-border bg-card shadow-[0_20px_40px_-24px_rgba(0,0,0,0.28)] ${className}`}
        >
            {children}
        </div>
    );
}

export default function CustomersPage() {
    const { language } = useLanguage();
    const text = copy[language];
    const { loading: authLoading, organization, membership } = useAuth();

    const [customers, setCustomers] = useState < CustomerRow[] > ([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const orgId = organization?.id ?? null;
    const orgType = organization?.type ?? null;
    const userRole = membership?.role ?? "technician";

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;

            if (!orgId || orgType !== "manufacturer") {
                if (active) setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const { data: customerRows, error: customerError } = await supabase
                    .from("organizations")
                    .select("id, name, city, email, created_at")
                    .eq("manufacturer_org_id", orgId)
                    .eq("type", "customer")
                    .order("created_at", { ascending: false });

                if (customerError) throw customerError;

                const customerIds = (customerRows ?? []).map((row: any) => row.id);

                let assignments: any[] = [];
                let memberships: any[] = [];

                if (customerIds.length > 0) {
                    const [assignmentsRes, membershipsRes] = await Promise.all([
                        supabase
                            .from("machine_assignments")
                            .select("customer_org_id")
                            .in("customer_org_id", customerIds)
                            .eq("is_active", true),
                        supabase
                            .from("organization_memberships")
                            .select("organization_id")
                            .in("organization_id", customerIds)
                            .eq("is_active", true),
                    ]);

                    if (assignmentsRes.error) throw assignmentsRes.error;
                    if (membershipsRes.error) throw membershipsRes.error;

                    assignments = assignmentsRes.data ?? [];
                    memberships = membershipsRes.data ?? [];
                }

                const machineCountMap = new Map < string, number> ();
                const memberCountMap = new Map < string, number> ();

                for (const row of assignments) {
                    const key = row.customer_org_id;
                    machineCountMap.set(key, (machineCountMap.get(key) ?? 0) + 1);
                }

                for (const row of memberships) {
                    const key = row.organization_id;
                    memberCountMap.set(key, (memberCountMap.get(key) ?? 0) + 1);
                }

                if (!active) return;

                setCustomers(
                    ((customerRows ?? []) as any[]).map((row) => ({
                        id: row.id,
                        name: row.name ?? null,
                        city: row.city ?? null,
                        email: row.email ?? null,
                        created_at: row.created_at ?? null,
                        machine_count: machineCountMap.get(row.id) ?? 0,
                        member_count: memberCountMap.get(row.id) ?? 0,
                    }))
                );
            } catch (error) {
                console.error("Customers load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, orgId, orgType]);

    const filteredCustomers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return customers;

        return customers.filter((customer) => {
            return (
                (customer.name ?? "").toLowerCase().includes(q) ||
                (customer.city ?? "").toLowerCase().includes(q) ||
                (customer.email ?? "").toLowerCase().includes(q)
            );
        });
    }, [customers, search]);

    const totals = useMemo(() => {
        return {
            customers: customers.length,
            activeOrganizations: customers.length,
            assignedMachines: customers.reduce((sum, row) => sum + row.machine_count, 0),
        };
    }, [customers]);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={text.seo} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1320px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                    {text.title}
                                </h1>
                                <p className="text-base text-muted-foreground">
                                    {text.subtitle}
                                </p>
                            </div>

                            {orgType === "manufacturer" && (
                                <Link
                                    href="/customers/new"
                                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                                >
                                    <Plus className="h-4 w-4" />
                                    {text.new}
                                </Link>
                            )}
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {totals.customers}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {text.total}
                                </div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {totals.activeOrganizations}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {text.activeOrganizations}
                                </div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {totals.assignedMachines}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {text.assignedMachines}
                                </div>
                            </CardShell>
                        </div>

                        <CardShell className="p-5">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={text.search}
                                    className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-foreground outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                        </CardShell>

                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-[32px] font-bold text-foreground">
                                    {text.listTitle}
                                </h2>
                            </div>

                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {text.loading}
                                </CardShell>
                            ) : filteredCustomers.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {text.noResults}
                                </CardShell>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredCustomers.map((customer) => (
                                        <Link
                                            key={customer.id}
                                            href={`/customers/${customer.id}`}
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
                                                                    {customer.name ?? text.fallbackTitle}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {text.customerOrganization}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div className="rounded-xl bg-muted p-3">
                                                            <div className="text-muted-foreground">
                                                                City
                                                            </div>
                                                            <div className="font-medium text-foreground">
                                                                {customer.city ?? text.unknown}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-xl bg-muted p-3">
                                                            <div className="text-muted-foreground">
                                                                Users
                                                            </div>
                                                            <div className="font-medium text-foreground">
                                                                {customer.member_count}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-xl bg-muted p-3">
                                                            <div className="text-muted-foreground">
                                                                Machines
                                                            </div>
                                                            <div className="font-medium text-foreground">
                                                                {customer.machine_count}
                                                            </div>
                                                        </div>
                                                        <div className="rounded-xl bg-muted p-3">
                                                            <div className="text-muted-foreground">
                                                                Email
                                                            </div>
                                                            <div className="truncate font-medium text-foreground">
                                                                {customer.email ?? text.unknown}
                                                            </div>
                                                        </div>
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