import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistFlowTexts } from "@/lib/checklistFlowText";

type WorkOrderRow = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
};

type AssignmentRow = {
    id: string;
    template_id: string;
    machine_id: string | null;
    production_line_id: string | null;
    is_active: boolean | null;
};

type TemplateRow = {
    id: string;
    name: string;
    version: number;
    is_active: boolean;
};

type TemplateItemRow = {
    id: string;
    title: string;
    description: string | null;
    input_type: string;
    is_required: boolean;
    order_index: number;
    metadata: any;
};

type ItemValue = {
    value: string | null;
    notes: string | null;
    bool?: "yes" | "no" | "na";
};

function getRandomId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ExecuteChecklistInWorkOrderPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = getChecklistFlowTexts(language).workOrderExecute;

    const workOrderId = typeof router.query.id === "string" ? router.query.id : null;

    const [role, setRole] = useState < string > ("technician");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [workOrder, setWorkOrder] = useState < WorkOrderRow | null > (null);
    const [assignments, setAssignments] = useState < (AssignmentRow & { template?: TemplateRow | null })[] > ([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState < string > ("none");
    const [templateItems, setTemplateItems] = useState < TemplateItemRow[] > ([]);
    const [values, setValues] = useState < Record < string, ItemValue>> ({});
    const [globalNotes, setGlobalNotes] = useState("");

    const selectedAssignment = useMemo(
        () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
        [assignments, selectedAssignmentId]
    );

    const load = async () => {
        if (!workOrderId) return;
        setLoading(true);

        try {
            const ctx = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }

            const activeOrgId = ctx.orgId ?? null;
            if (!activeOrgId) throw new Error(text.activeOrgMissing);

            setRole(ctx.role ?? "technician");

            const { data: workOrderData, error: workOrderError } = await supabase
                .from("work_orders")
                .select("id, organization_id, machine_id, title")
                .eq("id", workOrderId)
                .eq("organization_id", activeOrgId)
                .single();

            if (workOrderError) throw workOrderError;
            const currentWorkOrder = workOrderData as WorkOrderRow;
            if (!currentWorkOrder.machine_id) throw new Error(text.workOrderMachineMissing);

            setWorkOrder(currentWorkOrder);

            const { data: assignmentRows, error: assignmentError } = await supabase
                .from("checklist_assignments")
                .select("id, template_id, machine_id, production_line_id, is_active")
                .eq("organization_id", activeOrgId)
                .eq("machine_id", currentWorkOrder.machine_id)
                .eq("is_active", true);

            if (assignmentError) throw assignmentError;
            const assignmentList = (assignmentRows ?? []) as AssignmentRow[];

            const templateIds = Array.from(new Set(assignmentList.map((assignment) => assignment.template_id).filter(Boolean)));
            const templateMap = new Map < string, TemplateRow> ();

            if (templateIds.length > 0) {
                const { data: templateRows, error: templateError } = await supabase
                    .from("checklist_templates")
                    .select("id, name, version, is_active")
                    .in("id", templateIds);

                if (templateError) throw templateError;
                for (const row of (templateRows ?? []) as any[]) {
                    templateMap.set(row.id, row as TemplateRow);
                }
            }

            const mergedAssignments = assignmentList.map((assignment) => ({
                ...assignment,
                template: templateMap.get(assignment.template_id) ?? null,
            }));

            setAssignments(mergedAssignments);
            setSelectedAssignmentId(mergedAssignments.length > 0 ? mergedAssignments[0].id : "none");
        } catch (error: any) {
            console.error(error);
            toast({ title: text.loadError, description: error?.message ?? text.loadError, variant: "destructive" });
            router.push(workOrderId ? `/work-orders/${workOrderId}` : "/work-orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workOrderId]);

    useEffect(() => {
        const loadItems = async () => {
            if (!selectedAssignment?.template_id) {
                setTemplateItems([]);
                setValues({});
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("checklist_template_items")
                    .select("id, title, description, input_type, is_required, order_index, metadata")
                    .eq("template_id", selectedAssignment.template_id)
                    .order("order_index", { ascending: true });

                if (error) throw error;

                const rows = (data ?? []) as TemplateItemRow[];
                setTemplateItems(rows);

                const initialValues: Record<string, ItemValue> = {};
                for (const item of rows) {
                    initialValues[item.id] = item.input_type === "boolean"
                        ? { value: null, notes: null, bool: "na" }
                        : { value: null, notes: null };
                }
                setValues(initialValues);
            } catch (error: any) {
                console.error(error);
                toast({ title: text.loadChecklistError, description: error?.message ?? text.loadItemsError, variant: "destructive" });
            }
        };

        loadItems();
    }, [selectedAssignment, text.loadChecklistError, text.loadItemsError, toast]);

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

    const handleSave = async () => {
        if (!workOrder || !selectedAssignment) return;

        const validationError = validate();
        if (validationError) {
            toast({ title: text.loadError, description: validationError, variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const executedBy = userData.user?.id;
            if (!executedBy) throw new Error(text.unauthenticated);

            const executionSummary = templateItems.map((item) => {
                const value = values[item.id];
                let finalValue: string | null = value?.value ?? null;
                if (item.input_type === "boolean") {
                    finalValue = value?.bool === "yes" ? "true" : value?.bool === "no" ? "false" : null;
                }
                return {
                    template_item_id: item.id,
                    title: item.title,
                    value: finalValue,
                    notes: value?.notes ?? null,
                };
            });

            const now = new Date().toISOString();
            const executionPayload: any = {
                assignment_id: selectedAssignment.id,
                organization_id: workOrder.organization_id,
                work_order_id: workOrder.id,
                machine_id: workOrder.machine_id,
                executed_by: executedBy,
                executed_at: now,
                started_at: now,
                completed_at: now,
                template_version: selectedAssignment.template?.version ?? 1,
                status: "completed",
                overall_status: "completed",
                notes: globalNotes.trim() || null,
                results: executionSummary,
            };

            const { data: executionRow, error: executionError } = await supabase
                .from("checklist_executions")
                .insert(executionPayload)
                .select("id")
                .single();

            if (executionError) throw executionError;

            const executionId = (executionRow as any).id as string;
            const itemRows = templateItems.map((item) => {
                const value = values[item.id] ?? { value: null, notes: null };
                let finalValue: string | null = value.value;

                if (item.input_type === "boolean") {
                    finalValue = value.bool === "yes" ? "true" : value.bool === "no" ? "false" : null;
                }

                return {
                    id: getRandomId(),
                    execution_id: executionId,
                    template_item_id: item.id,
                    value: finalValue,
                    notes: value.notes?.trim() || null,
                };
            });

            if (itemRows.length > 0) {
                const { error: itemError } = await supabase.from("checklist_execution_items").insert(itemRows as any);
                if (itemError) throw itemError;
            }

            toast({ title: text.savedTitle, description: text.savedDescription });
            router.push(`/checklists/executions/${executionId}`);
        } catch (error: any) {
            console.error(error);
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

                            <div className="flex justify-end">
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
