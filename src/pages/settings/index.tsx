import Link from "next/link";
import { useMemo } from "react";
import { Building2, ChevronRight, Settings, ShieldCheck, UserCog } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
    it: {
        seo: "Impostazioni - MACHINA",
        title: "Impostazioni",
        subtitle: "Punto unico per contesto attivo, utenti, sicurezza e governance.",
        items: [
            {
                href: "/settings/organization",
                title: "Organizzazione attiva",
                description: "Seleziona il contesto reale della web app.",
                icon: Building2,
            },
            {
                href: "/users",
                title: "Utenti e ruoli",
                description: "Gestisci admin, supervisor e technician nel contesto attivo.",
                icon: UserCog,
            },
            {
                href: "/settings/security",
                title: "Sicurezza",
                description: "Configura autenticazione a due fattori e sessione MFA.",
                icon: ShieldCheck,
            },
        ],
    },
    en: {
        seo: "Settings - MACHINA",
        title: "Settings",
        subtitle: "Single place for active context, users, security, and governance.",
        items: [
            {
                href: "/settings/organization",
                title: "Active organization",
                description: "Select the real app context.",
                icon: Building2,
            },
            {
                href: "/users",
                title: "Users and roles",
                description: "Manage admins, supervisors, and technicians in the active context.",
                icon: UserCog,
            },
            {
                href: "/settings/security",
                title: "Security",
                description: "Configure two-factor authentication and MFA session status.",
                icon: ShieldCheck,
            },
        ],
    },
    fr: {
        seo: "Paramètres - MACHINA",
        title: "Paramètres",
        subtitle: "Point unique pour le contexte actif, les utilisateurs, la sécurité et la gouvernance.",
        items: [
            {
                href: "/settings/organization",
                title: "Organisation active",
                description: "Sélectionnez le vrai contexte de l’application.",
                icon: Building2,
            },
            {
                href: "/users",
                title: "Utilisateurs et rôles",
                description: "Gérez admins, superviseurs et techniciens dans le contexte actif.",
                icon: UserCog,
            },
            {
                href: "/settings/security",
                title: "Sécurité",
                description: "Configurez l’authentification à deux facteurs et le statut MFA.",
                icon: ShieldCheck,
            },
        ],
    },
    es: {
        seo: "Configuración - MACHINA",
        title: "Configuración",
        subtitle: "Punto único para contexto activo, usuarios, seguridad y gobierno.",
        items: [
            {
                href: "/settings/organization",
                title: "Organización activa",
                description: "Selecciona el contexto real de la aplicación.",
                icon: Building2,
            },
            {
                href: "/users",
                title: "Usuarios y roles",
                description: "Gestiona admins, supervisors y technicians en el contexto activo.",
                icon: UserCog,
            },
            {
                href: "/settings/security",
                title: "Seguridad",
                description: "Configura autenticación de dos factores y el estado MFA.",
                icon: ShieldCheck,
            },
        ],
    },
} as const;

export default function SettingsHomePage() {
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);

    return (
        <OrgContextGuard>
            <MainLayout>
                <SEO title={text.seo} />
                <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                            <Settings className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold">{text.title}</h1>
                            <p className="text-sm text-muted-foreground">{text.subtitle}</p>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {text.items.map((item) => {
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
