// src/pages/analytics/index.tsx
import Link from "next/link";
import ProtectedPage from "@/components/app/ProtectedPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CheckSquare, ClipboardList, ChevronRight } from "lucide-react";

const items = [
    {
        href: "/checklists/executions",
        title: "Storico checklist",
        description: "Analizza le esecuzioni checklist nel contesto organizzativo attivo.",
        icon: CheckSquare,
    },
    {
        href: "/work-orders",
        title: "Work orders",
        description: "Controlla andamento e tracciabilità operativa degli ordini di lavoro.",
        icon: ClipboardList,
    },
];

export default function AnalyticsHomePage() {
    return (
        <ProtectedPage title="Analytics - MACHINA">
            <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                            <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold">Analytics</h1>
                            <p className="text-sm text-muted-foreground">
                                Punto unico per consultare i dati operativi del contesto attivo.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
