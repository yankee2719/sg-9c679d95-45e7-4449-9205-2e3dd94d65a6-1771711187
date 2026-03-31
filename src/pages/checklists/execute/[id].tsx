import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, CheckCircle2, Loader2, Save } from "lucide-react";

type ChecklistRow = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    checklist_type: string | null;
    is_template: boolean | null;
    is_active: boolean | null;
};

type ChecklistItemRow = {
    id: string;
    checklist_id: string;
    title: string;
    description: string | null;
    item_order: number | null;
    is_required: boolean | null;
    expected_value: string | null;
    measurement_unit: string | null;
    min_value: number | null;
    max_value: number | null;
};

type MachineLite = { id: string; name: string | null; internal_code: string | null; plant_id: string | null; area: string | null };
type WorkOrderLite = { id: string; title: string; status: string | null; machine_id: string | null };

type ResultDraft = {
    item_id: string;
    checked: boolean;
    value: string;
    notes: string;
    photo_url: string | null;
    uploading: boolean;
};

function buildInitialResults(items: ChecklistItemRow[]): ResultDraft[] {
    return items.map((item) => ({
        item_id: item.id,
        checked: false,
        value: "",
        notes: "",
        photo_url: null,
        uploading: false,
    }));
}

function isNumericItem(item: ChecklistItemRow) {
    return item.measurement_unit !== null || item.min_value !== null || item.max_value !== null;
}

function isTextValueItem(item: ChecklistItemRow) {
    return !isNumericItem(item) && !!item.expected_value;
}

function computeOverallStatus(items: ChecklistItemRow[], results: ResultDraft[]) {
    let hasFailure = false;
    let hasMissingRequired = false;

    for (const item of items) {
        const result = results.find((entry) => entry.item_id === item.id);
        if (!result) continue;

        const required = item.is_required !== false;
        const hasValue = result.checked || result.value.trim() || result.notes.trim() || result.photo_url;
        if (required && !hasValue) {
            hasMissingRequired = true;
            continue;
        }

        if (isNumericItem(item) && result.value.trim()) {
            const numeric = Number(result.value);
            if (!Number.isNaN(numeric)) {
                if (item.min_value !== null && numeric < Number(item.min_value)) hasFailure = true;
                if (item.max_value !== null && numeric > Number(item.max_value)) hasFailure = true;
            }
        }

        if (!isNumericItem(item) && !isTextValueItem(item) && required && !result.checked) {
            hasFailure = true;
        }
    }

    if (hasFailure) return "failed";
    if (hasMissingRequired) return "partial";
    return "passed";
}

function progressPercent(items: ChecklistItemRow[], results: ResultDraft[]) {
    if (items.length === 0) return 0;
    const completed = items.filter((item) => {
        const result = results.find((entry) => entry.item_id === item.id);
        if (!result) return false;
        return Boolean(result.checked || result.value.trim() || result.notes.trim() || result.photo_url);
    }).length;
    return Math.round((completed / items.length) * 100);
}

