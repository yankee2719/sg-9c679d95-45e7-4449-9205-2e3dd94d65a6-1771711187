import Link from "next/link";
import {
    Building2,
    Shield,
    Bell,
    UserCircle2,
    Wrench,
    Layers3,
    Trash2,
} from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const copy = {
    it: {
        seo: "Impostazioni - MACHINA",
        title: "Impostazioni",
        subtitle:
            "Centro configurazione della web app. Da qui gestisci contesto, sicurezza e preferenze operative.",
        activeOrganization: "Organizzazione attiva",
        currentRole: "Ruolo corrente",
        profile: "Profilo",
        security: "Sicurezza",
        notifications: "Notifiche",
        organization: "Organizzazione",
        preferences: "Preferenze",
        trash: "Cestino di sistema",
        profileDesc:
            "Controlla le informazioni principali del tuo account e del contesto attivo.",
        securityDesc: "Gestisci MFA / 2FA e sicurezza del tuo accesso.",
        notificationsDesc: "Rivedi lo stato delle notifiche e dei badge operativi.",
        organizationDesc: "Controlla e cambia il contesto organizzativo attivo.",
        preferencesDesc:
            "Area per estensioni future: lingua, vista operativa e opzioni personali.",
        trashDesc:
            "Ripristina entità eliminate logicamente e riduci il rischio di cancellazioni involontarie.",
        manufacturer: "Costruttore",
        customer: "Cliente finale",
        unknown: "—",
    },
    en: {
        seo: "Settings - MACHINA",
        title: "Settings",
        subtitle:
            "Configuration hub of the web app. Manage context, security and operational preferences.",
        activeOrganization: "Active organization",
        currentRole: "Current role",
        profile: "Profile",
        security: "Security",
        notifications: "Notifications",
        organization: "Organization",
        preferences: "Preferences",
        trash: "System trash",
        profileDesc: "Check core account information and the active context.",
        securityDesc: "Manage MFA / 2FA and access security.",
        notificationsDesc: "Review notification status and operational badges.",
        organizationDesc: "Check and switch the active organizational context.",
        preferencesDesc:
            "Area for future extensions: language, operational view and personal options.",
        trashDesc:
            "Restore logically deleted entities and reduce accidental deletion risk.",
        manufacturer: "Manufacturer",
        customer: "Customer",
        unknown: "—",
    },
    fr: {
        seo: "Paramètres - MACHINA",
        title: "Paramètres",
        subtitle:
            "Centre de configuration de l’application. Gérez le contexte, la sécurité et les préférences.",
        activeOrganization: "Organisation active",
        currentRole: "Rôle actuel",
        profile: "Profil",
        security: "Sécurité",
        notifications: "Notifications",
        organization: "Organisation",
        preferences: "Préférences",
        trash: "Corbeille système",
        profileDesc: "Vérifiez les informations du compte et du contexte actif.",
        securityDesc: "Gérez la MFA / 2FA et la sécurité d’accès.",
        notificationsDesc: "Consultez l’état des notifications et des badges.",
        organizationDesc: "Contrôlez et changez le contexte organisationnel actif.",
        preferencesDesc:
            "Zone pour futures extensions : langue, vue opérationnelle et options personnelles.",
        trashDesc:
            "Restaurez les éléments supprimés logiquement et réduisez les suppressions accidentelles.",
        manufacturer: "Constructeur",
        customer: "Client final",
        unknown: "—",
    },
    es: {
        seo: "Configuración - MACHINA",
        title: "Configuración",
        subtitle:
            "Centro de configuración de la app. Gestiona contexto, seguridad y preferencias operativas.",
        activeOrganization: "Organización activa",
        currentRole: "Rol actual",
        profile: "Perfil",
        security: "Seguridad",
        notifications: "Notificaciones",
        organization: "Organización",
        preferences: "Preferencias",
        trash: "Papelera del sistema",
        profileDesc: "Revisa la información principal de tu cuenta y del contexto activo.",
        securityDesc: "Gestiona MFA / 2FA y la seguridad del acceso.",
        notificationsDesc: "Revisa el estado de notificaciones y badges operativos.",
        organizationDesc: "Controla y cambia el contexto organizativo activo.",
        preferencesDesc:
            "Área para futuras extensiones: idioma, vista operativa y opciones personales.",
        trashDesc:
            "Restaura entidades eliminadas lógicamente y reduce el riesgo de borrados accidentales.",
        manufacturer: "Fabricante",
        customer: "Cliente final",
        unknown: "—",
    },
} as const;

