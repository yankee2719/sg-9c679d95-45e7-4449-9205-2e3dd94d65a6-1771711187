// src/pages/equipment/[id].tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import DocumentManager from "@/components/documents/DocumentManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, FileText, Factory, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserContext } from "@/lib/supabaseHelpers";

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

    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [orgType, setOrgType] = useState < OrgType | null > (null);

    const [machine, setMachine] = useState < MachineRow | null > (null);
    const [plant, setPlant] = useState < PlantRow | null > (null);
    const [line, setLine] = useState < LineRow | null > (null);

    useEffect(() => {
        if (!router.isReady || !id || typeof id !== "string") return;

        const load = async () => {
            setLoading(true);

            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId || !ctx?.orgType) {
                    router.replace("/settings/organization");
                    return;
                }

                setUserRole(ctx.role ?? "technician");
                setOrgId(ctx.orgId);
                setOrgType(ctx.orgType as OrgType);

                const { data: machineRow, error: machineError } = await supabase
                    .from("machines")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();

                if (machineError) throw machineError;
                if (!machineRow) {
                    toast({
                        title: "Macchina non trovata",
                        description: "La macchina richiesta non esiste oppure non è accessibile.",
                        variant: "destructive",
                    });
                    router.replace("/equipment");
                    return;
                }

                setMachine(machineRow as MachineRow);

                const machineData = machineRow as MachineRow;

                if (machineData.plant_id) {
                    const { data: plantRow } = await supabase
                        .from("plants")
                        .select("id, name, code")
                        .eq("id", machineData.plant_id)
                        .maybeSingle();

                    setPlant((plantRow as PlantRow) ?? null);
                } else {
                    setPlant(null);
                }

                if (machineData.production_line_id) {
                    const { data: lineRow } = await supabase
                        .from("production_lines")
                        .select("id, name, code")
                        .eq("id", machineData.production_line_id)
                        .maybeSingle();

                    setLine((lineRow as LineRow) ?? null);
                } else {
                    setLine(null);
                }
            } catch (error: any) {
                console.error(error);
                toast({
                    title: "Errore",
                    description: error?.message ?? "Errore caricamento dettaglio macchina.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router, router.isReady, id, toast]);

    if (loading) {
        return (
            <MainLayout userRole={userRole as any}>
                <SEO title="Macchina - MACHINA" />
                <div className="container mx-auto max-w-7xl px-4 py-8">
                    <div className="text-sm text-muted-foreground">Caricamento macchina...</div>
                </div>
            </MainLayout>
        );
    }

    if (!machine) {
        return (
            <MainLayout userRole={userRole as any}>
                <SEO title="Macchina - MACHINA" />
                <div className="container mx-auto max-w-7xl px-4 py-8">
                    <div className="text-sm text-muted-foreground">Macchina non trovata.</div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title={`${machine.name ?? "Macchina"} - MACHINA`} />

            <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
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
                                <CardTitle className="text-2xl">{machine.name ?? "Macchina"}</CardTitle>
                                <CardDescription>
                                    Dettaglio macchina e documentazione collegata.
                                </CardDescription>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {orgType === "manufacturer" ? (
                                    <Badge className="gap-1">
                                        <Factory className="w-3 h-3" />
                                        Costruttore
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="gap-1">
                                        <Building2 className="w-3 h-3" />
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
                            <div className="text-xs text-muted-foreground mb-1">Codice interno</div>
                            <div className="font-medium">{machine.internal_code || "—"}</div>
                        </div>

                        <div className="rounded-xl border border-border p-4">
                            <div className="text-xs text-muted-foreground mb-1">Matricola</div>
                            <div className="font-medium">{machine.serial_number || "—"}</div>
                        </div>

                        <div className="rounded-xl border border-border p-4">
                            <div className="text-xs text-muted-foreground mb-1">Modello</div>
                            <div className="font-medium">{machine.model || "—"}</div>
                        </div>

                        <div className="rounded-xl border border-border p-4">
                            <div className="text-xs text-muted-foreground mb-1">Marca</div>
                            <div className="font-medium">{machine.brand || "—"}</div>
                        </div>

                        <div className="rounded-xl border border-border p-4">
                            <div className="text-xs text-muted-foreground mb-1">Stabilimento</div>
                            <div className="font-medium">{plant?.name || plant?.code || "—"}</div>
                        </div>

                        <div className="rounded-xl border border-border p-4">
                            <div className="text-xs text-muted-foreground mb-1">Linea</div>
                            <div className="font-medium">{line?.name || line?.code || "—"}</div>
                        </div>

                        <div className="rounded-xl border border-border p-4 md:col-span-2 xl:col-span-3">
                            <div className="text-xs text-muted-foreground mb-1">Note</div>
                            <div className="font-medium whitespace-pre-wrap">{machine.notes || "—"}</div>
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
    );
}
