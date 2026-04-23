import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, Save, Send } from "lucide-react";
import { inferChecklistItemMeta, parseChecklistItemDescription, type ChecklistItemResponseType } from "@/lib/checklistItemMeta";
import { normalizeRole } from "@/lib/roles";

type ChecklistRow = { id: string; title: string; description: string | null; machine_id: string | null; checklist_type: string | null };
type ItemRow = { id: string; title: string; description: string | null; item_order: number | null; is_required: boolean | null; expected_value: string | null; measurement_unit: string | null; min_value: number | null; max_value: number | null };
type MachineRow = { id: string; name: string | null; internal_code: string | null; plant_id: string | null };
type PlantRow = { id: string; name: string | null };

type ResultDraft = { checked: boolean; value: string; notes: string; photo_url: string | null };

function computeStatus(items: ItemRow[], results: Record<string, ResultDraft>) {
    let hasFailure = false;
    let missingRequired = false;
    for (const item of items) {
        const meta = inferChecklistItemMeta({ description: item.description, expected_value: item.expected_value, measurement_unit: item.measurement_unit, min_value: item.min_value, max_value: item.max_value });
        const result = results[item.id] ?? { checked: false, value: "", notes: "", photo_url: null };
        const required = item.is_required !== false;
        const hasValue = meta.responseType === "boolean" ? result.checked : result.value.trim().length > 0;
        if (required && !hasValue) missingRequired = true;
        if (meta.responseType === "numeric" && result.value.trim()) {
            const num = Number(result.value);
            if (!Number.isNaN(num)) {
                if (item.min_value !== null && item.min_value !== undefined && num < Number(item.min_value)) hasFailure = true;
                if (item.max_value !== null && item.max_value !== undefined && num > Number(item.max_value)) hasFailure = true;
            }
        }
    }
    if (missingRequired) return "partial";
    if (hasFailure) return "failed";
    return "passed";
}

