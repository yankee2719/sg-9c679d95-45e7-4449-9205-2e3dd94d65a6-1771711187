import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { useToast } from "@/hooks/use-toast";
import { hasMinimumRole, normalizeRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Pencil, PlayCircle, ArrowLeft, Camera, CheckCircle2, FileText } from "lucide-react";
import { inferChecklistItemMeta, parseChecklistItemDescription, responseTypeLabel } from "@/lib/checklistItemMeta";

type ChecklistRow = { id: string; title: string; description: string | null; checklist_type: string | null; machine_id: string | null; is_template: boolean | null; is_active: boolean | null; created_at: string | null; updated_at: string | null };
type MachineRow = { id: string; name: string | null; internal_code: string | null; area: string | null; plant_id: string | null };
type PlantRow = { id: string; name: string | null };
type ItemRow = { id: string; title: string; description: string | null; item_order: number | null; is_required: boolean | null; expected_value: string | null; measurement_unit: string | null; min_value: number | null; max_value: number | null };
type ExecutionRow = { id: string; work_order_id: string | null; executed_at: string | null; completed_at: string | null; overall_status: string | null; notes: string | null };

export default function ChecklistDetailPage() {
    const router = useRouter();
    const checklistId = typeof router.query.id === "string" ? router.query.id : null;
    const { organization, membership, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { plantLabel, canExecuteChecklist, isManufacturer } = useOrgType();

    const [loading, setLoading] = useState(true);
    const [checklist, setChecklist] = useState < ChecklistRow | null > (null);
    const [machine, setMachine] = useState < MachineRow | null > (null);
    const [plant, setPlant] = useState < PlantRow | null > (null);
    const [items, setItems] = useState < ItemRow[] > ([]);
    const [executions, setExecutions] = useState < ExecutionRow[] > ([]);

    const userRole = normalizeRole(membership?.role ?? null);
    const canManage = hasMinimumRole(userRole, "supervisor");

    useEffect(() => {
        if (authLoading || !organization?.id || !checklistId) return;
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const { data: checklistRow, error: checklistError } = await supabase
                    .from("checklists")
                    .select("id, title, description, checklist_type, machine_id, is_template, is_active, created_at, updated_at")
                    .eq("id", checklistId)
                    .eq("organization_id", organization.id)
                    .single();
                if (checklistError) throw checklistError;
                const c = checklistRow as ChecklistRow;

                const { data: itemRows, error: itemError } = await supabase
                    .from("checklist_items")
                    .select("id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value")
                    .eq("checklist_id", checklistId)
                    .order("item_order", { ascending: true });
                if (itemError) throw itemError;

                const { data: executionRows, error: executionError } = await supabase
                    .from("checklist_executions")
                    .select("id, work_order_id, executed_at, completed_at, overall_status, notes")
                    .eq("checklist_id", checklistId)
                    .order("executed_at", { ascending: false })
                    .limit(12);
                if (executionError) throw executionError;

                let machineRow: MachineRow | null = null;
                let plantRow: PlantRow | null = null;
                if (c.machine_id) {
                    const { data: mRow, error: machineError } = await supabase.from("machines").select("id, name, internal_code, area, plant_id").eq("id", c.machine_id).maybeSingle();
                    if (machineError) throw machineError;
                    machineRow = (mRow as MachineRow | null) ?? null;
                    if (machineRow?.plant_id) {
                        const { data: pRow, error: plantError } = await supabase.from("plants").select("id, name").eq("id", machineRow.plant_id).maybeSingle();
                        if (plantError) throw plantError;
                        plantRow = (pRow as PlantRow | null) ?? null;
                    }
                }

                if (!active) return;
                setChecklist(c);
                setItems((itemRows ?? []) as ItemRow[]);
                setExecutions((executionRows ?? []) as ExecutionRow[]);
                setMachine(machineRow);
                setPlant(plantRow);
            } catch (error: any) {
                console.error("Checklist detail load error:", error);
                if (active) {
                    toast({ title: "Errore caricamento", description: error?.message ?? "Impossibile caricare la checklist.", variant: "destructive" });
                    router.replace("/checklists");
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, checklistId, organization?.id, router, toast]);

    const executionStats = useMemo(() => ({
        total: executions.length,
        passed: executions.filter((row) => row.overall_status === "passed").length,
        failed: executions.filter((row) => row.overall_status === "failed").length,
    }), [executions]);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${checklist?.title ?? "Checklist"} - MACHINA`} />
                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-6xl space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Button variant="ghost" onClick={() => router.push("/checklists")} className="mb-2 -ml-3 px-3">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Torna alle checklist
                                </Button>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{checklist?.title ?? "Checklist"}</h1>
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{checklist?.description ?? "Template checklist con storico esecuzioni e dettaglio punti di controllo."}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {canManage ? (
                                    <Button asChild variant="outline" className="rounded-2xl">
                                        <Link href={checklistId ? `/checklists/edit/${checklistId}` : "/checklists"}><Pencil className="mr-2 h-4 w-4" />Modifica checklist</Link>
                                    </Button>
                                ) : null}
                                {canExecuteChecklist ? (
                                    <Button asChild className="rounded-2xl">
                                        <Link href={checklistId ? `/checklists/execute/${checklistId}` : "/checklists"}><PlayCircle className="mr-2 h-4 w-4" />Esegui checklist</Link>
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                            <Card className="rounded-3xl border-border/70 bg-card/90"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</p><p className="mt-2 font-medium">{checklist?.checklist_type ?? "inspection"}</p></CardContent></Card>
                            <Card className="rounded-3xl border-border/70 bg-card/90"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Contesto</p><p className="mt-2 font-medium">{machine ? `${plant?.name ?? plantLabel} → ${machine.name ?? "Macchina"}` : "Template generico"}</p></CardContent></Card>
                            <Card className="rounded-3xl border-border/70 bg-card/90"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Punti</p><p className="mt-2 font-medium">{items.length}</p></CardContent></Card>
                            <Card className="rounded-3xl border-border/70 bg-card/90"><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-muted-foreground">Esecuzioni</p><p className="mt-2 font-medium">{executionStats.total}</p></CardContent></Card>
                        </div>

                        <Card className="rounded-3xl border-border/70 bg-card/90 shadow-sm">
                            <CardHeader><CardTitle>Punti di controllo</CardTitle><CardDescription>Dettaglio dei punti della checklist e del tipo di risposta previsto.</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                {items.map((item, index) => {
                                    const parsed = parseChecklistItemDescription(item.description);
                                    const meta = inferChecklistItemMeta({ description: item.description, expected_value: item.expected_value, measurement_unit: item.measurement_unit, min_value: item.min_value, max_value: item.max_value });
                                    return (
                                        <div key={item.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                                                        <h3 className="font-medium text-foreground">{item.title}</h3>
                                                        {item.is_required !== false ? <Badge variant="secondary">Obbligatorio</Badge> : null}
                                                    </div>
                                                    {parsed.cleanDescription ? <p className="mt-2 text-sm text-muted-foreground">{parsed.cleanDescription}</p> : null}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline">{responseTypeLabel(meta.responseType)}</Badge>
                                                    {meta.allowPhoto ? <Badge variant="outline"><Camera className="mr-1 h-3.5 w-3.5" />Foto</Badge> : null}
                                                </div>
                                            </div>
                                            {meta.responseType === "numeric" ? (
                                                <div className="mt-4 grid gap-3 md:grid-cols-4">
                                                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Valore atteso</p><p className="mt-1 text-sm">{item.expected_value || "—"}</p></div>
                                                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Unità</p><p className="mt-1 text-sm">{item.measurement_unit || "—"}</p></div>
                                                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Min</p><p className="mt-1 text-sm">{item.min_value ?? "—"}</p></div>
                                                    <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Max</p><p className="mt-1 text-sm">{item.max_value ?? "—"}</p></div>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-border/70 bg-card/90 shadow-sm">
                            <CardHeader><CardTitle>Storico esecuzioni</CardTitle><CardDescription>{isManufacturer ? "Vista risultati in sola lettura." : "Ultime esecuzioni di questa checklist."}</CardDescription></CardHeader>
                            <CardContent className="space-y-3">
                                {executions.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">Nessuna esecuzione registrata.</div>
                                ) : executions.map((row) => (
                                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={row.overall_status === "failed" ? "destructive" : "secondary"}>{row.overall_status ?? "pending"}</Badge>
                                                <span className="text-sm font-medium">{row.executed_at ? new Date(row.executed_at).toLocaleString("it-IT") : "Data non disponibile"}</span>
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">{row.notes || (row.work_order_id ? `Ordine collegato: ${row.work_order_id}` : "Esecuzione standalone")}</p>
                                        </div>
                                        {row.work_order_id ? (
                                            <Button asChild variant="outline" size="sm" className="rounded-xl">
                                                <Link href={`/work-orders/${row.work_order_id}`}><FileText className="mr-2 h-4 w-4" />Apri ordine</Link>
                                            </Button>
                                        ) : null}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
