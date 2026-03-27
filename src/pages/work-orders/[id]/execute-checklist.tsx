import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, WifiOff, HardDriveDownload } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistFlowTexts } from "@/lib/checklistFlowText";
import { checklistExecutionApi } from "@/lib/checklistExecutionApi";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
    workOrderChecklistApi,
    type WorkOrderChecklistAssignmentContext,
    type WorkOrderChecklistContext,
    type WorkOrderChecklistTemplateItem,
} from "@/lib/workOrderChecklistApi";
import {
    clearWorkOrderChecklistDraft,
    loadWorkOrderChecklistDraft,
    saveWorkOrderChecklistDraft,
    type ChecklistDraftValue,
} from "@/lib/workOrderChecklistDraft";
import { enqueueOfflineSyncOperation } from "@/lib/offlineOpsQueue";

type ItemValue = ChecklistDraftValue;

function makeDefaultValues(items: WorkOrderChecklistTemplateItem[], seed?: Record<string, ItemValue>) {
    const result: Record<string, ItemValue> = {};
    for (const item of items) {
        const seeded = seed?.[item.id];
        result[item.id] = seeded
            ? seeded
            : item.input_type === "boolean"
              ? { value: null, notes: null, bool: "na" }
              : { value: null, notes: null };
    }
    return result;
}

export default function ExecuteChecklistInWorkOrderPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = getChecklistFlowTexts(language).workOrderExecute;
    const isItalian = language === "it";

    const workOrderId = typeof router.query.id === "string" ? router.query.id : null;

    const [role, setRole] = useState<string>("technician");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isOnline, setIsOnline] = useState<boolean>(typeof window === "undefined" ? true : navigator.onLine);

    const [context, setContext] = useState<WorkOrderChecklistContext | null>(null);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("none");
    const [values, setValues] = useState<Record<string, ItemValue>>({});
    const [globalNotes, setGlobalNotes] = useState("");
    const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
    const [restoredDraft, setRestoredDraft] = useState(false);

    const draftUi = {
        offlineTitle: isItalian ? "Sei offline" : "You are offline",
        offlineDescription: isItalian
            ? "Puoi continuare a compilare la checklist. La bozza resta salvata in locale, ma l'invio finale richiede connessione."
            : "You can keep filling the checklist. A local draft is saved, but final submission requires connectivity.",
        localDraftTitle: isItalian ? "Bozza locale" : "Local draft",
        localDraftDescription: isItalian
            ? "Salvataggio automatico in locale attivo per questo work order."
            : "Automatic local draft saving is active for this work order.",
        restoreToastTitle: isItalian ? "Bozza locale ripristinata" : "Local draft restored",
        restoreToastDescription: isItalian
            ? "Ho ricaricato l'ultima compilazione salvata su questo dispositivo."
            : "The last locally saved draft was restored on this device.",
        saveDraft: isItalian ? "Salva bozza locale" : "Save local draft",
        draftSaved: isItalian ? "Bozza locale salvata" : "Local draft saved",
        submitOnlineOnly: isItalian ? "Per inviare la checklist devi essere online." : "You must be online to submit the checklist.",
        queuedTitle: isItalian ? "Checklist messa in coda" : "Checklist queued",
        queuedDescription: isItalian ? "La checklist verrà sincronizzata appena torni online." : "The checklist will sync as soon as you are back online.",
    };

    const assignments = context?.assignments ?? [];
    const workOrder = context?.workOrder ?? null;

    const selectedAssignment = useMemo<WorkOrderChecklistAssignmentContext | null>(
        () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
        [assignments, selectedAssignmentId]
    );

    const templateItems = selectedAssignment?.items ?? [];

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const load = async () => {
        if (!workOrderId) return;
        setLoading(true);

        try {
            const ctx = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }

            setRole(ctx.role ?? "technician");
            const payload = await workOrderChecklistApi.getContext(workOrderId);
            setContext(payload);

            const draft = loadWorkOrderChecklistDraft(workOrderId);
            const nextAssignmentId =
                draft?.selectedAssignmentId && payload.assignments.some((item) => item.id === draft.selectedAssignmentId)
                    ? draft.selectedAssignmentId
                    : payload.assignments[0]?.id ?? "none";

            setSelectedAssignmentId(nextAssignmentId);

            const activeAssignment = payload.assignments.find((item) => item.id === nextAssignmentId) ?? null;
            const seededValues = activeAssignment ? makeDefaultValues(activeAssignment.items, draft?.values ?? {}) : {};
            setValues(seededValues);
            setGlobalNotes(draft?.globalNotes ?? "");
            setLastDraftSavedAt(draft?.updatedAt ?? null);

            if (draft && !restoredDraft) {
                setRestoredDraft(true);
                toast({
                    title: draftUi.restoreToastTitle,
                    description: draftUi.restoreToastDescription,
                });
            }
        } catch (error: any) {
            console.error(error);
            toast({ title: text.loadError, description: error?.message ?? text.loadError, variant: "destructive" });
            router.push(workOrderId ? `/work-orders/${workOrderId}` : "/work-orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workOrderId]);

    useEffect(() => {
        if (!selectedAssignment) {
            setValues({});
            return;
        }
        setValues((current) => makeDefaultValues(selectedAssignment.items, current));
    }, [selectedAssignmentId]);

    useEffect(() => {
        if (!workOrderId || loading) return;
        saveWorkOrderChecklistDraft(workOrderId, {
            selectedAssignmentId: selectedAssignmentId === "none" ? null : selectedAssignmentId,
            values,
            globalNotes,
        });
        setLastDraftSavedAt(new Date().toISOString());
    }, [globalNotes, loading, selectedAssignmentId, values, workOrderId]);

    const setItemValue = (itemId: string, patch: Partial<ItemValue>) => {
        setValues((current) => ({
            ...current,
            [itemId]: { ...(current[itemId] ?? {}), ...patch },
        }));
    };

    const validate = () => {
        for (const item of templateItems) {
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

    const persistDraftNow = () => {
        if (!workOrderId) return;
        saveWorkOrderChecklistDraft(workOrderId, {
            selectedAssignmentId: selectedAssignmentId === "none" ? null : selectedAssignmentId,
            values,
            globalNotes,
        });
        setLastDraftSavedAt(new Date().toISOString());
        toast({ title: draftUi.draftSaved });
    };

    const handleSave = async () => {
        if (!workOrder || !selectedAssignment || !workOrderId) return;
        const validationError = validate();
        if (validationError) {
            toast({ title: text.loadError, description: validationError, variant: "destructive" });
            return;
        }

        if (!isOnline) {
            enqueueOfflineSyncOperation({
                entity_type: "checklist_execution_complete",
                entity_id: `${workOrder.id}:${selectedAssignment.id}`,
                plant_id: workOrder.plant_id ?? null,
                dedupe_key: `checklist_execution_complete:${workOrder.id}:${selectedAssignment.id}`,
                payload: {
                    assignment_id: selectedAssignment.id,
                    work_order_id: workOrder.id,
                    plant_id: workOrder.plant_id ?? null,
                    items: templateItems.map((item) => {
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
                    }),
                    notes: globalNotes.trim() || null,
                },
            });
            clearWorkOrderChecklistDraft(workOrderId);
            toast({ title: draftUi.queuedTitle, description: draftUi.queuedDescription });
            router.push(`/work-orders/${workOrder.id}`);
            return;
        }

        if (validationError) {
            toast({ title: text.loadError, description: validationError, variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const itemsPayload = templateItems.map((item) => {
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

            clearWorkOrderChecklistDraft(workOrderId);
            toast({ title: text.savedTitle, description: text.savedDescription });
            router.push(`/checklists/executions/${executionId}`);
        } catch (error: any) {
            console.error(error);
            persistDraftNow();
            toast({ title: text.loadError, description: error?.message ?? text.loadError, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout userRole={role as any}>
                <div className="p-6">{text.loading}</div>
            </MainLayout>
        );
    }

    if (!workOrder) {
        return (
            <MainLayout userRole={role as any}>
                <div className="p-6">{text.notFound}</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
                <Button variant="ghost" onClick={() => router.push(`/work-orders/${workOrder.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {text.backToWorkOrder}
                </Button>

                {!isOnline ? (
                    <Card className="rounded-2xl border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                <WifiOff className="h-5 w-5" />
                                {draftUi.offlineTitle}
                            </CardTitle>
                            <CardDescription>{draftUi.offlineDescription}</CardDescription>
                        </CardHeader>
                    </Card>
                ) : null}

                <Card className="rounded-2xl border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDriveDownload className="h-5 w-5" />
                            {draftUi.localDraftTitle}
                        </CardTitle>
                        <CardDescription>
                            {draftUi.localDraftDescription}
                            {lastDraftSavedAt
                                ? ` • ${new Date(lastDraftSavedAt).toLocaleString(language === "it" ? "it-IT" : "en-GB")}`
                                : ""}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end">
                        <Button variant="outline" onClick={persistDraftNow}>
                            {draftUi.saveDraft}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{text.title}</CardTitle>
                        <CardDescription>
                            {text.descriptionPrefix}{" "}
                            <span className="font-medium text-foreground">{workOrder.title}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{text.assignedChecklist}</Label>
                            <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={text.selectChecklist} />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignments.length === 0 ? <SelectItem value="none">{text.noAssignedChecklist}</SelectItem> : null}
                                    {assignments.map((assignment) => (
                                        <SelectItem key={assignment.id} value={assignment.id}>
                                            {assignment.template?.name ?? "Template"} (v{assignment.template?.version ?? 1})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {selectedAssignmentId !== "none" ? (
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>{text.formTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {templateItems.length === 0 ? (
                                <div className="text-sm text-muted-foreground">{text.emptyTemplate}</div>
                            ) : null}

                            {templateItems.map((item) => {
                                const value = values[item.id];

                                return (
                                    <div key={item.id} className="space-y-3 rounded-xl border p-4">
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                {item.title} {item.is_required ? <span className="text-destructive">*</span> : null}
                                            </div>
                                            {item.description ? <div className="text-sm text-muted-foreground">{item.description}</div> : null}
                                        </div>

                                        {item.input_type === "boolean" ? (
                                            <Select value={value?.bool ?? "na"} onValueChange={(next) => setItemValue(item.id, { bool: next as any })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={text.selectResponse} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="na">{text.boolNa}</SelectItem>
                                                    <SelectItem value="yes">{text.boolYes}</SelectItem>
                                                    <SelectItem value="no">{text.boolNo}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : item.input_type === "number" ? (
                                            <Input
                                                type="number"
                                                value={value?.value ?? ""}
                                                onChange={(event) => setItemValue(item.id, { value: event.target.value })}
                                                placeholder={text.numberPlaceholder}
                                            />
                                        ) : item.input_type === "text" ? (
                                            <Textarea
                                                value={value?.value ?? ""}
                                                onChange={(event) => setItemValue(item.id, { value: event.target.value })}
                                                rows={2}
                                                placeholder={text.textPlaceholder}
                                            />
                                        ) : (
                                            <Input
                                                value={value?.value ?? ""}
                                                onChange={(event) => setItemValue(item.id, { value: event.target.value })}
                                                placeholder={text.genericPlaceholder}
                                            />
                                        )}

                                        <div className="space-y-2">
                                            <Label className="text-xs">{text.itemNotes}</Label>
                                            <Textarea
                                                value={value?.notes ?? ""}
                                                onChange={(event) => setItemValue(item.id, { notes: event.target.value })}
                                                rows={2}
                                                placeholder={text.itemNotesPlaceholder}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="space-y-2">
                                <Label>{text.finalNotes}</Label>
                                <Textarea
                                    value={globalNotes}
                                    onChange={(event) => setGlobalNotes(event.target.value)}
                                    rows={3}
                                    placeholder={text.finalNotesPlaceholder}
                                />
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                                <Button variant="outline" onClick={persistDraftNow}>
                                    {draftUi.saveDraft}
                                </Button>
                                <Button onClick={handleSave} disabled={saving} className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]">
                                    <Save className="mr-2 h-4 w-4" />
                                    {saving ? text.saving : text.save}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}
            </div>
        </MainLayout>
    );
}