export default function ExecuteChecklistPage() {
    const router = useRouter();
    const checklistId = typeof router.query.id === "string" ? router.query.id : null;
    const workOrderId = typeof router.query.work_order_id === "string" ? router.query.work_order_id : null;
    const { user, organization, membership, loading: authLoading } = useAuth();
    const { canExecuteChecklist, isManufacturer, plantLabel } = useOrgType();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checklist, setChecklist] = useState < ChecklistRow | null > (null);
    const [machine, setMachine] = useState < MachineRow | null > (null);
    const [plant, setPlant] = useState < PlantRow | null > (null);
    const [items, setItems] = useState < ItemRow[] > ([]);
    const [results, setResults] = useState < Record < string, ResultDraft>> ({});
    const [executionNotes, setExecutionNotes] = useState("");

    const userRole = normalizeRole(membership?.role ?? null);

    useEffect(() => {
        if (isManufacturer) {
            toast({ title: "Azione non disponibile", description: "I costruttori non eseguono checklist.", variant: "destructive" });
            router.replace("/checklists");
        }
    }, [isManufacturer, router, toast]);

    useEffect(() => {
        if (authLoading || !organization?.id || !checklistId || !canExecuteChecklist) return;
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const { data: checklistRow, error: checklistError } = await supabase
                    .from("checklists")
                    .select("id, title, description, machine_id, checklist_type")
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

                let machineRow: MachineRow | null = null;
                let plantRow: PlantRow | null = null;
                if (c.machine_id) {
                    const { data: mRow, error: machineError } = await supabase.from("machines").select("id, name, internal_code, plant_id").eq("id", c.machine_id).maybeSingle();
                    if (machineError) throw machineError;
                    machineRow = (mRow as MachineRow | null) ?? null;
                    if (machineRow?.plant_id) {
                        const { data: pRow, error: plantError } = await supabase.from("plants").select("id, name").eq("id", machineRow.plant_id).maybeSingle();
                        if (plantError) throw plantError;
                        plantRow = (pRow as PlantRow | null) ?? null;
                    }
                }

                if (!active) return;
                const itemList = (itemRows ?? []) as ItemRow[];
                setChecklist(c);
                setItems(itemList);
                setMachine(machineRow);
                setPlant(plantRow);
                setResults(Object.fromEntries(itemList.map((item) => [item.id, { checked: false, value: "", notes: "", photo_url: null }])));
            } catch (error: any) {
                console.error("Checklist execution load error:", error);
                if (active) {
                    toast({ title: "Errore caricamento", description: error?.message ?? "Impossibile avviare la checklist.", variant: "destructive" });
                    router.replace("/checklists");
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, canExecuteChecklist, checklistId, organization?.id, router, toast]);

    const completedCount = useMemo(() => {
        return items.filter((item) => {
            const result = results[item.id];
            if (!result) return false;
            const meta = inferChecklistItemMeta({ description: item.description, expected_value: item.expected_value, measurement_unit: item.measurement_unit, min_value: item.min_value, max_value: item.max_value });
            return meta.responseType === "boolean" ? result.checked : result.value.trim().length > 0;
        }).length;
    }, [items, results]);

    const progressValue = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

    const updateResult = (itemId: string, patch: Partial<ResultDraft>) => {
        setResults((current) => ({ ...current, [itemId]: { ...(current[itemId] ?? { checked: false, value: "", notes: "", photo_url: null }), ...patch } }));
    };

    const handlePhotoUpload = async (item: ItemRow, file: File | null) => {
        if (!file || !user?.id || !checklistId) return;
        try {
            const ext = file.name.split(".").pop() || "jpg";
            const path = `${organization?.id}/${checklistId}/${item.id}-${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from("checklist-photos").upload(path, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from("checklist-photos").getPublicUrl(path);
            updateResult(item.id, { photo_url: data.publicUrl });
            toast({ title: "Foto caricata", description: "La foto è stata associata al punto di controllo." });
        } catch (error: any) {
            console.error("Checklist photo upload error:", error);
            toast({ title: "Errore upload foto", description: error?.message ?? "Impossibile caricare la foto.", variant: "destructive" });
        }
    };

    const saveExecution = async (complete: boolean) => {
        if (!user?.id || !checklistId) return;
        const overallStatus = computeStatus(items, results);
        if (complete && overallStatus === "partial") {
            toast({ title: "Checklist incompleta", description: "Compila tutti i punti obbligatori prima di completare.", variant: "destructive" });
            return;
        }

        const payload = items.map((item) => {
            const result = results[item.id] ?? { checked: false, value: "", notes: "", photo_url: null };
            return {
                item_id: item.id,
                checked: result.checked,
                value: result.value || null,
                notes: result.notes || null,
                photo_url: result.photo_url || null,
            };
        });

        setSaving(true);
        try {
            const { error } = await supabase.from("checklist_executions").insert({
                checklist_id: checklistId,
                machine_id: checklist?.machine_id ?? null,
                work_order_id: workOrderId ?? null,
                executed_by: user.id,
                completed_at: complete ? new Date().toISOString() : null,
                results: payload,
                overall_status: complete ? overallStatus : "pending",
                notes: executionNotes.trim() || null,
            } as any);
            if (error) throw error;

            if (complete && workOrderId) {
                await supabase
                    .from("work_orders")
                    .update({ status: overallStatus === "failed" ? "pending_review" : "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                    .eq("id", workOrderId)
                    .eq("organization_id", organization?.id ?? "");
            }

            toast({ title: complete ? "Checklist completata" : "Bozza salvata", description: complete ? "L'esecuzione è stata registrata." : "La compilazione è stata salvata come esecuzione in bozza." });
            router.push(workOrderId ? `/work-orders/${workOrderId}` : `/checklists/${checklistId}`);
        } catch (error: any) {
            console.error("Checklist execution save error:", error);
            toast({ title: "Errore salvataggio", description: error?.message ?? "Impossibile salvare l'esecuzione.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${checklist?.title ?? "Esecuzione checklist"} - MACHINA`} />
                <div className="px-4 py-5 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-4xl space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Button variant="ghost" onClick={() => router.push(checklistId ? `/checklists/${checklistId}` : "/checklists")} className="mb-2 -ml-3 px-3">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Torna alla checklist
                                </Button>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{checklist?.title ?? "Esecuzione checklist"}</h1>
                                <p className="mt-2 text-sm text-muted-foreground">{machine ? `${plant?.name ?? plantLabel} → ${machine.name ?? "Macchina"}` : "Template generico"}</p>
                            </div>
                            <Badge variant="outline">{completedCount}/{items.length} completati</Badge>
                        </div>

                        <Card className="rounded-3xl border-border/70 bg-card/90 shadow-sm">
                            <CardHeader><CardTitle>Avanzamento</CardTitle><CardDescription>{workOrderId ? `Esecuzione collegata all'ordine ${workOrderId}` : "Esecuzione checklist standalone"}</CardDescription></CardHeader>
                            <CardContent className="space-y-3">
                                <Progress value={progressValue} />
                                <p className="text-sm text-muted-foreground">Compila i punti richiesti, aggiungi note e foto dove previsto.</p>
                            </CardContent>
                        </Card>

                        {items.map((item, index) => {
                            const parsed = parseChecklistItemDescription(item.description);
                            const meta = inferChecklistItemMeta({ description: item.description, expected_value: item.expected_value, measurement_unit: item.measurement_unit, min_value: item.min_value, max_value: item.max_value });
                            const result = results[item.id] ?? { checked: false, value: "", notes: "", photo_url: null };
                            const numericValue = meta.responseType === "numeric" && result.value.trim() ? Number(result.value) : null;
                            const outOfRange = numericValue !== null && !Number.isNaN(numericValue) && ((item.min_value !== null && item.min_value !== undefined && numericValue < Number(item.min_value)) || (item.max_value !== null && item.max_value !== undefined && numericValue > Number(item.max_value)));
                            return (
                                <Card key={item.id} className="rounded-3xl border-border/70 bg-card/90 shadow-sm">
                                    <CardHeader>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <CardTitle className="text-lg">{index + 1}. {item.title}</CardTitle>
                                            <div className="flex gap-2">
                                                <Badge variant="outline">{meta.responseType}</Badge>
                                                {item.is_required !== false ? <Badge variant="secondary">Obbligatorio</Badge> : null}
                                            </div>
                                        </div>
                                        {parsed.cleanDescription ? <CardDescription>{parsed.cleanDescription}</CardDescription> : null}
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {meta.responseType === "boolean" ? (
                                            <div className="flex items-center gap-3 rounded-2xl border border-border/70 p-4">
                                                <Checkbox checked={result.checked} onCheckedChange={(value) => updateResult(item.id, { checked: Boolean(value) })} id={`check-${item.id}`} />
                                                <Label htmlFor={`check-${item.id}`} className="text-base">Conferma esecuzione punto</Label>
                                            </div>
                                        ) : null}

                                        {meta.responseType === "numeric" ? (
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>Valore rilevato {item.measurement_unit ? `(${item.measurement_unit})` : ""}</Label>
                                                    <Input value={result.value} onChange={(e) => updateResult(item.id, { value: e.target.value })} inputMode="decimal" placeholder={item.expected_value || "Inserisci valore"} className={outOfRange ? "border-destructive focus-visible:ring-destructive" : ""} />
                                                    <p className="text-xs text-muted-foreground">Range: {item.min_value ?? "—"} / {item.max_value ?? "—"}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Note</Label>
                                                    <Textarea value={result.notes} onChange={(e) => updateResult(item.id, { notes: e.target.value })} rows={4} placeholder="Annotazioni sul rilievo, anomalia, strumento usato..." />
                                                </div>
                                            </div>
                                        ) : null}

                                        {meta.responseType === "text" ? (
                                            <div className="space-y-2">
                                                <Label>Note / testo</Label>
                                                <Textarea value={result.value} onChange={(e) => updateResult(item.id, { value: e.target.value })} rows={4} placeholder="Inserisci il risultato del controllo o le note operative." />
                                            </div>
                                        ) : null}

                                        {meta.responseType === "boolean" ? (
                                            <div className="space-y-2">
                                                <Label>Note</Label>
                                                <Textarea value={result.notes} onChange={(e) => updateResult(item.id, { notes: e.target.value })} rows={3} placeholder="Eventuali note sul controllo." />
                                            </div>
                                        ) : null}

                                        {meta.allowPhoto ? (
                                            <div className="space-y-2 rounded-2xl border border-border/70 p-4">
                                                <Label className="inline-flex items-center gap-2"><Camera className="h-4 w-4" />Foto opzionale</Label>
                                                <Input type="file" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => void handlePhotoUpload(item, e.target.files?.[0] ?? null)} />
                                                {result.photo_url ? <a href={result.photo_url} className="text-sm text-primary underline" target="_blank" rel="noreferrer">Apri foto caricata</a> : <p className="text-sm text-muted-foreground">Nessuna foto caricata.</p>}
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            );
                        })}

                        <Card className="rounded-3xl border-border/70 bg-card/90 shadow-sm">
                            <CardHeader><CardTitle>Note finali</CardTitle><CardDescription>Annotazioni generali sull'esecuzione.</CardDescription></CardHeader>
                            <CardContent>
                                <Textarea value={executionNotes} onChange={(e) => setExecutionNotes(e.target.value)} rows={4} placeholder="Esito generale, anomalie riscontrate, azioni consigliate..." />
                            </CardContent>
                        </Card>

                        <div className="sticky bottom-3 flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur md:flex-row md:justify-end">
                            <Button variant="outline" className="rounded-2xl min-h-11" disabled={saving} onClick={() => void saveExecution(false)}><Save className="mr-2 h-4 w-4" />Salva bozza</Button>
                            <Button className="rounded-2xl min-h-11" disabled={saving} onClick={() => void saveExecution(true)}><Send className="mr-2 h-4 w-4" />Completa checklist</Button>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
