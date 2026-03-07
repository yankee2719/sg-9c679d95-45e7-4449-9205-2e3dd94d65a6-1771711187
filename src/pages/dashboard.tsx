// src/pages/dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import OrgContextGuard from "@/components/auth/OrgContextGuard";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, FileText, ClipboardList, CheckSquare } from "lucide-react";

interface DashboardStats {
    machines: number;
    documents: number;
    workOrders: number;
    checklistTemplates: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState < DashboardStats > ({
        machines: 0,
        documents: 0,
        workOrders: 0,
        checklistTemplates: 0,
    });

    useEffect(() => {
        const load = async () => {
            const ctx = await getUserContext();
            if (!ctx?.orgId) return;

            const [machines, documents, workOrders, checklistTemplates] = await Promise.all([
                supabase.from("machines").select("*", { count: "exact", head: true }).eq("organization_id", ctx.orgId),
                supabase.from("documents").select("*", { count: "exact", head: true }).eq("organization_id", ctx.orgId),
                supabase.from("work_orders").select("*", { count: "exact", head: true }).eq("organization_id", ctx.orgId),
                supabase.from("checklist_templates").select("*", { count: "exact", head: true }).eq("organization_id", ctx.orgId),
            ]);

            setStats({
                machines: machines.count || 0,
                documents: documents.count || 0,
                workOrders: workOrders.count || 0,
                checklistTemplates: checklistTemplates.count || 0,
            });
        };

        load();
    }, []);

    const cards = [
        { title: "Macchine", value: stats.machines, icon: Factory },
        { title: "Documenti", value: stats.documents, icon: FileText },
        { title: "Work Orders", value: stats.workOrders, icon: ClipboardList },
        { title: "Checklist", value: stats.checklistTemplates, icon: CheckSquare },
    ];

    return (
        <OrgContextGuard>
            <MainLayout>
                <SEO title="Dashboard - MACHINA" />
                <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
                    <div>
                        <h1 className="text-2xl font-semibold">Dashboard</h1>
                        <p className="text-sm text-muted-foreground">
                            Vista rapida del contesto organizzativo attivo.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {cards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <Card key={card.title} className="rounded-2xl">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{card.value}</div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
