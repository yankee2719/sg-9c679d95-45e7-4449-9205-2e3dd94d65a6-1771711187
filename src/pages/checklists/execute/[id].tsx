import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { supabase } from "@/integrations/supabase/client";

type ChecklistItem = {
    id: string;
    title: string;
    description: string | null;
    item_order: number | null;
    is_required: boolean | null;
    expected_value: string | null;
    measurement_unit: string | null;
    min_value: number | null;
    max_value: number | null;
};

type ChecklistRow = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    checklist_type: string | null;
    machines?: { name: string | null; internal_code: string | null; plants?: { name: string | null } | null } | null;
};

type ResultDraft = { checked: boolean; value: string; notes: string; photo_url: string };

function inferItemKind(item: ChecklistItem): "checkbox" | "number" | "text" {
    if (item.min_value != null || item.max_value != null || item.measurement_unit) return "number";
    if (item.expected_value) return "text";
    return "checkbox";
}

export default function ExecuteChecklistPage() {
    const router = useRouter();
    const { id, work_order_id } = router.query;
    const { toast } = useToast();
    const { user, membership } = useAuth();
    const { canExecuteChecklist, isManufacturer, plantLabel } = useOrgType();
    const userRole = membership?.role ?? "viewer";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checklist, setChecklist] = useState < ChecklistRow | null > (null);
    const [items, setItems] = useState < ChecklistItem[] > ([]);
    const [notes, setNotes] = useState("");
    const [draft, setDraft] = useState < Record < string, ResultDraft>> ({});

    useEffect(() => {
        if (isManufacturer) {
            toast({ title: "Esecuzione non disponibile", description: "I costruttori non eseguono checklist." });
            router.replace("/checklists");
            return;
        }
    }, [isManufacturer, router, toast]);

    useEffect(() => {
        if (!id || typeof id !== "string") return;
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const [{ data: checklistData, error: checklistError }, { data: itemData, error: itemError }] = await Promise.all([
                    supabase
                        .from("checklists")
                        .select("id, organization_id, machine_id, title, description, checklist_type, machines(name, internal_code, plants(name))")
                        .eq("id", id)
                        .maybeSingle(),
                    supabase
                        .from("checklist_items")
                        .select("id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value")
                        .eq("checklist_id", id)
                        .order("item_order", { ascending: true }),
                ]);
                if (checklistError) throw checklistError;
                if (itemError) throw itemError;
                if (!active) return;
                const nextItems = (itemData as any) ?? [];
                setChecklist((checklistData as any) ?? null);
                setItems(nextItems);
                setDraft(
                    Object.fromEntries(
                        nextItems.map((item: ChecklistItem) => [
                            item.id,
                            { checked: false, value: "", notes: "", photo_url: "" },
                        ])
                    )
                );
            } catch (error: any) {
                toast({ variant: "destructive", title: "Errore caricamento", description: error?.message ?? "Impossibile aprire la checklist." });
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [id, toast]);

    const completedCount = useMemo(() => {
        return items.filter((item) => {
            const state = draft[item.id];
            if (!state) return false;
            const kind = inferItemKind(item);
            if (kind === "checkbox") return state.checked;
            return Boolean(state.value.trim());
        }).length;
    }, [draft, items]);

    const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

    const buildOverallStatus = () => {
        let failed = false;
        let missingRequired = false;
        for (const item of items) {
            const state = draft[item.id];
            const kind = inferItemKind(item);
            const hasValue = kind === "checkbox" ? state?.checked : Boolean(state?.value?.trim());
            if (item.is_required && !hasValue) missingRequired = true;
            if (kind === "number" && state?.value) {
                const num = Number(state.value);
                if (!Number.isNaN(num)) {
                    if ((item.min_value != null && num < item.min_value) || (item.max_value != null && num > item.max_value)) {
                        failed = true;
                    }
                }
            }
        }
        if (failed) return "failed";
        if (missingRequired) return "partial";
        return "passed";
    };

    const handleSave = async (complete: boolean) => {
        if (!user || !checklist) return;
        setSaving(true);
        try {
            const results = items.map((item) => {
                const state = draft[item.id] || { checked: false, value: "", notes: "", photo_url: "" };
                return {
                    item_id: item.id,
                    checked: inferItemKind(item) === "checkbox" ? state.checked : Boolean(state.value),
                    value: state.value || null,
                    notes: state.notes || null,
                    photo_url: state.photo_url || null,
                };
            });

            const payload = {
                checklist_id: checklist.id,
                machine_id: checklist.machine_id,
                work_order_id: typeof work_order_id === "string" && work_order_id ? work_order_id : null,
                executed_by: user.id,
                completed_at: complete ? new Date().toISOString() : null,
                overall_status: complete ? buildOverallStatus() : "pending",
                notes: notes.trim() || null,
                results,
            };

            const { data, error } = await supabase.from("checklist_executions").insert(payload).select("id").maybeSingle();
            if (error) throw error;

            if (complete && typeof work_order_id === "string" && work_order_id) {
                await supabase
                    .from("work_orders")
                    .update({ status: "pending_review", updated_at: new Date().toISOString() })
                    .eq("id", work_order_id);
            }

            toast({ title: complete ? "Checklist completata" : "Bozza salvata", description: complete ? `Esito: ${buildOverallStatus()}` : "Esecuzione registrata come bozza." });
            router.push(typeof work_order_id === "string" && work_order_id ? `/work-orders/${work_order_id}` : `/checklists/${checklist.id}`);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Errore salvataggio", description: error?.message ?? "Impossibile salvare l'esecuzione." });
        } finally {
            setSaving(false);
        }
    };

    if (isManufacturer || !canExecuteChecklist) {
        return null;
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${checklist?.title ?? "Esecuzione checklist"} - MACHINA`} />
                <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <Button asChild variant="ghost" className="mb-3 -ml-3">
                                <Link href={typeof work_order_id === "string" && work_order_id ? `/work-orders/${work_order_id}` : "/checklists"}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Indietro
                                </Link>
                            </Button>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{checklist?.title ?? "Esecuzione checklist"}</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {plantLabel}: {checklist?.machines?.plants?.name ?? "—"} · Macchina: {checklist?.machines?.name ?? checklist?.machines?.internal_code ?? "—"}
                            </p>
                        </div>
                        <div className="min-w-[220px] rounded-2xl border border-border bg-card p-4">
                            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                                <span>Progressione</span>
                                <span>{completedCount}/{items.length}</span>
                            </div>
                            <Progress value={progress} />
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-sm text-muted-foreground">Caricamento checklist...</div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {items.map((item, index) => {
                                    const kind = inferItemKind(item);
                                    const state = draft[item.id] || { checked: false, value: "", notes: "", photo_url: "" };
                                    const numericValue = kind === "number" && state.value ? Number(state.value) : null;
                                    const outOfRange = kind === "number" && numericValue != null && !Number.isNaN(numericValue) && ((item.min_value != null && numericValue < item.min_value) || (item.max_value != null && numericValue > item.max_value));
                                    return (
                                        <Card key={item.id} className="rounded-3xl">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <CardTitle className="text-lg leading-tight">{index + 1}. {item.title}</CardTitle>
                                                    <Badge variant={item.is_required ? "default" : "outline"}>{item.is_required ? "Obbligatorio" : "Opzionale"}</Badge>
                                                </div>
                                                {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {kind === "checkbox" ? (
                                                    <button type="button" onClick={() => setDraft((prev) => ({ ...prev, [item.id]: { ...state, checked: !state.checked } }))} className={`flex min-h-11 w-full items-center justify-center rounded-2xl border px-4 py-3 text-base font-medium transition ${state.checked ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300" : "border-border bg-background text-foreground"}`}>
                                                        {state.checked ? <><CheckCircle2 className="mr-2 h-5 w-5" /> Verificato</> : "Segna come verificato"}
                                                    </button>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <Label>Valore {item.measurement_unit ? `(${item.measurement_unit})` : ""}</Label>
                                                        <Input value={state.value} type={kind === "number" ? "number" : "text"} onChange={(e) => setDraft((prev) => ({ ...prev, [item.id]: { ...state, value: e.target.value } }))} className={outOfRange ? "border-red-500 focus-visible:ring-red-500" : ""} />
                                                        {(item.min_value != null || item.max_value != null) && <div className="text-xs text-muted-foreground">Range atteso: {item.min_value ?? "—"} / {item.max_value ?? "—"}</div>}
                                                        {outOfRange && <div className="text-xs font-medium text-red-500">Valore fuori range</div>}
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <Label>Note item</Label>
                                                    <Textarea rows={3} value={state.notes} onChange={(e) => setDraft((prev) => ({ ...prev, [item.id]: { ...state, notes: e.target.value } }))} />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Foto / URL allegato opzionale</Label>
                                                    <Input placeholder="https://..." value={state.photo_url} onChange={(e) => setDraft((prev) => ({ ...prev, [item.id]: { ...state, photo_url: e.target.value } }))} />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            <Card>
                                <CardHeader><CardTitle>Note finali</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sintesi intervento, anomalie, follow-up..." />
                                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                        <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => handleSave(false)}>Salva bozza</Button>
                                        <Button type="button" className="min-h-11" disabled={saving} onClick={() => handleSave(true)}>Completa checklist</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