function SettingLinkCard({
    href,
    icon,
    title,
    description,
}: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <Link href={href} className="block">
            <Card className="h-full rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {icon}
                        {title}
                    </CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
            </Card>
        </Link>
    );
}

export default function SettingsPage() {
    const { language } = useLanguage();
    const text = copy[language];
    const { profile, organization, membership } = useAuth();

    const userRole = membership?.role ?? "technician";
    const orgType =
        organization?.type === "manufacturer"
            ? text.manufacturer
            : organization?.type === "customer"
                ? text.customer
                : text.unknown;

    const profileName =
        profile?.display_name?.trim() ||
        `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
        profile?.email ||
        text.unknown;

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={text.seo} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1380px] space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                {text.title}
                            </h1>
                            <p className="text-base text-muted-foreground">{text.subtitle}</p>
                        </div>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>{text.profile}</CardTitle>
                                <CardDescription>{text.profileDesc}</CardDescription>
                            </CardHeader>
                            <div className="grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-xl border border-border bg-muted/30 p-4">
                                    <div className="text-sm text-muted-foreground">User</div>
                                    <div className="mt-1 font-semibold text-foreground">
                                        {profileName}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-muted/30 p-4">
                                    <div className="text-sm text-muted-foreground">
                                        {text.activeOrganization}
                                    </div>
                                    <div className="mt-1 font-semibold text-foreground">
                                        {organization?.name || text.unknown}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-muted/30 p-4">
                                    <div className="text-sm text-muted-foreground">
                                        {text.currentRole}
                                    </div>
                                    <div className="mt-1 font-semibold text-foreground capitalize">
                                        {membership?.role || text.unknown}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-muted/30 p-4">
                                    <div className="text-sm text-muted-foreground">Context</div>
                                    <div className="mt-1 flex items-center gap-2 font-semibold text-foreground">
                                        <Badge variant="outline">{orgType}</Badge>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            <SettingLinkCard
                                href="/settings/security"
                                icon={<Shield className="h-5 w-5" />}
                                title={text.security}
                                description={text.securityDesc}
                            />

                            <SettingLinkCard
                                href="/notifications"
                                icon={<Bell className="h-5 w-5" />}
                                title={text.notifications}
                                description={text.notificationsDesc}
                            />

                            <SettingLinkCard
                                href="/settings/organization"
                                icon={<Building2 className="h-5 w-5" />}
                                title={text.organization}
                                description={text.organizationDesc}
                            />

                            <SettingLinkCard
                                href="/settings/trash"
                                icon={<Trash2 className="h-5 w-5" />}
                                title={text.trash}
                                description={text.trashDesc}
                            />

                            <SettingLinkCard
                                href="/dashboard"
                                icon={<UserCircle2 className="h-5 w-5" />}
                                title={text.profile}
                                description={text.profileDesc}
                            />

                            <SettingLinkCard
                                href="/maintenance"
                                icon={<Wrench className="h-5 w-5" />}
                                title={text.preferences}
                                description={text.preferencesDesc}
                            />

                            <SettingLinkCard
                                href="/work-orders"
                                icon={<Layers3 className="h-5 w-5" />}
                                title="Operational flows"
                                description="Accesso rapido ai flussi principali da cui dipendono stati, permessi e notifiche."
                            />
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}