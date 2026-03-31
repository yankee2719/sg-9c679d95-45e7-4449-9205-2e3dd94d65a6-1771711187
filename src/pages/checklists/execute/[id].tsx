import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, CheckCircle2, Save, TriangleAlert } from "lucide-react";

type ChecklistRow = { id: string; organization_id: string; machine_id: string | null; title: string; description: string | null; checklist_type: string | null; is_template: boolean | null; is_active: boolean | null; };
type ChecklistItemRow = { id: string; checklist_id: string; title: string; description: string | null; item_order: number | null; is_required: boolean | null; expected_value: string | null; measurement_unit: string | null; min_value: number | null; max_value: number | null; };
type MachineLite = { id: string; name: string | null; internal_code: string | null; plant_id: string | null; area: string | null };
type PlantLite = { id: string; name: string | null; type: string | null };
type WorkOrderLite = { id: string; title: string | null; status: string | null };
type ExecutionRow = { id: string; checklist_id: string; machine_id: string | null; work_order_id: string | null; executed_by: string; executed_at: string | null; completed_at: string | null; overall_status: string | null; notes: string | null; results: any };

type ResultDraft = {
    item_id: string;
    checked: boolean | null;
    value: string;
    notes: string;
    photo_url: string | null;
    file: File | null;
};

function formatDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function computeStatus(items: ChecklistItemRow[], results: ResultDraft[]): "pending" | "passed" | "failed" | "partial" {
    const lookup = new Map(results.map((row) => [row.item_id, row]));
    let missingRequired = false;
    let failed = false;
    for (const item of items) {
        const result = lookup.get(item.id);
        const value = result?.value?.trim() ?? "";
        const hasCheck = result?.checked !== null;
        const hasValue = value.length > 0;
        const complete = hasCheck || hasValue || Boolean(result?.notes?.trim()) || Boolean(result?.photo_url);
        if (item.is_required !== false && !complete) missingRequired = true;
        if (hasCheck && result?.checked === false) failed = true;
        if (hasValue) {
            const numeric = Number(value);
            if (!Number.isNaN(numeric)) {
                if (item.min_value != null && numeric < Number(item.min_value)) failed = true;
                if (item.max_value != null && numeric > Number(item.max_value)) failed = true;
            }
        }
    }
    if (missingRequired) return "partial";
    if (failed) return "failed";
    return items.length > 0 ? "passed" : "pending";
}

function progressOf(items: ChecklistItemRow[], results: ResultDraft[]) {
    const lookup = new Map(results.map((row) => [row.item_id, row]));
    const completed = items.filter((item) => {
        const result = lookup.get(item.id);
        return result && (result.checked !== null || Boolean(result.value.trim()) || Boolean(result.notes.trim()) || Boolean(result.photo_url));
    }).length;
    return { completed, total: items.length, percent: items.length === 0 ? 0 : Math.round((completed / items.length) * 100) };
}

