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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";
import { inferChecklistItemMeta, parseChecklistItemDescription } from "@/lib/checklistItemMeta";
import { normalizeRole } from "@/lib/roles";

type ChecklistRow = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    checklist_type: string | null;
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

type ResultDraft = {
    item_id: string;
    checked: boolean;
    value: string;
    notes: string;
    photo_url: string | null;
    uploading: boolean;
};

type MachineLite = { id: string; name: string | null; internal_code: string | null; area: string | null };
type WorkOrderLite = { id: string; title: string | null; status: string | null };

function initialResults(items: ChecklistItemRow[]): ResultDraft[] {
    return items.map((item) => ({ item_id: item.id, checked: false, value: "", notes: "", photo_url: null, uploading: false }));
}

function progressValue(items: ChecklistItemRow[], results: ResultDraft[]) {
    if (items.length === 0) return 0;
    const filled = items.filter((item) => {
        const result = results.find((entry) => entry.item_id === item.id);
        return Boolean(result && (result.checked || result.value.trim() || result.notes.trim() || result.photo_url));
    }).length;
    return Math.round((filled / items.length) * 100);
}

function computeOverallStatus(items: ChecklistItemRow[], results: ResultDraft[]): "pending" | "passed" | "failed" | "partial" {
    let hasFailure = false;
    let hasMissingRequired = false;

    for (const item of items) {
        const meta = inferChecklistItemMeta(item);
        const result = results.find((entry) => entry.item_id === item.id);
        if (!result) {
            if (item.is_required) hasMissingRequired = true;
            continue;
        }

        const hasValue = result.checked || result.value.trim() || result.notes.trim() || result.photo_url;
        if (item.is_required && !hasValue) {
            hasMissingRequired = true;
            continue;
        }

        if (meta.responseType === "numeric" && result.value.trim()) {
            const numeric = Number(result.value);
            if (!Number.isNaN(numeric)) {
                if (item.min_value !== null && numeric < Number(item.min_value)) hasFailure = true;
                if (item.max_value !== null && numeric > Number(item.max_value)) hasFailure = true;
            }
        }

        if (meta.responseType === "boolean" && item.is_required && !result.checked) {
            hasFailure = true;
        }
    }

    if (hasFailure) return "failed";
    if (hasMissingRequired) return "partial";
    return "passed";
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

    const userRole = normalizeRole(membership?.role ?? null);

    useEffect(() => {
        if (isManufacturer) {
            toast({ title: "Azione non disponibile", description: "I costruttori non eseguono checklist.", variant: "destructive" });
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
                const [{ data: checklistRow, error: checklistError }, { data: itemRows, error: itemError }] = await Promise.all([
                    supabase.from("checklists").select("id, organization_id, machine_id, title, description, checklist_type, is_active").eq("organization_id", organization.id).eq("id", checklistId).single(),
                    supabase.from("checklist_items").select("id, checklist_id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value").eq("checklist_id", checklistId).order("item_order", { ascending: true }),
                ]);
                if (checklistError) throw checklistError;
                if (itemError) throw itemError;

                let machineRow: MachineLite | null = null;
                const currentChecklist = checklistRow as ChecklistRow;
                if (currentChecklist.machine_id) {
                    const { data: machineData, error: machineError } = await supabase.from("machines").select("id, name, internal_code, area").eq("id", currentChecklist.machine_id).maybeSingle();
                    if (machineError) throw machineError;
                    machineRow = (machineData as MachineLite | null) ?? null;
                }

                let orderRow: WorkOrderLite | null = null;
                if (workOrderId) {
                    const { data: workOrderData, error: workOrderError } = await supabase.from("work_orders").select("id, title, status").eq("id", workOrderId).maybeSingle();
                    if (workOrderError) throw workOrderError;
                    orderRow = (workOrderData as WorkOrderLite | null) ?? null;
                }

                if (!active) return;
                const loadedItems = (itemRows ?? []) as ChecklistItemRow[];
                setChecklist(currentChecklist);
                setItems(loadedItems);
                setResults(initialResults(loadedItems));
                setMachine(machineRow);
                setWorkOrder(orderRow);
            } catch (error: any) {
                console.error("Checklist execute load error:", error);
                if (!active) return;
                toast({ title: "Errore caricamento", description: error?.message ?? "Impossibile caricare la checklist.", variant: "destructive" });
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, checklistId, organization?.id, toast, workOrderId]);

    const progress = useMemo(() => progressValue(items, results), [items, results]);

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
        if (!user?.id || !checklist) return;
        const payload = {
            checklist_id: checklist.id,
            machine_id: checklist.machine_id,
            work_order_id: workOrder?.id ?? workOrderId,
            executed_by: user.id,
            executed_at: new Date().toISOString(),
            completed_at: mode === "complete" ? new Date().toISOString() : null,
            overall_status: mode === "complete" ? computeOverallStatus(items, results) : "pending",
            notes: headerNotes.trim() || null,
            results: results.map((entry) => ({ item_id: entry.item_id, checked: entry.checked, value: entry.value.trim() || null, notes: entry.notes.trim() || null, photo_url: entry.photo_url })),
        };

        if (mode === "draft") setSavingDraft(true); else setSavingComplete(true);
        try {
            const { error } = await supabase.from("checklist_executions").insert(payload as any);
            if (error) throw error;
            toast({ title: mode === "draft" ? "Bozza salvata" : "Checklist completata", description: mode === "draft" ? "L'esecuzione è stata salvata come bozza." : "L'esecuzione è stata completata correttamente." });
            if (mode === "complete") {
                if (workOrder?.id) router.push(`/work-orders/${workOrder.id}`); else router.push(`/checklists/${checklist.id}`);
            }
        } catch (error: any) {
            console.error("Checklist execution save error:", error);
            toast({ title: "Errore salvataggio", description: error?.message ?? "Impossibile salvare l'esecuzione.", variant: "destructive" });
        } finally {
            if (mode === "draft") setSavingDraft(false); else setSavingComplete(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${checklist?.title ?? "Esecuzione checklist"} - MACHINA`} />
                <div className="px-4 py-5 sm:px-5 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-5xl space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3 px-3"><ArrowLeft className="mr-2 h-4 w-4" />Indietro</Button>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{checklist?.title ?? "Esecuzione checklist"}</h1>
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Compilazione mobile-first con campi opzionali, valori numerici e foto dove previste dal template.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" disabled={savingDraft || loading || !canExecuteChecklist} onClick={() => void persistExecution("draft")} className="rounded-2xl">
                                    {savingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salva bozza
                                </Button>
                                <Button disabled={savingComplete || loading || !canExecuteChecklist} onClick={() => void persistExecution("complete")} className="rounded-2xl">
                                    {savingComplete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Completa checklist
                                </Button>
                            </div>
                        </div>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Avanzamento</CardTitle>
                                <CardDescription>{machine?.name ? `Macchina: ${machine.name}${machine.internal_code ? ` · ${machine.internal_code}` : ""}` : "Checklist generica"}{workOrder ? ` · Ordine: ${workOrder.title ?? workOrder.id}` : ""}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Progress value={progress} className="h-3" />
                                <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{progress}% completata</span><span>{results.filter((entry) => entry.checked || entry.value.trim() || entry.notes.trim() || entry.photo_url).length}/{items.length} punti compilati</span></div>
                                <Textarea rows={3} value={headerNotes} onChange={(e) => setHeaderNotes(e.target.value)} placeholder="Note generali sull'esecuzione..." />
                            </CardContent>
                        </Card>

                        {items.map((item, index) => {
                            const meta = inferChecklistItemMeta(item);
                            const parsed = parseChecklistItemDescription(item.description);
                            const result = results.find((entry) => entry.item_id === item.id)!;
                            const outOfRange = meta.responseType === "numeric" && result.value.trim() && !Number.isNaN(Number(result.value)) && ((item.min_value !== null && Number(result.value) < Number(item.min_value)) || (item.max_value !== null && Number(result.value) > Number(item.max_value)));

                            return (
                                <Card key={item.id} className="rounded-2xl">
                                    <CardHeader>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <CardTitle className="text-lg">{index + 1}. {item.title}</CardTitle>
                                                <CardDescription className="mt-1 whitespace-pre-wrap">{parsed.cleanDescription || "Nessuna descrizione aggiuntiva."}</CardDescription>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline">{meta.responseType === "numeric" ? "Numerico" : meta.responseType === "text" ? "Testo" : "Conferma"}</Badge>
                                                {item.is_required ? <Badge>Obbligatorio</Badge> : <Badge variant="secondary">Opzionale</Badge>}
                                                {meta.allowPhoto ? <Badge variant="outline"><Camera className="mr-1 h-3 w-3" />Foto</Badge> : null}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {meta.responseType === "boolean" ? (
                                            <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                                                <Checkbox checked={result.checked} onCheckedChange={(value) => setResultPatch(item.id, { checked: Boolean(value) })} />
                                                <div className="text-sm text-foreground">Conferma esecuzione del controllo</div>
                                            </div>
                                        ) : null}

                                        {meta.responseType === "numeric" ? (
                                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                                                <div className="space-y-2">
                                                    <Label>Valore rilevato</Label>
                                                    <Input value={result.value} onChange={(e) => setResultPatch(item.id, { value: e.target.value })} placeholder={item.expected_value || "Inserisci valore"} className={outOfRange ? "border-rose-500 focus-visible:ring-rose-500" : ""} />
                                                </div>
                                                <div className="space-y-2"><Label>Unità</Label><div className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">{item.measurement_unit || "—"}</div></div>
                                                <div className="space-y-2"><Label>Min</Label><div className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">{item.min_value ?? "—"}</div></div>
                                                <div className="space-y-2"><Label>Max</Label><div className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">{item.max_value ?? "—"}</div></div>
                                            </div>
                                        ) : null}

                                        {meta.responseType === "text" ? (
                                            <div className="space-y-2">
                                                <Label>Esito / testo libero</Label>
                                                <Textarea rows={3} value={result.value} onChange={(e) => setResultPatch(item.id, { value: e.target.value })} placeholder="Scrivi esito, misura descrittiva o osservazioni sintetiche..." />
                                            </div>
                                        ) : null}

                                        <div className="space-y-2">
                                            <Label>Note punto</Label>
                                            <Textarea rows={3} value={result.notes} onChange={(e) => setResultPatch(item.id, { notes: e.target.value })} placeholder="Annotazioni aggiuntive, anomalie, azioni correttive..." />
                                        </div>

                                        {meta.allowPhoto ? (
                                            <div className="space-y-2">
                                                <Label>Foto</Label>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <Input type="file" accept="image/*" onChange={(event) => void handlePhotoUpload(item, event)} className="max-w-sm" />
                                                    {result.uploading ? <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Upload...</div> : null}
                                                    {result.photo_url ? <a href={result.photo_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Apri foto caricata</a> : null}
                                                </div>
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
