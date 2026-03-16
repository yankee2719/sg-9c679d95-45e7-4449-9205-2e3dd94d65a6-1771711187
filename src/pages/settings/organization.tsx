import { useMemo } from "react";
import { Building2, Factory, RefreshCw } from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        title: "Organizzazione attiva",
        description:
            "Seleziona il contesto reale della web app. Tutte le viste devono leggere questa organizzazione come contesto attivo.",
        currentMembership: "Contesto corrente",
        membershipsTitle: "Membership attive",
        membershipsDescription:
            "Controlla rapidamente in quali organizzazioni sei attivo e con quale ruolo.",
        noMemberships: "Nessuna membership attiva trovata.",
        active: "Attiva",
        fallback: "organizzazione",
        reload: "Ricarica",
        loading: "Caricamento organizzazioni...",
        activeOrg: "Organizzazione attiva",
    },
    en: {
        seo: "Active organization - MACHINA",
        title: "Active organization",
        description:
            "Select the real app context. All views should read this organization as the active context.",
        currentMembership: "Current context",
        membershipsTitle: "Active memberships",
        membershipsDescription:
            "Quickly check which organizations you are active in and with which role.",
        noMemberships: "No active memberships found.",
        active: "Active",
        fallback: "organization",
        reload: "Reload",
        loading: "Loading organizations...",
        activeOrg: "Active organization",
    },
    fr: {
        seo: "Organisation active - MACHINA",
        title: "Organisation active",
        description:
            "Sélectionnez le vrai contexte de l’application. Toutes les vues doivent lire cette organisation comme contexte actif.",
        currentMembership: "Contexte actuel",
        membershipsTitle: "Adhésions actives",
        membershipsDescription:
            "Vérifiez rapidement dans quelles organisations vous êtes actif et avec quel rôle.",
        noMemberships: "Aucune adhésion active trouvée.",
        active: "Active",
        fallback: "organisation",
        reload: "Recharger",
        loading: "Chargement des organisations...",
        activeOrg: "Organisation active",
    },
    es: {
        seo: "Organización activa - MACHINA",
        title: "Organización activa",
        description:
            "Selecciona el contexto real de la aplicación. Todas las vistas deben leer esta organización como contexto activo.",
        currentMembership: "Contexto actual",
        membershipsTitle: "Membresías activas",
        membershipsDescription:
            "Comprueba rápidamente en qué organizaciones estás activo y con qué rol.",
        noMemberships: "No se encontraron membresías activas.",
        active: "Activa",
        fallback: "organización",
        reload: "Recargar",
        loading: "Cargando organizaciones...",
        activeOrg: "Organización activa",
    },
} as const;

export default function OrganizationSettingsPage() {
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);
    const {
        memberships,
        activeOrgId,
        activeOrgType,
        activeRole,
        loading,
        saving,
        reload,
        error,
    } = useActiveOrganization();

    const currentMembership = useMemo(
        () => memberships.find((membership) => membership.organization_id === activeOrgId) ?? null,
        [memberships, activeOrgId]
    );

    return (
        <MainLayout userRole={(activeRole as string) ?? "technician"}>
            <SEO title={text.seo} />

            <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle>{text.title}</CardTitle>
                                <CardDescription>{text.description}</CardDescription>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => void reload()}
                                disabled={loading || saving}
                            >
                                <RefreshCw
                                    className={`mr-2 h-4 w-4 ${loading || saving ? "animate-spin" : ""
                                        }`}
                                />
                                {text.reload}
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <OrganizationSwitcher />

                        {loading && (
                            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                {text.loading}
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {currentMembership && (
                            <div className="rounded-xl border border-border bg-muted/30 p-4">
                                <div className="mb-2 text-sm font-medium text-muted-foreground">
                                    {text.currentMembership}
                                </div>
                                <div className="mb-2 flex items-center gap-2">
                                    <OrgIcon type={activeOrgType} />
                                    <div className="font-medium">
                                        {currentMembership.organization?.name}
                                    </div>
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
                            <div
                                key={membership.organization_id}
                                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <OrgIcon type={membership.organization?.type ?? null} />
                                        <div className="truncate font-medium">
                                            {membership.organization?.name ??
                                                membership.organization_id}
                                        </div>
                                    </div>
                                    <div className="text-sm capitalize text-muted-foreground">
                                        {membership.organization?.type ?? text.fallback} ·{" "}
                                        {membership.role}
                                    </div>
                                </div>
                                {membership.organization_id === activeOrgId && (
                                    <Badge className="capitalize">{text.active}</Badge>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}