import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, WifiOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { getChecklistFlowTexts } from "@/lib/checklistFlowText";
import { checklistExecutionApi } from "@/lib/checklistExecutionApi";
import {
    clearWorkOrderChecklistDraft,
    loadWorkOrderChecklistDraft,
    saveWorkOrderChecklistDraft,
    type ChecklistDraftItemValue,
} from "@/lib/workOrderChecklistDraft";
import {
    getWorkOrderChecklistContext,
    type WorkOrderChecklistAssignment,
    type WorkOrderChecklistContextItem,
} from "@/lib/workOrderChecklistApi";

type ItemValue = ChecklistDraftItemValue;

function buildInitialValues(items: WorkOrderChecklistContextItem[]): Record<string, ItemValue> {
    const initial: Record<string, ItemValue> = {};
    for (const item of items) {
        initial[item.id] = item.input_type === "boolean"
            ? { value: null, notes: null, bool: "na" }
            : { value: null, notes: null };
    }
    return initial;
}

function getItemPlaceholder(
    item: WorkOrderChecklistContextItem,
    text: ReturnType<typeof getChecklistFlowTexts>["workOrderExecute"]
) {
    if (item.input_type === "number") {
        return text.numberPlaceholder || "Inserisci un valore";
    }

    if (item.input_type === "text") {
        return text.textPlaceholder || "Inserisci testo";
    }

    return text.genericPlaceholder || "Inserisci un valore";
}

export default function ExecuteChecklistInWorkOrderPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { language } = useLanguage();
    const { loading: authLoading, membership } = useAuth();
    const text = getChecklistFlowTexts(language).workOrderExecute;

    const workOrderId = typeof router.query.id === "string" ? router.query.id : null;
    const userRole = membership?.role ?? "technician";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    const [workOrder, setWorkOrder] = useState < { id: string; title: string; machine_id: string | null } | null > (null);
    const [assignments, setAssignments] = useState < WorkOrderChecklistAssignment[] > ([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState < string > ("none");
    const [values, setValues] = useState < Record < string, ItemValue>> ({});
    const [globalNotes, setGlobalNotes] = useState("");

    useEffect(() => {
        if (typeof window === "undefined") return;
        const update = () => setIsOnline(window.navigator.onLine);
        update();
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    const selectedAssignment = useMemo(
        () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
        [assignments, selectedAssignmentId]
    );

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!workOrderId || authLoading) return;
            setLoading(true);

            try {
                const data = await getWorkOrderChecklistContext(workOrderId);
                if (!active) return;

                setWorkOrder(data.workOrder);
                setAssignments(data.assignments ?? []);
                setSelectedAssignmentId(data.assignments?.[0]?.id ?? "none");
            } catch (error: any) {
                console.error(error);
                toast({ title: text.loadError, description: error?.message ?? text.loadError, variant: "destructive" });
                void router.push(workOrderId ? `/work-orders/${workOrderId}` : "/work-orders");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, router, text.loadError, toast, workOrderId]);

    useEffect(() => {
        if (!workOrderId || !selectedAssignment) {
            setValues({});
            setGlobalNotes("");
            return;
        }

        const initialValues = buildInitialValues(selectedAssignment.template_items);
        const draft = loadWorkOrderChecklistDraft(workOrderId, selectedAssignment.id);

        if (draft) {
            setValues({ ...initialValues, ...draft.values });
            setGlobalNotes(draft.globalNotes ?? "");
            return;
        }

        setValues(initialValues);
        setGlobalNotes("");
    }, [selectedAssignment, workOrderId]);

    useEffect(() => {
        if (!workOrderId || !selectedAssignment) return;
        saveWorkOrderChecklistDraft(workOrderId, selectedAssignment.id, {
            values,
            globalNotes,
        });
    }, [globalNotes, selectedAssignment, values, workOrderId]);

    const setItemValue = (itemId: string, patch: Partial<ItemValue>) => {
        setValues((current) => ({
            ...current,
            [itemId]: { ...(current[itemId] ?? {}), ...patch },
        }));
    };

    const validate = () => {
        const items = selectedAssignment?.template_items ?? [];
        for (const item of items) {
            const value = values[item.id];
            if (!item.is_required) continue;

            if (item.input_type === "boolean") {
                if ((value?.bool ?? "na") === "na") return `${text.requiredPrefix} ${item.title}`;
                continue;
            }

            const raw = (value?.value ?? "").toString().trim();
            if (!raw) return `${text.requiredPrefix} ${item.title}`;
        }
        return null;
    };

    const handleSave = async () => {
        if (!workOrder || !selectedAssignment) return;

        const validationError = validate();
        if (validationError) {
            toast({ title: text.loadError, description: validationError, variant: "destructive" });
            return;
        }

        if (!isOnline) {
            toast({
                title: text.savedTitle || "Bozza salvata",
                description:
                    "Sei offline: la bozza è stata salvata localmente, ma non ancora inviata.",
            });
            return;
        }

        setSaving(true);
        try {
            const itemsPayload = selectedAssignment.template_items.map((item) => {
                const value = values[item.id];
                let finalValue: string | null = value?.value ?? null;
                if (item.input_type === "boolean") {
                    finalValue = value?.bool === "yes" ? "true" : value?.bool === "no" ? "false" : null;
                }
                return {
                    template_item_id: item.id,
                    value: finalValue,
                    notes: value?.notes ?? null,
                };
            });

            const executionRow = await checklistExecutionApi.create({
                assignment_id: selectedAssignment.id,
                work_order_id: workOrder.id,
            });

            const executionId = executionRow.id;
            await checklistExecutionApi.complete(executionId, {
                items: itemsPayload,
                notes: globalNotes.trim() || null,
            });

            clearWorkOrderChecklistDraft(workOrder.id, selectedAssignment.id);
            toast({ title: text.savedTitle, description: text.savedDescription });
            void router.push(`/checklists/executions/${executionId}`);
        } catch (error: any) {
            console.error(error);
            toast({ title: text.loadError, description: error?.message ?? text.loadError, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">{text.loading || "Caricamento checklist..."}</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={userRole}>
            <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {text.backToWorkOrder || "Indietro"}
                </Button>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{text.title || "Esegui checklist"}</CardTitle>
                        <CardDescription>
                            {workOrder?.title || text.formTitle || "Compila la checklist collegata al work order."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!isOnline && (
                            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                                <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    Sei offline. Puoi compilare la checklist: la bozza viene salvata localmente, ma l'invio finale richiede connessione.
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>{text.assignedChecklist || "Checklist"}</Label>
                            <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={text.selectChecklist || "Seleziona checklist"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignments.length === 0 ? (
                                        <SelectItem value="none" disabled>
                                            {text.noAssignedChecklist || "Nessuna checklist attiva"}
                                        </SelectItem>
                                    ) : (
                                        assignments.map((assignment) => (
                                            <SelectItem key={assignment.id} value={assignment.id}>
                                                {assignment.template.name} · v{assignment.template.version}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedAssignment ? (
                            selectedAssignment.template_items.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                                    {text.emptyTemplate || "Il template selezionato non contiene elementi."}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {selectedAssignment.template_items.map((item) => {
                                        const value = values[item.id] ?? { value: null, notes: null };

                                        return (
                                            <Card key={item.id} className="rounded-2xl border-border/70">
                                                <CardContent className="space-y-4 p-5">
                                                    <div>
                                                        <div className="text-sm font-semibold text-foreground">
                                                            {item.title}
                                                            {item.is_required ? <span className="ml-1 text-orange-500">*</span> : null}
                                                        </div>
                                                        {item.description ? (
                                                            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                                                        ) : null}
                                                    </div>

                                                    {item.input_type === "boolean" ? (
                                                        <Select
                                                            value={value.bool ?? "na"}
                                                            onValueChange={(next) => setItemValue(item.id, { bool: next as ItemValue["bool"] })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={text.selectResponse || "Seleziona esito"} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="yes">{text.boolYes || "Sì"}</SelectItem>
                                                                <SelectItem value="no">{text.boolNo || "No"}</SelectItem>
                                                                <SelectItem value="na">{text.boolNa || "N/A"}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Input
                                                            value={value.value ?? ""}
                                                            onChange={(e) => setItemValue(item.id, { value: e.target.value })}
                                                            placeholder={getItemPlaceholder(item, text)}
                                                        />
                                                    )}

                                                    <Textarea
                                                        value={value.notes ?? ""}
                                                        onChange={(e) => setItemValue(item.id, { notes: e.target.value })}
                                                        rows={2}
                                                        placeholder={text.itemNotesPlaceholder || "Note opzionali"}
                                                    />
                                                </CardContent>
                                            </Card>
                                        );
                                    })}

                                    <div className="space-y-2">
                                        <Label>{text.finalNotes || "Note finali"}</Label>
                                        <Textarea
                                            value={globalNotes}
                                            onChange={(e) => setGlobalNotes(e.target.value)}
                                            rows={4}
                                            placeholder={text.finalNotesPlaceholder || "Note finali intervento"}
                                        />
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                                {text.noAssignedChecklist || "Nessuna checklist attiva disponibile per questa macchina."}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={saving || !selectedAssignment}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? text.saving || "Salvataggio..." : text.save || "Completa checklist"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
