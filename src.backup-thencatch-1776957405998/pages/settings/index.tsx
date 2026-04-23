import Link from "next/link";
import { Bell, ChevronRight, GitBranch, Settings2, ShieldCheck, SlidersHorizontal, UserCircle2 } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

type SettingLink = {
    href: string;
    title: string;
    description: string;
    icon: any;
};

export default function SettingsIndexPage() {
    const { t } = useLanguage();
    const tx = (key: string, fallback: string) => {
        const value = t(key);
        return value === key ? fallback : value;
    };

    const items: SettingLink[] = [
        {
            href: "/settings/profile",
            title: tx("settings.profile", "Profilo"),
            description: "Dati anagrafici, nome visualizzato e informazioni account.",
            icon: UserCircle2,
        },
        {
            href: "/settings/preferences",
            title: tx("settings.preferences", "Preferenze"),
            description: "Tema, lingua e preferenze d'uso dell'interfaccia.",
            icon: SlidersHorizontal,
        },
        {
            href: "/settings/notifications",
            title: tx("settings.notifications", "Notifiche"),
            description: "Notifiche recenti, stato lettura e pulizia elementi letti.",
            icon: Bell,
        },
        {
            href: "/settings/security",
            title: tx("settings.security", "Sicurezza"),
            description: "Password, 2FA, sessioni e protezione dell'account.",
            icon: ShieldCheck,
        },
        {
            href: "/settings/organization",
            title: tx("settings.organization", "Organizzazione attiva"),
            description: "Dati organizzazione, logo e impostazioni dell'azienda corrente.",
            icon: Settings2,
        },
        {
            href: "/settings/operational-flows",
            title: "Flussi operativi",
            description: "Vista guidata di piani, ordini di lavoro, checklist ed esecuzioni.",
            icon: GitBranch,
        },
    ];

    return (
        <>
            <SEO title="Impostazioni" />
            <MainLayout>
                <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">Impostazioni</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestisci profilo, preferenze, notifiche, sicurezza e configurazione dell'organizzazione attiva.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link key={item.href} href={item.href} className="group">
                                    <Card className="h-full rounded-2xl transition-colors hover:border-primary/40">
                                        <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base">{item.title}</CardTitle>
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                            </div>
                                            <div className="rounded-xl border border-border bg-muted/40 p-2">
                                                <Icon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex items-center justify-between text-sm text-primary">
                                            <span>Apri sezione</span>
                                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </MainLayout>
        </>
    );
}