export default function ExecuteChecklistPage() {
    const router = useRouter();
    const checklistId = typeof router.query.id === "string" ? router.query.id : "";
    const workOrderId = typeof router.query.work_order_id === "string" ? router.query.work_order_id : null;

    const { user, organization, membership, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { isManufacturer, canExecuteChecklist } = useOrgType();

    const [loading, setLoading] = useState(true);
    const [savingDraft, setSavingDraft] = useState(false);
    const [savingComplete, setSavingComplete] = useState(false);
    const [checklist, setChecklist] = useState < ChecklistRow | null > (null);
    const [items, setItems] = useState < ChecklistItemRow[] > ([]);
    const [results, setResults] = useState < ResultDraft[] > ([]);
    const [machine, setMachine] = useState < MachineLite | null > (null);
    const [workOrder, setWorkOrder] = useState < WorkOrderLite | null > (null);
    const [headerNotes, setHeaderNotes] = useState("");

    const userRole = membership?.role ?? "viewer";

    useEffect(() => {
        if (isManufacturer) {
            toast({ title: "Azione non disponibile", description: "I costruttori non eseguono checklist. Possono solo consultare i risultati.", variant: "destructive" });
            router.replace("/checklists");
        }
    }, [isManufacturer, router, toast]);

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id || !checklistId) {
            setLoading(false);
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

                const { data: itemRows, error: itemError } = await supabase
                    .from("checklist_items")
                    .select("id, checklist_id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value")
                    .eq("checklist_id", checklistId)
                    .order("item_order", { ascending: true });
                if (itemError) throw itemError;

                const currentChecklist = checklistRow as ChecklistRow;
                const currentItems = (itemRows ?? []) as ChecklistItemRow[];

                let machineRow: MachineLite | null = null;
                if (currentChecklist.machine_id) {
                    const { data: machineData, error: machineError } = await supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id, area")
                        .eq("id", currentChecklist.machine_id)
                        .maybeSingle();
                    if (machineError) throw machineError;
                    machineRow = (machineData as MachineLite | null) ?? null;
                }

                let orderRow: WorkOrderLite | null = null;
                if (workOrderId) {
                    const { data: woData, error: woError } = await supabase
                        .from("work_orders")
                        .select("id, title, status, machine_id")
                        .eq("id", workOrderId)
                        .maybeSingle();
                    if (woError) throw woError;
                    orderRow = (woData as WorkOrderLite | null) ?? null;
                }

                if (!active) return;
                setChecklist(currentChecklist);
                setItems(currentItems);
                setResults(buildInitialResults(currentItems));
                setMachine(machineRow);
                setWorkOrder(orderRow);
            } catch (error: any) {
                console.error("Checklist execute load error:", error);
                if (!active) return;
                toast({ title: "Errore caricamento", description: error?.message ?? "Impossibile caricare la checklist da eseguire.", variant: "destructive" });
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, checklistId, organization?.id, toast, workOrderId]);

    const progress = useMemo(() => progressPercent(items, results), [items, results]);

    const setResultPatch = (itemId: string, patch: Partial<ResultDraft>) => {
        setResults((current) => current.map((entry) => (entry.item_id === itemId ? { ...entry, ...patch } : entry)));
    };

    const handlePhotoUpload = async (item: ChecklistItemRow, event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.id || !organization?.id) return;

        setResultPatch(item.id, { uploading: true });
        try {
            const extension = file.name.split(".").pop() || "jpg";
            const path = `${organization.id}/${checklistId}/${item.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
            const { error: uploadError } = await supabase.storage.from("checklist-photos").upload(path, file, { upsert: false });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from("checklist-photos").getPublicUrl(path);
            setResultPatch(item.id, { photo_url: data.publicUrl ?? null });
            toast({ title: "Foto caricata", description: `Foto allegata a “${item.title}”.` });
        } catch (error: any) {
            console.error("Checklist photo upload error:", error);
            toast({ title: "Upload non riuscito", description: error?.message ?? "Impossibile caricare la foto per questo punto.", variant: "destructive" });
        } finally {
            setResultPatch(item.id, { uploading: false });
            event.target.value = "";
        }
    };

    const persistExecution = async (mode: "draft" | "complete") => {
        if (!user?.id || !checklist || items.length === 0) return;

        const overallStatus = mode === "complete" ? computeOverallStatus(items, results) : "pending";

        const payloadResults = results.map((entry) => ({
            item_id: entry.item_id,
            checked: entry.checked,
            value: entry.value.trim() || null,
            notes: entry.notes.trim() || null,
            photo_url: entry.photo_url,
        }));

        const payload = {
            checklist_id: checklist.id,
            machine_id: checklist.machine_id,
            work_order_id: workOrder?.id ?? workOrderId,
            executed_by: user.id,
            executed_at: new Date().toISOString(),
            completed_at: mode === "complete" ? new Date().toISOString() : null,
            overall_status: overallStatus,
            notes: headerNotes.trim() || null,
            results: payloadResults,
        };

        if (mode === "draft") setSavingDraft(true);
        else setSavingComplete(true);

        try {
            const { error } = await supabase.from("checklist_executions").insert(payload);
            if (error) throw error;

            if (mode === "complete" && workOrder?.id) {
                await supabase
                    .from("work_orders")
                    .update({ status: "pending_review", updated_at: new Date().toISOString() })
                    .eq("id", workOrder.id)
                    .in("status", ["draft", "scheduled", "in_progress"]);
            }

            toast({
                title: mode === "draft" ? "Bozza salvata" : "Checklist completata",
                description: mode === "draft" ? "L'esecuzione è stata registrata come bozza/in sospeso." : "L'esecuzione è stata registrata correttamente.",
            });

            if (mode === "complete") {
                if (workOrder?.id) router.push(`/work-orders/${workOrder.id}`);
                else router.push(`/checklists/${checklist.id}`);
            }
        } catch (error: any) {
            console.error("Checklist execution save error:", error);
            toast({ title: "Errore salvataggio", description: error?.message ?? "Impossibile salvare l'esecuzione della checklist.", variant: "destructive" });
        } finally {
            if (mode === "draft") setSavingDraft(false);
            else setSavingComplete(false);
        }
    };

    const completedCount = results.filter((entry) => entry.checked || entry.value.trim() || entry.notes.trim() || entry.photo_url).length;

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${checklist?.title ?? "Esecuzione checklist"} - MACHINA`} />
                <div className="px-4 py-5 sm:px-5 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-5xl space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3 px-3">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Indietro
                                </Button>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{checklist?.title ?? "Esecuzione checklist"}</h1>
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                                    Compilazione mobile-first per tecnico/supervisor. Inserisci valori, note e foto punto per punto.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" className="rounded-2xl" disabled={loading || savingDraft || savingComplete || !canExecuteChecklist} onClick={() => void persistExecution("draft")}>
                                    {savingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salva bozza
                                </Button>
                                <Button className="rounded-2xl" disabled={loading || savingDraft || savingComplete || !canExecuteChecklist} onClick={() => void persistExecution("complete")}>
                                    {savingComplete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                    Completa checklist
                                </Button>
                            </div>
                        </div>

                        <Card className="rounded-2xl">
                            <CardContent className="p-5">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Avanzamento</div>
                                        <div className="mt-1 text-base font-medium text-foreground">{completedCount}/{items.length} punti compilati · {progress}%</div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {machine ? `${machine.name ?? "Macchina"}${machine.internal_code ? ` · ${machine.internal_code}` : ""}` : "Template generico"}
                                            {workOrder ? ` · WO: ${workOrder.title}` : ""}
                                        </div>
                                    </div>
                                    <div className="w-full md:max-w-xs">
                                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Note generali</CardTitle>
                                <CardDescription>Usa questo campo per annotazioni generali sull'intervento o sull'esecuzione checklist.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={headerNotes}
                                    onChange={(event) => setHeaderNotes(event.target.value)}
                                    placeholder="Es. fermo macchina, condizioni rilevate, osservazioni del tecnico..."
                                    className="min-h-[110px] rounded-2xl"
                                />
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            {loading ? (
                                <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Caricamento punti checklist...</CardContent></Card>
                            ) : items.length === 0 ? (
                                <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Nessun punto di controllo presente in questa checklist.</CardContent></Card>
                            ) : (
                                items.map((item, index) => {
                                    const result = results.find((entry) => entry.item_id === item.id)!;
                                    const numeric = isNumericItem(item);
                                    const textValue = isTextValueItem(item);
                                    const numericValue = result.value.trim() ? Number(result.value) : null;
                                    const outOfRange = numeric && numericValue !== null && !Number.isNaN(numericValue) && ((item.min_value !== null && numericValue < Number(item.min_value)) || (item.max_value !== null && numericValue > Number(item.max_value)));

                                    return (
                                        <Card key={item.id} className="rounded-2xl">
                                            <CardHeader className="pb-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <CardTitle className="text-lg">{index + 1}. {item.title}</CardTitle>
                                                        {item.description ? <CardDescription className="mt-2 whitespace-pre-wrap">{item.description}</CardDescription> : null}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline" className="rounded-full">{item.is_required === false ? "Opzionale" : "Obbligatorio"}</Badge>
                                                        {numeric ? <Badge variant="outline" className="rounded-full">Numerico</Badge> : textValue ? <Badge variant="outline" className="rounded-full">Valore atteso</Badge> : <Badge variant="outline" className="rounded-full">Conferma</Badge>}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {numeric ? (
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-foreground">Valore misurato {item.measurement_unit ? `(${item.measurement_unit})` : ""}</label>
                                                        <Input
                                                            type="number"
                                                            inputMode="decimal"
                                                            value={result.value}
                                                            onChange={(event) => setResultPatch(item.id, { value: event.target.value })}
                                                            className={`h-12 rounded-2xl text-base ${outOfRange ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                                                            placeholder={item.expected_value ?? "Inserisci valore"}
                                                        />
                                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                            {item.min_value !== null ? <span>Min {item.min_value}</span> : null}
                                                            {item.max_value !== null ? <span>Max {item.max_value}</span> : null}
                                                            {item.expected_value ? <span>Target {item.expected_value}</span> : null}
                                                        </div>
                                                        {outOfRange ? <div className="text-sm font-medium text-rose-600 dark:text-rose-300">Valore fuori range.</div> : null}
                                                    </div>
                                                ) : textValue ? (
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-foreground">Valore rilevato</label>
                                                        <Input
                                                            value={result.value}
                                                            onChange={(event) => setResultPatch(item.id, { value: event.target.value })}
                                                            className="h-12 rounded-2xl text-base"
                                                            placeholder={item.expected_value ? `Valore atteso: ${item.expected_value}` : "Inserisci valore"}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                                        <label className="flex min-h-[44px] items-center gap-3 text-base font-medium text-foreground">
                                                            <input
                                                                type="checkbox"
                                                                checked={result.checked}
                                                                onChange={(event) => setResultPatch(item.id, { checked: event.target.checked })}
                                                                className="h-5 w-5 rounded border-border"
                                                            />
                                                            Punto verificato
                                                        </label>
                                                        {item.expected_value ? <div className="mt-2 text-sm text-muted-foreground">Valore atteso: {item.expected_value}</div> : null}
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-foreground">Note punto controllo</label>
                                                    <Textarea
                                                        value={result.notes}
                                                        onChange={(event) => setResultPatch(item.id, { notes: event.target.value })}
                                                        placeholder="Note, anomalie riscontrate, azioni correttive..."
                                                        className="min-h-[110px] rounded-2xl"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="text-sm font-medium text-foreground">Foto</div>
                                                    <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-foreground hover:bg-muted/50">
                                                        {result.uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                                        {result.uploading ? "Caricamento foto..." : result.photo_url ? "Sostituisci foto" : "Aggiungi foto"}
                                                        <input type="file" accept="image/*" className="hidden" onChange={(event) => void handlePhotoUpload(item, event)} />
                                                    </label>
                                                    {result.photo_url ? (
                                                        <a href={result.photo_url} target="_blank" rel="noreferrer" className="block text-sm text-orange-600 underline-offset-4 hover:underline dark:text-orange-300">
                                                            Apri foto allegata
                                                        </a>
                                                    ) : null}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

