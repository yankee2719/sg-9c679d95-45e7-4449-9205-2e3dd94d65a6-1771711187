// src/pages/settings/organization.tsx
import { useMemo } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Factory, Building2 } from "lucide-react";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

function OrgIcon({ type }: { type: "manufacturer" | "customer" | null }) {
    const Icon = type === "manufacturer" ? Factory : Building2;
    return <Icon className="w-4 h-4" />;
}

export default function OrganizationSettingsPage() {
    const { memberships, activeOrgId, activeOrgType, activeRole, loading } = useActiveOrganization();

    const currentMembership = useMemo(
        () => memberships.find((m) => m.organization_id === activeOrgId) ?? null,
        [memberships, activeOrgId]
    );

    return (
        <MainLayout userRole={(activeRole as any) ?? "technician"}>
            <SEO title="Organizzazione attiva - MACHINA" />

            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>Organizzazione attiva</CardTitle>
                        <CardDescription>
                            Qui scegli il contesto reale della webapp. Tutte le viste MACHINA devono leggere
                            questa organizzazione da <code>profiles.default_organization_id</code>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <OrganizationSwitcher />

                        {currentMembership && (
                            <div className="rounded-xl border border-border p-4 bg-muted/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <OrgIcon type={activeOrgType} />
                                    <div className="font-medium">{currentMembership.organization?.name}</div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="capitalize">
                                        {activeOrgType ?? "organization"}
                                    </Badge>
                                    <Badge variant="outline" className="capitalize">
                                        {activeRole ?? "technician"}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {!loading && memberships.length === 0 && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                                Non risultano membership attive. Senza almeno una membership attiva la webapp non
                                può determinare il contesto organizzativo.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>Membership attive</CardTitle>
                        <CardDescription>
                            Verifica rapidamente in quali organizzazioni sei attivo e con quale ruolo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {memberships.map((membership) => (
                            <div
                                key={membership.organization_id}
                                className="rounded-xl border border-border p-4 flex items-center justify-between gap-4"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <OrgIcon type={membership.organization?.type ?? null} />
                                        <div className="font-medium truncate">
                                            {membership.organization?.name ?? membership.organization_id}
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground capitalize">
                                        {membership.organization?.type ?? "organization"} · {membership.role}
                                    </div>
                                </div>

                                {membership.organization_id === activeOrgId && (
                                    <Badge className="capitalize">Attiva</Badge>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
