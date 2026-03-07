// src/pages/documents/index.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import ProtectedPage from "@/components/app/ProtectedPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ShieldCheck, Factory, Building2, ChevronRight } from "lucide-react";

interface DocumentStats {
    total: number;
    manufacturerScope: number;
    customerScope: number;
}

export default function DocumentsHomePage() {
    const [stats, setStats] = useState < DocumentStats > ({
        total: 0,
        manufacturerScope: 0,
        customerScope: 0,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId) return;

                const { data, error } = await supabase
                    .from("documents")
                    .select("id, scope, organization_id")
                    .eq("organization_id", ctx.orgId);

                if (error) throw error;

                const rows = data ?? [];
                setStats({
                    total: rows.length,
                    manufacturerScope: rows.filter((r: any) => r.scope === "manufacturer").length,
                    customerScope: rows.filter((r: any) => r.scope === "customer").length,
                });
            } catch (error) {
                console.error("Documents hub load error:", error);
            }
        };

        load();
    }, []);

    const cards = [
        {
            title: "Documenti totali",
            description: "Archivio documentale visibile nel contesto organizzativo attivo.",
            value: stats.total,
            icon: FileText,
        },
        {
            title: "Documenti costruttore",
            description: "Manuali, CE, schemi e documentazione originaria.",
            value: stats.manufacturerScope,
            icon: Factory,
        },
        {
            title: "Documenti operativi cliente",
            description: "Procedure interne, report e documenti locali di stabilimento.",
            value: stats.customerScope,
            icon: Building2,
        },
    ];

    return (
        <ProtectedPage title="Documenti - MACHINA">
            <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Documenti</h1>
                    <p className="text-sm text-muted-foreground">
                        Hub documentale coerente con il nuovo modello owner / assignment.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Card key={card.title} className="rounded-2xl">
                                <CardHeader className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="text-2xl font-semibold">{card.value}</div>
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">{card.title}</CardTitle>
                                        <CardDescription>{card.description}</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        );
                    })}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Link href="/equipment" className="block">
                        <Card className="rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-sm">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <CardTitle className="text-base">Apri documenti macchina</CardTitle>
                                <CardDescription>
                                    Accedi ai documenti direttamente dal dettaglio macchina.
                                </CardDescription>
                            </CardHeader>
                            <CardContent />
                        </Card>
                    </Link>

                    <Link href="/compliance" className="block">
                        <Card className="rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-sm">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <CardTitle className="text-base">Vai alla compliance</CardTitle>
                                <CardDescription>
                                    Controlli, conformità e documentazione collegata al contesto attivo.
                                </CardDescription>
                            </CardHeader>
                            <CardContent />
                        </Card>
                    </Link>
                </div>
            </div>
        </ProtectedPage>
    );
}
