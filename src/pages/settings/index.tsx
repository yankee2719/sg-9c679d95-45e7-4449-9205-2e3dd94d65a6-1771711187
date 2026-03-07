// src/pages/settings/index.tsx
import Link from "next/link";
import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building2, UserCog, ShieldCheck, ChevronRight } from "lucide-react";

const items = [
    {
        href: "/settings/organization",
        title: "Organizzazione attiva",
        description:
            "Seleziona il contesto reale della webapp tramite profiles.default_organization_id.",
        icon: Building2,
    },
    {
        href: "/users",
        title: "Utenti e ruoli",
        description:
            "Gestisci admin, supervisor e technician nel contesto organizzativo attivo.",
        icon: UserCog,
    },
    {
        href: "/compliance",
        title: "Compliance",
        description:
            "Accedi alla documentazione e ai controlli legati alla conformità del contesto attivo.",
        icon: ShieldCheck,
    },
];

export default function SettingsHomePage() {
    return (
        <OrgContextGuard>
            <MainLayout>
                <SEO title="Impostazioni - MACHINA" />

                <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                            <Settings className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold">Impostazioni</h1>
                            <p className="text-sm text-muted-foreground">
                                Punto unico per configurare il contesto attivo e le aree di governance.
                            </p>
                        </div>
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
            </MainLayout>
        </OrgContextGuard>
    );
}
