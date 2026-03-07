// src/pages/plants/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Building2, ArrowRight } from "lucide-react";

interface PlantRow {
    id: string;
    name: string | null;
    code: string | null;
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

export default function PlantsPage() {
    const [userRole, setUserRole] = useState("technician");
    const [plants, setPlants] = useState < PlantRow[] > ([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId) return;

                setUserRole(ctx.role ?? "technician");

                const { data, error } = await supabase
                    .from("plants")
                    .select("id, name, code")
                    .eq("organization_id", ctx.orgId)
                    .eq("is_archived", false)
                    .order("name", { ascending: true });

                if (error) throw error;
                setPlants((data ?? []) as PlantRow[]);
            } catch (error) {
                console.error("Plants load error:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Stabilimenti - MACHINA" />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1220px] space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-white">Stabilimenti</h1>
                            <p className="text-base text-slate-300">
                                Elenco stabilimenti del cliente finale nel contesto attivo.
                            </p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-white">{plants.length}</div>
                                <div className="mt-2 text-[22px] font-medium text-slate-200">Stabilimenti Attivi</div>
                            </CardShell>
                        </div>

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-white">Elenco Stabilimenti</h2>

                            {loading ? (
                                <CardShell className="p-6 text-slate-300">Caricamento stabilimenti...</CardShell>
                            ) : plants.length === 0 ? (
                                <CardShell className="p-6 text-slate-300">Nessuno stabilimento presente.</CardShell>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {plants.map((plant) => (
                                        <Link key={plant.id} href={`/plants/${plant.id}`} className="block">
                                            <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-4">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                                                            <Building2 className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="truncate text-xl font-semibold text-white">
                                                                {plant.name ?? "Stabilimento"}
                                                            </div>
                                                            <div className="text-sm text-slate-300">{plant.code ?? "—"}</div>
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
