import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext, UserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, FileText, Factory, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentManager } from "@/components/documents/DocumentManager";

type OrgType = "manufacturer" | "customer";

type MachineRow = {
    id: string;
    name: string;
    internal_code: string | null;
    serial_number: string | null;
    category: string | null;
    lifecycle_state: string | null;
    plant_id: string | null;
    production_line_id: string | null;
    organization_id: string | null;
    is_archived: boolean | null;
    created_at?: string;
};

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { toast } = useToast();
    const id = router.query.id as string | undefined;

    const [loading, setLoading] = useState(true);
    const [ctx, setCtx] = useState < UserContext | null > (null);
    const [machine, setMachine] = useState < MachineRow | null > (null);

    useEffect(() => {
        if (!router.isReady) return;
        if (id === "new") {
            router.replace("/equipment/new");
            return;
        }
        if (id === "edit") {
            router.replace("/equipment");
        }
    }, [router, router.isReady, id]);

    const machineId = useMemo(() => {
        if (typeof id !== "string") return null;
        if (id === "new" || id === "edit") return null;
        return id;
    }, [id]);

    const load = async () => {
        if (!machineId) return;

        setLoading(true);
        try {
            const userCtx = await getUserContext();
            if (!userCtx) {
                router.push("/login");
                return;
            }
            setCtx(userCtx);

            const { data, error } = await supabase
                .from("machines")
                .select(
                    "id,name,internal_code,serial_number,category,lifecycle_state,plant_id,production_line_id,organization_id,is_archived,created_at"
                )
                .eq("id", machineId)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                toast({
                    title: "Non trovata",
                    description: "Macchina non trovata.",
                    variant: "destructive",
                });
                router.push("/equipment");
                return;
            }

            setMachine(data as MachineRow);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore caricamento macchina.",
                variant: "destructive",
            });
            router.push("/equipment");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!router.isReady) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady, machineId]);

    if (!router.isReady) return null;
    if (id === "new") return null;
    if (loading) return null;
    if (!machineId || !machine) return null;

    const currentOrgType = (ctx?.orgType ?? null) as OrgType | null;
    const currentOrgId = ctx?.orgId ?? null;
    const machineOwnerOrgId = machine.organization_id ?? null;
    const isMachineOwnedByActiveOrg = currentOrgId !== null && currentOrgId === machineOwnerOrgId;

    return (
        <MainLayout userRole={ctx?.role as any}>
            <SEO title={`${machine.name} - MACHINA`} />

            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Indietro
                        </Button>

                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-bold text-foreground">{machine.name}</h1>
                                <Badge variant="outline">{machine.lifecycle_state ?? "active"}</Badge>
                                {isMachineOwnedByActiveOrg ? (
                                    <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30">
                                        Della tua organizzazione
                                    </Badge>
                                ) : (
                                    <Badge className="bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/30">
                                        Visibile via assignment
                                    </Badge>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground font-mono">
                                {machine.internal_code ?? "—"}
                                {machine.serial_number ? ` • SN ${machine.serial_number}` : ""}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {currentOrgType === "manufacturer" ? (
                            <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30">
                                <Factory className="w-3.5 h-3.5 mr-1" />
                                Contesto costruttore
                            </Badge>
                        ) : (
                            <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30">
                                <Building2 className="w-3.5 h-3.5 mr-1" />
                                Contesto cliente finale
                            </Badge>
                        )}

                        <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30">
                            <Wrench className="w-3.5 h-3.5 mr-1" />
                            Macchina
                        </Badge>
                    </div>
                </div>

                <Tabs defaultValue="documents" className="w-full">
                    <TabsList>
                        <TabsTrigger value="documents">
                            <FileText className="w-4 h-4 mr-2" />
                            Documenti
                        </TabsTrigger>
                        <TabsTrigger value="details">Dettagli</TabsTrigger>
                    </TabsList>

                    <TabsContent value="documents" className="mt-4">
                        <Card className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-foreground">Document manager</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <DocumentManager
                                    currentOrganizationId={currentOrgId}
                                    currentOrgType={currentOrgType}
                                    machineId={machine.id}
                                    machineOwnerOrganizationId={machineOwnerOrgId}
                                    plantId={machine.plant_id}
                                    userRole={ctx?.role ?? "technician"}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="details" className="mt-4">
                        <Card className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-foreground">Dettagli macchina</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div>
                                    <b>Categoria:</b> {machine.category ?? "—"}
                                </div>
                                <div>
                                    <b>Stato:</b> {machine.lifecycle_state ?? "—"}
                                </div>
                                <div>
                                    <b>Owner macchina:</b>{" "}
                                    <span className="font-mono">{machineOwnerOrgId ?? "—"}</span>
                                </div>
                                <div>
                                    <b>ID macchina:</b> <span className="font-mono">{machine.id}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}
