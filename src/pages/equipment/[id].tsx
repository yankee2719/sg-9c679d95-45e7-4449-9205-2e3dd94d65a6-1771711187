import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import DocumentManager from "@/components/documents/DocumentManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, FileText, Factory, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type OrgType = "manufacturer" | "customer";

interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
    notes: string | null;
    lifecycle_state: string | null;
    organization_id: string | null;
    plant_id: string | null;
    production_line_id: string | null;
    is_archived: boolean | null;
    created_at?: string | null;
}

interface PlantRow {
    id: string;
    name: string | null;
    code?: string | null;
}

interface LineRow {
    id: string;
    name: string | null;
    code?: string | null;
}

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { id } = router.query;
    const { loading: authLoading, organization, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [machine, setMachine] = useState < MachineRow | null > (null);
    const [plant, setPlant] = useState < PlantRow | null > (null);
    const [line, setLine] = useState < LineRow | null > (null);

    const userRole = membership?.role ?? "technician";
    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;

    const resolvedId = useMemo(() => {
        return typeof id === "string" ? id : null;
    }, [id]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!resolvedId || authLoading) return;

            if (!orgId || !orgType) {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const { data: machineRow, error: machineError } = await supabase
                    .from("machines")
                    .select("*")
                    .eq("id", resolvedId)
                    .maybeSingle();

                if (machineError) throw machineError;
                if (!machineRow) {
                    toast({
                        title: "Macchina non trovata",
                        description: "La macchina richiesta non esiste oppure non è accessibile.",
                        variant: "destructive",
                    });
                    void router.replace("/equipment");
                    return;
                }

                const machineData = machineRow as MachineRow;

                let allowed = false;

                if (orgType === "manufacturer") {
                    allowed = machineData.organization_id === orgId;
                } else {
                    if (machineData.organization_id === orgId) {
                        allowed = true;
                    } else {
                        const { data: assignmentRow, error: assignmentError } = await supabase
                            .from("machine_assignments")
                            .select("id")
                            .eq("machine_id", machineData.id)
                            .eq("customer_org_id", orgId)
                            .eq("is_active", true)
                            .maybeSingle();

                        if (assignmentError) throw assignmentError;
                        allowed = !!assignmentRow;
                    }
                }

                if (!allowed) {
                    toast({
                        title: "Accesso negato",
                        description: "La macchina richiesta non è disponibile nel contesto attivo.",
                        variant: "destructive",
                    });
                    void router.replace("/equipment");
                    return;
                }

                if (!active) return;
                setMachine(machineData);

                if (machineData.plant_id) {
                    const { data: plantRow } = await supabase
                        .from("plants")
                        .select("id, name, code")
                        .eq("id", machineData.plant_id)
                        .maybeSingle();

                    if (active) setPlant((plantRow as PlantRow) ?? null);
                } else {
                    if (active) setPlant(null);
                }

                if (machineData.production_line_id) {
                    const { data: lineRow } = await supabase
                        .from("production_lines")
                        .select("id, name, code")
                        .eq("id", machineData.production_line_id)
                        .maybeSingle();

                    if (active) setLine((lineRow as LineRow) ?? null);
                } else {
                    if (active) setLine(null);
                }
            } catch (error: any) {
                console.error(error);
                toast({
                    title: "Errore",
                    description: error?.message ?? "Errore caricamento dettaglio macchina.",
                    variant: "destructive",
                });
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [resolvedId, authLoading, orgId, orgType, router, toast]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole as any}>
                    <SEO title="Macchina - MACHINA" />
                    <div className="container mx-auto max-w-7xl px-4 py-8">
                        <div className="text-sm text-muted-foreground">Caricamento macchina...</div>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!machine) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole as any}>
                    <SEO title="Macchina - MACHINA" />
                    <div className="container mx-auto max-w-7xl px-4 py-8">
                        <div className="text-sm text-muted-foreground">Macchina non trovata.</div>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole as any}>
                <SEO title={`${machine.name ?? "Macchina"} - MACHINA`} />

                <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex items-center justify-between gap-4">
                        <Button variant="ghost" onClick={() => router.push("/equipment")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Torna a Macchine
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" asChild>
                                <Link href={`/equipment/${machine.id}/maintenance`}>
                                    <Wrench className="mr-2 h-4 w-4" />
                                    Maintenance
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <CardTitle className="text-2xl">
                                        {machine.name ?? "Macchina"}
                                    </CardTitle>
                                    <CardDescription>
                                        Dettaglio macchina e documentazione collegata.
                                    </CardDescription>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {orgType === "manufacturer" ? (
                                        <Badge className="gap-1">
                                            <Factory className="h-3 w-3" />
                                            Costruttore
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="gap-1">
                                            <Building2 className="h-3 w-3" />
                                            Cliente finale
                                        </Badge>
                                    )}

                                    {machine.lifecycle_state && (
                                        <Badge variant="secondary">{machine.lifecycle_state}</Badge>
                                    )}

                                    {machine.is_archived && (
                                        <Badge variant="destructive">Archiviata</Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-xl border border-border p-4">
                                <div className="mb-1 text-xs text-muted-foreground">Codice interno</div>
                                <div className="font-medium">{machine.internal_code || "—"}</div>
                            </div>

                            <div className="rounded-xl border border-border p-4">
                                <div className="mb-1 text-xs text-muted-foreground">Matricola</div>
                                <div className="font-medium">{machine.serial_number || "—"}</div>
                            </div>

                            <div className="rounded-xl border border-border p-4">
                                <div className="mb-1 text-xs text-muted-foreground">Modello</div>
                                <div className="font-medium">{machine.model || "—"}</div>
                            </div>

                            <div className="rounded-xl border border-border p-4">
                                <div className="mb-1 text-xs text-muted-foreground">Marca</div>
                                <div className="font-medium">{machine.brand || "—"}</div>
                            </div>

                            <div className="rounded-xl border border-border p-4">
                                <div className="mb-1 text-xs text-muted-foreground">Stabilimento</div>
                                <div className="font-medium">{plant?.name || plant?.code || "—"}</div>
                            </div>

                            <div className="rounded-xl border border-border p-4">
                                <div className="mb-1 text-xs text-muted-foreground">Linea</div>
                                <div className="font-medium">{line?.name || line?.code || "—"}</div>
                            </div>

                            <div className="rounded-xl border border-border p-4 md:col-span-2 xl:col-span-3">
                                <div className="mb-1 text-xs text-muted-foreground">Note</div>
                                <div className="whitespace-pre-wrap font-medium">
                                    {machine.notes || "—"}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="h-4 w-4" />
                                Documentazione
                            </CardTitle>
                            <CardDescription>
                                Gestione documenti collegati alla macchina nel contesto attivo.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <DocumentManager
                                machineId={machine.id}
                                machineOwnerOrgId={machine.organization_id}
                                currentOrgId={orgId}
                                currentOrgType={orgType}
                                currentUserRole={userRole}
                            />
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}