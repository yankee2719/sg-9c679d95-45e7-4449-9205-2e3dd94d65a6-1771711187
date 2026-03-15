import { useMemo } from "react";
import { Building2, Factory } from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import RequireAal2 from "@/components/Auth/RequireAal2";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

function OrgIcon({ type }: { type: "manufacturer" | "customer" | null }) {
    const Icon = type === "manufacturer" ? Factory : Building2;
    return <Icon className="h-4 w-4" />;
}

const copy = {
    it: {
        seo: "Organizzazione attiva - MACHINA",
        gateTitle: "Verifica 2FA richiesta",
        gateDescription: "Per modificare l’organizzazione attiva devi completare l’autenticazione a due fattori.",
        title: "Organizzazione attiva",
        description: "Seleziona il contesto reale della web app. Tutte le viste devono leggere questa organizzazione come contesto attivo.",
        currentMembership: "Contesto corrente",
        membershipsTitle: "Membership attive",
        membershipsDescription: "Controlla rapidamente in quali organizzazioni sei attivo e con quale ruolo.",
        noMemberships: "Nessuna membership attiva trovata.",
        active: "Attiva",
        fallback: "organizzazione",
    },
    en: {
        seo: "Active organization - MACHINA",
        gateTitle: "2FA verification required",
        gateDescription: "You must complete two-factor authentication before changing the active organization.",
        title: "Active organization",
        description: "Select the real app context. All views should read this organization as the active context.",
        currentMembership: "Current context",
        membershipsTitle: "Active memberships",
        membershipsDescription: "Quickly check which organizations you are active in and with which role.",
        noMemberships: "No active memberships found.",
        active: "Active",
        fallback: "organization",
    },
    fr: {
        seo: "Organisation active - MACHINA",
        gateTitle: "Vérification 2FA requise",
        gateDescription: "Vous devez terminer l’authentification à deux facteurs avant de modifier l’organisation active.",
        title: "Organisation active",
        description: "Sélectionnez le vrai contexte de l’application. Toutes les vues doivent lire cette organisation comme contexte actif.",
        currentMembership: "Contexte actuel",
        membershipsTitle: "Adhésions actives",
        membershipsDescription: "Vérifiez rapidement dans quelles organisations vous êtes actif et avec quel rôle.",
        noMemberships: "Aucune adhésion active trouvée.",
        active: "Active",
        fallback: "organisation",
    },
    es: {
        seo: "Organización activa - MACHINA",
        gateTitle: "Verificación 2FA requerida",
        gateDescription: "Debes completar la autenticación de dos factores antes de cambiar la organización activa.",
        title: "Organización activa",
        description: "Selecciona el contexto real de la aplicación. Todas las vistas deben leer esta organización como contexto activo.",
        currentMembership: "Contexto actual",
        membershipsTitle: "Membresías activas",
        membershipsDescription: "Comprueba rápidamente en qué organizaciones estás activo y con qué rol.",
        noMemberships: "No se encontraron membresías activas.",
        active: "Activa",
        fallback: "organización",
    },
} as const;

export default function OrganizationSettingsPage() {
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);
    const { memberships, activeOrgId, activeOrgType, activeRole, loading } = useActiveOrganization();

    const currentMembership = useMemo(
        () => memberships.find((membership) => membership.organization_id === activeOrgId) ?? null,
        [memberships, activeOrgId]
    );

    return (
        <RequireAal2 userRole={activeRole as string} title={text.gateTitle} description={text.gateDescription}>
            <MainLayout userRole={(activeRole as any) ?? "technician"}>
                <SEO title={text.seo} />

                <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>{text.title}</CardTitle>
                            <CardDescription>{text.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <OrganizationSwitcher />

                            {currentMembership && (
                                <div className="rounded-xl border border-border bg-muted/30 p-4">
                                    <div className="mb-2 text-sm font-medium text-muted-foreground">{text.currentMembership}</div>
                                    <div className="mb-2 flex items-center gap-2">
                                        <OrgIcon type={activeOrgType} />
                                        <div className="font-medium">{currentMembership.organization?.name}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary" className="capitalize">
                                            {activeOrgType ?? text.fallback}
                                        </Badge>
                                        <Badge variant="outline" className="capitalize">
                                            {activeRole ?? "technician"}
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            {!loading && memberships.length === 0 && (
                                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                                    {text.noMemberships}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>{text.membershipsTitle}</CardTitle>
                            <CardDescription>{text.membershipsDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {memberships.map((membership) => (
                                <div key={membership.organization_id} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <OrgIcon type={membership.organization?.type ?? null} />
                                            <div className="truncate font-medium">
                                                {membership.organization?.name ?? membership.organization_id}
                                            </div>
                                        </div>
                                        <div className="text-sm capitalize text-muted-foreground">
                                            {membership.organization?.type ?? text.fallback} · {membership.role}
                                        </div>
                                    </div>
                                    {membership.organization_id === activeOrgId && <Badge className="capitalize">{text.active}</Badge>}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </RequireAal2>
    );
}
