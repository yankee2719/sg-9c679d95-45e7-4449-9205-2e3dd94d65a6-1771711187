// src/pages/compliance/index.tsx
import Link from "next/link";
import ProtectedPage from "@/components/app/ProtectedPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, FileText, AlertTriangle, ChevronRight } from "lucide-react";

const items = [
    {
        href: "/documents",
        title: "Documentazione di conformità",
        description: "Manuali, dichiarazioni, schemi e documenti rilevanti per la conformità.",
        icon: FileText,
    },
    {
        href: "/analytics",
        title: "Analytics e storico",
        description: "Storico esecuzioni checklist e dati utili per audit interni.",
        icon: ShieldCheck,
    },
    {
        href: "/checklists/executions",
        title: "Esecuzioni checklist",
        description: "Verifica esecuzioni e prove operative collegate al contesto attivo.",
        icon: AlertTriangle,
    },
];

export default function ComplianceIndexPage() {
    return (
        <ProtectedPage title="Compliance - MACHINA">
            <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Compliance</h1>
                    <p className="text-sm text-muted-foreground">
                        Hub di accesso rapido ai moduli utili per conformità, audit e tracciabilità.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href} className="block">
                                <Card className="rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-sm">
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                                <Icon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <CardTitle className="text-base">{item.title}</CardTitle>
                                        <CardDescription>{item.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent />
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </ProtectedPage>
    );
}
