import { useMemo } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factory, Building2, ShieldAlert, Loader2 } from "lucide-react";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useMfaGuard } from "@/hooks/useMfaGuard";
import { useLanguage } from "@/contexts/LanguageContext";
import RequireAal2 from "@/components/Auth/RequireAal2";

function OrgIcon({ type }: { type: "manufacturer" | "customer" | null }) {
    const Icon = type === "manufacturer" ? Factory : Building2;
    return <Icon className="h-4 w-4" />;
}

export default function OrganizationSettingsPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { loading: mfaLoading, isAal2, needsMfa } = useMfaGuard();

    const { memberships, activeOrgId, activeOrgType, activeRole, loading } = useActiveOrganization();

    const currentMembership = useMemo(
        () => memberships.find((m) => m.organization_id === activeOrgId) ?? null,
        [memberships, activeOrgId]
    );

    if (mfaLoading) {
        return (
            <MainLayout userRole={(activeRole as any) ?? "technician"}>
                <div className="container mx-auto py-8">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (needsMfa && !isAal2) {
        return (
            <MainLayout userRole={(activeRole as any) ?? "technician"}>
                <SEO title={`${t("activeOrg.title")} - MACHINA`} />
                <div className="container mx-auto max-w-2xl py-10">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-500" />
                            <div className="space-y-3">
                                <div className="text-lg font-semibold">Verifica 2FA richiesta</div>
                                <div className="text-sm text-muted-foreground">
                                    Per modificare l’organizzazione attiva devi completare l’autenticazione a due fattori.
                                </div>
                                <Button onClick={() => router.push("/settings/security")}>
                                    Vai a Sicurezza
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <RequireAal2
            userRole={activeRole as string}
            title="Verifica 2FA richiesta"
            description="Per modificare l’organizzazione attiva devi completare l’autenticazione a due fattori."
        >
            <MainLayout userRole={(activeRole as any) ?? "technician"}>
                {/* contenuto pagina */}
            </MainLayout>
        </RequireAal2>
    );

    return (
        <MainLayout userRole={(activeRole as any) ?? "technician"}>
            <SEO title={`${t("activeOrg.title")} - MACHINA`} />

            <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{t("activeOrg.title")}</CardTitle>
                        <CardDescription>{t("activeOrg.description")}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <OrganizationSwitcher />

                        {currentMembership && (
                            <div className="rounded-xl border border-border bg-muted/30 p-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <OrgIcon type={activeOrgType} />
                                    <div className="font-medium">{currentMembership.organization?.name}</div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="capitalize">
                                        {activeOrgType ?? t("activeOrg.fallbackOrganization")}
                                    </Badge>
                                    <Badge variant="outline" className="capitalize">
                                        {activeRole ?? "technician"}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {!loading && memberships.length === 0 && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                                {t("activeOrg.noMemberships")}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{t("activeOrg.membershipsTitle")}</CardTitle>
                        <CardDescription>{t("activeOrg.membershipsDescription")}</CardDescription>
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
                                            {membership.organization?.name ?? membership.organization_id}
                                        </div>
                                    </div>
                                    <div className="text-sm capitalize text-muted-foreground">
                                        {membership.organization?.type ?? t("activeOrg.fallbackOrganization")} · {membership.role}
                                    </div>
                                </div>

                                {membership.organization_id === activeOrgId && (
                                    <Badge className="capitalize">{t("activeOrg.activeBadge")}</Badge>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}