export default function ExecuteChecklistPage() {
    const router = useRouter();
    const checklistId = typeof router.query.id === "string" ? router.query.id : "";
    const machineIdParam = typeof router.query.machine_id === "string" ? router.query.machine_id : null;
    const workOrderIdParam = typeof router.query.work_order_id === "string" ? router.query.work_order_id : null;

    const { user, organization, membership, loading: authLoading } = useAuth();
    const { isManufacturer, canExecuteChecklist, plantLabel } = useOrgType();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [savingDraft, setSavingDraft] = useState(false);
    const [savingComplete, setSavingComplete] = useState(false);
    const [checklist, setChecklist] = useState < ChecklistRow | null > (null);
    const [items, setItems] = useState < ChecklistItemRow[] > ([]);
    const [machine, setMachine] = useState < MachineLite | null > (null);
    const [plant, setPlant] = useState < PlantLite | null > (null);
    const [workOrder, setWorkOrder] = useState < WorkOrderLite | null > (null);
    const [existingExecution, setExistingExecution] = useState < ExecutionRow | null > (null);
    const [results, setResults] = useState < ResultDraft[] > ([]);
    const [generalNotes, setGeneralNotes] = useState("");

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id || !checklistId) {
            setLoading(false);
            return;
        }
        if (isManufacturer || !canExecuteChecklist) {
            toast({ title: "Esecuzione non disponibile", description: isManufacturer ? "I costruttori non eseguono checklist. Possono solo vedere i risultati." : "Non hai i permessi per eseguire checklist.", variant: "destructive" });
            router.replace("/checklists");
            return;
        }

        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const { data: checklistRow, error: checklistError } = await supabase
                    .from("checklists")
                    .select("id, organization_id, machine_id, title, description, checklist_type, is_template, is_active")
                    .eq("organization_id", organization.id)
                    .eq("id", checklistId)
                    .single();
                if (checklistError) throw checklistError;
                const resolvedChecklist = checklistRow as ChecklistRow;

                const [{ data: itemRows, error: itemError }, { data: executionRows, error: executionError }] = await Promise.all([
                    supabase.from("checklist_items").select("id, checklist_id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value").eq("checklist_id", checklistId).order("item_order", { ascending: true }),
                    supabase.from("checklist_executions").select("id, checklist_id, machine_id, work_order_id, executed_by, executed_at, completed_at, overall_status, notes, results").eq("checklist_id", checklistId).eq("executed_by", user?.id ?? "").order("executed_at", { ascending: false }).limit(10),
                ]);
                if (itemError) throw itemError;
                if (executionError) throw executionError;

                const resolvedMachineId = machineIdParam || resolvedChecklist.machine_id;
                let resolvedMachine: MachineLite | null = null;
                let resolvedPlant: PlantLite | null = null;
                if (resolvedMachineId) {
                    const { data: machineRow, error: machineError } = await supabase.from("machines").select("id, name, internal_code, plant_id, area").eq("id", resolvedMachineId).maybeSingle();
                    if (machineError) throw machineError;
                    resolvedMachine = (machineRow as MachineLite | null) ?? null;
                    if (resolvedMachine?.plant_id) {
                        const { data: plantRow, error: plantError } = await supabase.from("plants").select("id, name, type").eq("id", resolvedMachine.plant_id).maybeSingle();
                        if (plantError) throw plantError;
                        resolvedPlant = (plantRow as PlantLite | null) ?? null;
                    }
                }

                let resolvedWorkOrder: WorkOrderLite | null = null;
                if (workOrderIdParam) {
                    const { data: orderRow, error: orderError } = await supabase.from("work_orders").select("id, title, status").eq("id", workOrderIdParam).maybeSingle();
                    if (orderError) throw orderError;
                    resolvedWorkOrder = (orderRow as WorkOrderLite | null) ?? null;
                }

                const executionList = (executionRows ?? []) as ExecutionRow[];
                const draftExecution = executionList.find((row) => row.work_order_id === workOrderIdParam && !row.completed_at) || executionList.find((row) => !row.completed_at) || null;
                const resultSeed = ((itemRows ?? []) as ChecklistItemRow[]).map((item) => {
                    const existing = Array.isArray(draftExecution?.results) ? draftExecution?.results.find((row: any) => row?.item_id === item.id) : null;
                    return {
                        item_id: item.id,
                        checked: typeof existing?.checked === "boolean" ? existing.checked : null,
                        value: existing?.value != null ? String(existing.value) : "",
                        notes: existing?.notes != null ? String(existing.notes) : "",
                        photo_url: existing?.photo_url != null ? String(existing.photo_url) : null,
                        file: null,
                    } as ResultDraft;
                });

                if (!active) return;
                setChecklist(resolvedChecklist);
                setItems((itemRows ?? []) as ChecklistItemRow[]);
                setMachine(resolvedMachine);
                setPlant(resolvedPlant);
                setWorkOrder(resolvedWorkOrder);
                setExistingExecution(draftExecution);
                setGeneralNotes(draftExecution?.notes ?? "");
                setResults(resultSeed);
            } catch (error: any) {
                console.error("Checklist execute load error:", error);
                if (active) {
                    toast({ title: "Errore caricamento", description: error?.message ?? "Impossibile caricare la checklist da eseguire.", variant: "destructive" });
                    router.push("/checklists");
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, canExecuteChecklist, checklistId, isManufacturer, machineIdParam, organization?.id, router, toast, user?.id, workOrderIdParam]);

    const progress = useMemo(() => progressOf(items, results), [items, results]);
    const overallStatus = useMemo(() => computeStatus(items, results), [items, results]);

    const updateResult = (itemId: string, patch: Partial<ResultDraft>) => {
        setResults((current) => current.map((row) => (row.item_id === itemId ? { ...row, ...patch } : row)));
    };

    const uploadFileIfNeeded = async (item: ResultDraft) => {
        if (!item.file) return item.photo_url;
        const file = item.file;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `executions/${user?.id ?? "anonymous"}/${checklistId}/${item.item_id}/${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from("checklist-photos").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        return path;
    };

    const persistExecution = async (complete: boolean) => {
        if (!organization?.id || !user?.id || !checklist) return;
        const setter = complete ? setSavingComplete : setSavingDraft;
        setter(true);
        try {
            const enrichedResults = [] as Array<{ item_id: string; checked: boolean | null; value: string | null; notes: string | null; photo_url: string | null }>;
            for (const result of results) {
                const photo_url = await uploadFileIfNeeded(result);
                enrichedResults.push({
                    item_id: result.item_id,
                    checked: result.checked,
                    value: result.value.trim() || null,
                    notes: result.notes.trim() || null,
                    photo_url,
                });
            }

            const payload = {
                checklist_id: checklist.id,
                machine_id: machine?.id ?? checklist.machine_id ?? null,
                work_order_id: workOrderIdParam,
                executed_by: user.id,
                executed_at: existingExecution?.executed_at ?? new Date().toISOString(),
                completed_at: complete ? new Date().toISOString() : null,
                results: enrichedResults,
                overall_status: complete ? overallStatus : "pending",
                notes: generalNotes.trim() || null,
            };

            if (existingExecution?.id) {
                const { error } = await supabase.from("checklist_executions").update(payload).eq("id", existingExecution.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from("checklist_executions").insert(payload).select("id, checklist_id, machine_id, work_order_id, executed_by, executed_at, completed_at, overall_status, notes, results").single();
                if (error) throw error;
                setExistingExecution(data as ExecutionRow);
            }

            if (complete && workOrderIdParam) {
                await supabase
                    .from("work_orders")
                    .update({
                        status: overallStatus === "failed" ? "pending_review" : "completed",
                        completed_at: new Date().toISOString(),
                        notes: generalNotes.trim() || null,
                    })
                    .eq("id", workOrderIdParam);
            }

            toast({ title: complete ? "Checklist completata" : "Bozza salvata", description: complete ? "La checklist è stata completata con successo." : "La compilazione è stata salvata come bozza." });
            if (complete) {
                router.push(workOrderIdParam ? `/work-orders/${workOrderIdParam}` : `/checklists/${checklist.id}`);
            }
        } catch (error: any) {
            console.error("Checklist execution save error:", error);
            toast({ title: "Errore salvataggio", description: error?.message ?? "Impossibile salvare l'esecuzione checklist.", variant: "destructive" });
        } finally {
            setter(false);
        }
    };

    const onFileChange = (itemId: string, event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        updateResult(itemId, { file });
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={membership?.role ?? "technician"}>
                <SEO title={`${checklist?.title ?? "Esegui checklist"} - MACHINA`} />
                <div className="px-4 py-5 md:px-5 md:py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-5xl space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3 px-3">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Indietro
                                </Button>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{checklist?.title ?? "Esegui checklist"}</h1>
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{checklist?.description || "Compila punto per punto la checklist direttamente dal dispositivo in stabilimento."}</p>
                            </div>
                            {workOrder ? (
                                <Badge variant="outline" className="rounded-xl px-3 py-2 text-xs">Ordine collegato: {workOrder.title ?? workOrder.id}</Badge>
                            ) : null}
                        </div>

                        <Card className="rounded-2xl">
                            <CardContent className="space-y-4 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                    <div className="space-y-1">
                                        <div className="font-medium text-foreground">Avanzamento</div>
                                        <div className="text-muted-foreground">{progress.completed}/{progress.total} punti compilati</div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">{plantLabel}: {plant?.name ?? "—"}</Badge>
                                        <Badge variant="outline">Macchina: {machine?.name ?? "Template generico"}</Badge>
                                        <Badge variant="outline" className={overallStatus === "failed" ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300" : overallStatus === "partial" ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" : overallStatus === "passed" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border bg-muted text-muted-foreground"}>{overallStatus}</Badge>
                                    </div>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress.percent}%` }} /></div>
                            </CardContent>
                        </Card>

                        {loading ? (
                            <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Caricamento checklist...</CardContent></Card>
                        ) : (
                            <div className="space-y-4">
                                {items.map((item, index) => {
                                    const result = results.find((row) => row.item_id === item.id)!;
                                    const numericValue = Number(result.value);
                                    const outOfRange = result.value.trim() !== "" && !Number.isNaN(numericValue) && ((item.min_value != null && numericValue < Number(item.min_value)) || (item.max_value != null && numericValue > Number(item.max_value)));
                                    return (
                                        <Card key={item.id} className="rounded-2xl">
                                            <CardHeader className="pb-3">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <CardTitle className="text-lg">{index + 1}. {item.title}</CardTitle>
                                                        {item.description ? <CardDescription className="mt-1">{item.description}</CardDescription> : null}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.is_required !== false ? <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">Obbligatorio</Badge> : null}
                                                        {(item.min_value != null || item.max_value != null) ? <Badge variant="outline">Range {item.min_value ?? "—"} - {item.max_value ?? "—"} {item.measurement_unit ?? ""}</Badge> : null}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-3 rounded-2xl border border-border bg-muted/15 p-4">
                                                        <div className="text-sm font-medium text-foreground">Esito rapido</div>
                                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                            <Button type="button" variant={result.checked === true ? "default" : "outline"} className="min-h-11 rounded-xl" onClick={() => updateResult(item.id, { checked: true })}>OK</Button>
                                                            <Button type="button" variant={result.checked === false ? "destructive" : "outline"} className="min-h-11 rounded-xl" onClick={() => updateResult(item.id, { checked: false })}>KO</Button>
                                                            <Button type="button" variant={result.checked === null ? "secondary" : "outline"} className="min-h-11 rounded-xl" onClick={() => updateResult(item.id, { checked: null })}>N/A</Button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor={`value-${item.id}`}>Valore rilevato {item.measurement_unit ? `(${item.measurement_unit})` : ""}</Label>
                                                        <Input id={`value-${item.id}`} value={result.value} onChange={(event) => updateResult(item.id, { value: event.target.value })} placeholder={item.expected_value || "Inserisci valore o testo"} className={outOfRange ? "border-rose-500 focus-visible:ring-rose-500" : ""} />
                                                        {outOfRange ? <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400"><TriangleAlert className="h-4 w-4" /> Valore fuori range rispetto ai limiti previsti.</div> : null}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor={`notes-${item.id}`}>Note</Label>
                                                    <Textarea id={`notes-${item.id}`} rows={3} value={result.notes} onChange={(event) => updateResult(item.id, { notes: event.target.value })} placeholder="Annotazioni operative, anomalia rilevata, misura strumentale..." />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor={`photo-${item.id}`}>Foto</Label>
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                        <div className="relative w-full sm:w-auto">
                                                            <Input id={`photo-${item.id}`} type="file" accept="image/*" onChange={(event) => onFileChange(item.id, event)} className="min-h-11" />
                                                        </div>
                                                        {result.photo_url ? <Link href={result.photo_url} className="text-sm text-orange-600 underline">Foto già caricata</Link> : null}
                                                        {result.file ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Camera className="h-4 w-4" /> {result.file.name}</div> : null}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}

                                <Card className="rounded-2xl">
                                    <CardHeader>
                                        <CardTitle>Note finali</CardTitle>
                                        <CardDescription>Informazioni riassuntive dell'intervento o osservazioni globali.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Textarea rows={4} value={generalNotes} onChange={(event) => setGeneralNotes(event.target.value)} placeholder="Es. macchina fermata in sicurezza, vibrazione anomala lato motore, ricontrollo consigliato tra 48h..." />
                                    </CardContent>
                                </Card>

                                <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm text-muted-foreground">Bozza attuale: {existingExecution ? `iniziata il ${formatDate(existingExecution.executed_at)}` : "non ancora salvata"}</div>
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <Button type="button" variant="outline" className="min-h-11 rounded-xl" disabled={savingDraft || savingComplete} onClick={() => persistExecution(false)}>
                                            <Save className="mr-2 h-4 w-4" />
                                            {savingDraft ? "Salvataggio..." : "Salva bozza"}
                                        </Button>
                                        <Button type="button" className="min-h-11 rounded-xl" disabled={savingDraft || savingComplete} onClick={() => persistExecution(true)}>
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            {savingComplete ? "Completamento..." : "Completa checklist"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

