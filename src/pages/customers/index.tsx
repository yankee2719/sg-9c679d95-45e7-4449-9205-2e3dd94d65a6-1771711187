// src/pages/customers/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Building2, ArrowRight, Users, Plus } from "lucide-react";

interface CustomerRow {
    id: string;
    name: string | null;
    created_at?: string | null;
}

function CardShell({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-[20px] border border-white/10 bg-[#1b2b45] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)] ${className}`}>
            {children}
        </div>
    );
}

export default function CustomersPage() {
    const [userRole, setUserRole] = useState("technician");
    const [customers, setCustomers] = useState < CustomerRow[] > ([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId) return;

                setUserRole(ctx.role ?? "technician");

                const { data, error } = await supabase
                    .from("organizations")
                    .select("id, name, created_at")
                    .eq("manufacturer_org_id", ctx.orgId)
                    .eq("type", "customer")
                    .order("created_at", { ascending: false });

                if (error) throw error;
                setCustomers((data ?? []) as CustomerRow[]);
            } catch (error) {
                console.error("Customers load error:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Clienti - MACHINA" />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1220px] space-y-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-bold tracking-tight text-white">Clienti</h1>
                                <p className="text-base text-slate-300">
                                    Elenco organizzazioni cliente collegate al costruttore attivo.
                                </p>
                            </div>

                            <Link
                                href="/customers/new"
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-400"
                            >
                                <Plus className="h-4 w-4" />
                                Nuovo Cliente
                            </Link>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-white">{customers.length}</div>
                                <div className="mt-2 text-[22px] font-medium text-slate-200">Clienti Totali</div>
                            </CardShell>

                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-white">{customers.length}</div>
                                <div className="mt-2 text-[22px] font-medium text-slate-200">Organizzazioni Attive</div>
                            </CardShell>
                        </div>

                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-[32px] font-bold text-white">Elenco Clienti</h2>
                            </div>

                            {loading ? (
                                <CardShell className="p-6 text-slate-300">Caricamento clienti...</CardShell>
                            ) : customers.length === 0 ? (
                                <CardShell className="p-6 text-slate-300">Nessun cliente collegato.</CardShell>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {customers.map((customer) => (
                                        <Link key={customer.id} href={`/customers/${customer.id}`} className="block">
                                            <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-4">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                                                            <Building2 className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="truncate text-xl font-semibold text-white">
                                                                {customer.name ?? "Cliente"}
                                                            </div>
                                                            <div className="text-sm text-slate-300">Organizzazione cliente</div>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
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
