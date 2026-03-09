// src/pages/assignments/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useLanguage } from "@/contexts/LanguageContext";
import { Package, ArrowRight, Factory, Building2 } from "lucide-react";

interface AssignmentRow {
    machine_id: string;
    customer_org_id: string | null;
    machine_name?: string | null;
    customer_name?: string | null;
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
            className={`rounded-[20px] border border-border bg-card shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)] ${className}`}
        >
            {children}
        </div>
    );
}

export default function AssignmentsPage() {
    const { t } = useLanguage();

    const [userRole, setUserRole] = useState("technician");
    const [rows, setRows] = useState < AssignmentRow[] > ([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId) return;

                setUserRole(ctx.role ?? "technician");

                const { data: assignments, error } = await supabase
                    .from("machine_assignments")
                    .select("machine_id, customer_org_id")
                    .eq("manufacturer_org_id", ctx.orgId)
                    .eq("is_active", true);

                if (error) throw error;

                const machineIds = (assignments ?? [])
                    .map((x: any) => x.machine_id)
                    .filter(Boolean);

                const customerIds = (assignments ?? [])
                    .map((x: any) => x.customer_org_id)
                    .filter(Boolean);

                const [machinesRes, customersRes] = await Promise.all([
                    machineIds.length
                        ? supabase.from("machines").select("id, name").in("id", machineIds)
                        : Promise.resolve({ data: [] } as any),
                    customerIds.length
                        ? supabase.from("organizations").select("id, name").in("id", customerIds)
                        : Promise.resolve({ data: [] } as any),
                ]);

                const machineMap = new Map((machinesRes.data ?? []).map((m: any) => [m.id, m.name]));
                const customerMap = new Map((customersRes.data ?? []).map((c: any) => [c.id, c.name]));

                setRows(
                    (assignments ?? []).map((row: any) => ({
                        machine_id: row.machine_id,
                        customer_org_id: row.customer_org_id,
                        machine_name: machineMap.get(row.machine_id) ?? null,
                        customer_name: customerMap.get(row.customer_org_id) ?? null,
                    }))
                );
            } catch (error) {
                console.error("Assignments load error:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("assignments.title")} - MACHINA`} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1220px] space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                {t("assignments.title")}
                            </h1>
                            <p className="text-base text-muted-foreground">
                                {t("assignments.subtitle")}
                            </p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <CardShell className="p-6">
                                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div className="text-5xl font-bold leading-none text-foreground">
                                    {rows.length}
                                </div>
                                <div className="mt-2 text-[22px] font-medium text-muted-foreground">
                                    {t("assignments.kpi.active")}
                                </div>
                            </CardShell>
                        </div>

                        <section className="space-y-4">
                            <h2 className="text-[32px] font-bold text-foreground">
                                {t("assignments.listTitle")}
                            </h2>

                            {loading ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("assignments.loading")}
                                </CardShell>
                            ) : rows.length === 0 ? (
                                <CardShell className="p-6 text-muted-foreground">
                                    {t("assignments.noResults")}
                                </CardShell>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {rows.map((row) => (
                                        <Link
                                            key={`${row.machine_id}-${row.customer_org_id}`}
                                            href={`/equipment/${row.machine_id}`}
                                            className="block"
                                        >
                                            <CardShell className="p-5 transition hover:translate-y-[-2px]">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                                                                <Factory className="h-5 w-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="truncate text-lg font-semibold text-foreground">
                                                                    {row.machine_name ?? t("assignments.machineFallback")}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {t("assignments.assignedMachine")}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                                                    </div>

                                                    <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                                                            <Building2 className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-semibold text-foreground">
                                                                {row.customer_name ?? t("assignments.customerFallback")}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {t("assignments.destinationCustomer")}
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