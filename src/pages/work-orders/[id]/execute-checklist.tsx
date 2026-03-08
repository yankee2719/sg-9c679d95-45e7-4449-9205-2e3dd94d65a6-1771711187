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

export default function ExecuteChecklistInWorkOrderPage() {
    const router = useRouter();
    const { toast } = useToast();

    const workOrderId = typeof router.query.id === "string" ? router.query.id : null;

    const [role, setRole] = useState < string > ("technician");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [wo, setWo] = useState < WorkOrderRow | null > (null);
    const [assignments, setAssignments] = useState < (AssignmentRow & { template?: TemplateRow | null })[] > ([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState < string > ("none");
    const [templateItems, setTemplateItems] = useState < TemplateItemRow[] > ([]);
    const [values, setValues] = useState < Record < string, ItemValue>> ({});
    const [globalNotes, setGlobalNotes] = useState("");

    const selectedAssignment = useMemo(
        () => assignments.find((a) => a.id === selectedAssignmentId) ?? null,
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
            if (!activeOrgId) throw new Error("Organizzazione attiva non trovata nel contesto utente.");

            setRole(ctx.role ?? "technician");

            const { data: woData, error: woErr } = await supabase
                .from("work_orders")
                .select("id, organization_id, machine_id, title")
                .eq("id", workOrderId)
                .eq("organization_id", activeOrgId)
                .single();

            if (woErr) throw woErr;
            const woRow = woData as WorkOrderRow;
            if (!woRow.machine_id) throw new Error("Il work order non ha una macchina associata.");

            setWo(woRow);

            const { data: asgRows, error: asgErr } = await supabase
                .from("checklist_assignments")
                .select("id, template_id, machine_id, production_line_id, is_active")
                .eq("organization_id", activeOrgId)
                .eq("machine_id", woRow.machine_id)
                .eq("is_active", true);

            if (asgErr) throw asgErr;
            const assignmentList = (asgRows ?? []) as AssignmentRow[];

            const templateIds = Array.from(new Set(assignmentList.map((a) => a.template_id).filter(Boolean)));
            const templateMap = new Map < string, TemplateRow> ();

            if (templateIds.length > 0) {
                const { data: tplRows, error: tplErr } = await supabase
                    .from("checklist_templates")
                    .select("id, name, version, is_active")
                    .in("id", templateIds);

                if (tplErr) throw tplErr;
                for (const row of (tplRows ?? []) as any[]) {
                    templateMap.set(row.id, row as TemplateRow);
                }
            }

            const merged = assignmentList.map((assignment) => ({
                ...assignment,
                template: templateMap.get(assignment.template_id) ?? null,
            }));

            setAssignments(merged);
            setSelectedAssignmentId(merged.length > 0 ? merged[0].id : "none");
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore caricamento checklist", variant: "destructive" });
            router.push(`/work-orders/${workOrderId}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
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

                const init: Record<string, ItemValue> = {};
                for (const item of rows) {
                    init[item.id] = item.input_type === "boolean"
                        ? { value: null, notes: null, bool: "na" }
                        : { value: null, notes: null };
                }
                setValues(init);
            } catch (e: any) {
                console.error(e);
                toast({ title: "Errore", description: e?.message ?? "Errore caricamento items checklist", variant: "destructive" });
            }
        };

        loadItems();
    }, [selectedAssignmentId]);

    const setItemValue = (itemId: string, patch: Partial<ItemValue>) => {
        setValues((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] ?? {}), ...patch } }));
    };

    const validate = () => {
        for (const item of templateItems) {
            const value = values[item.id];
            if (!item.is_required) continue;

            if (item.input_type === "boolean") {
                if ((value?.bool ?? "na") === "na") return `Completa il controllo obbligatorio: ${item.title}`;
                continue;
            }

            const text = (value?.value ?? "").toString().trim();
            if (!text) return `Completa il controllo obbligatorio: ${item.title}`;
        }
        return null;
    };

    const handleSave = async () => {
        if (!wo || !selectedAssignment) return;

        const errorText = validate();
        if (errorText) {
            toast({ title: "Errore", description: errorText, variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const executedBy = userData.user?.id;
            if (!executedBy) throw new Error("Utente non autenticato.");

            const summaryResults = templateItems.map((item) => {
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

            const executionPayload: any = {
                assignment_id: selectedAssignment.id,
                organization_id: wo.organization_id,
                work_order_id: wo.id,
                machine_id: wo.machine_id,
                executed_by: executedBy,
                executed_at: new Date().toISOString(),
                template_version: selectedAssignment.template?.version ?? 1,
                overall_status: "completed",
                notes: globalNotes.trim() || null,
                results: summaryResults,
            };

            const { data: executionRow, error: execErr } = await supabase
                .from("checklist_executions")
                .insert(executionPayload)
                .select("id")
                .single();

            if (execErr) throw execErr;

            const executionId = (executionRow as any).id as string;
            const itemRows = templateItems.map((item) => {
                const value = values[item.id] ?? { value: null, notes: null };
                let finalValue: string | null = value.value;

                if (item.input_type === "boolean") {
                    finalValue = value.bool === "yes" ? "true" : value.bool === "no" ? "false" : null;
                }

                return {
                    id: crypto.randomUUID(),
                    execution_id: executionId,
                    template_item_id: item.id,
                    value: finalValue,
                    notes: value.notes?.trim() || null,
                };
            });

            if (itemRows.length > 0) {
                const { error: itemsErr } = await supabase.from("checklist_execution_items").insert(itemRows);
                if (itemsErr) throw itemsErr;
            }

            toast({ title: "OK", description: "Checklist salvata correttamente." });
            router.push(`/work-orders/${wo.id}`);
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore salvataggio checklist", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout userRole={role as any}>
                <div className="p-6">Loading...</div>
            </MainLayout>
        );
    }

    if (!wo) {
        return (
            <MainLayout userRole={role as any}>
                <div className="p-6">Work order non trovato.</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
                <Button variant="ghost" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Torna al work order
                </Button>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>Esegui checklist</CardTitle>
                        <CardDescription>
                            Compilazione checklist collegata al work order: <span className="font-medium text-foreground">{wo.title}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Checklist assegnata</Label>
                            <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona checklist" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignments.length === 0 && <SelectItem value="none">Nessuna checklist assegnata</SelectItem>}
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

                {selectedAssignmentId !== "none" && (
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Compilazione</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {templateItems.length === 0 && (
                                <div className="text-sm text-muted-foreground">Questo template non contiene ancora items.</div>
                            )}

                            {templateItems.map((item) => {
                                const value = values[item.id];

                                return (
                                    <div key={item.id} className="rounded-xl border p-4 space-y-3">
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                {item.title} {item.is_required ? <span className="text-destructive">*</span> : null}
                                            </div>
                                            {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
                                        </div>

                                        {item.input_type === "boolean" ? (
                                            <Select value={value?.bool ?? "na"} onValueChange={(v) => setItemValue(item.id, { bool: v as any })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleziona risposta" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="na">—</SelectItem>
                                                    <SelectItem value="yes">Sì</SelectItem>
                                                    <SelectItem value="no">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : item.input_type === "number" ? (
                                            <Input
                                                type="number"
                                                value={value?.value ?? ""}
                                                onChange={(e) => setItemValue(item.id, { value: e.target.value })}
                                                placeholder="Inserisci valore numerico"
                                            />
                                        ) : item.input_type === "text" ? (
                                            <Textarea
                                                value={value?.value ?? ""}
                                                onChange={(e) => setItemValue(item.id, { value: e.target.value })}
                                                rows={2}
                                                placeholder="Inserisci testo"
                                            />
                                        ) : (
                                            <Input
                                                value={value?.value ?? ""}
                                                onChange={(e) => setItemValue(item.id, { value: e.target.value })}
                                                placeholder="Inserisci valore"
                                            />
                                        )}

                                        <div className="space-y-2">
                                            <Label className="text-xs">Note item</Label>
                                            <Textarea
                                                value={value?.notes ?? ""}
                                                onChange={(e) => setItemValue(item.id, { notes: e.target.value })}
                                                rows={2}
                                                placeholder="Note opzionali"
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="space-y-2">
                                <Label>Note finali</Label>
                                <Textarea
                                    value={globalNotes}
                                    onChange={(e) => setGlobalNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Note finali sulla checklist"
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                    <Save className="w-4 h-4 mr-2" />
                                    {saving ? "Salvataggio..." : "Salva checklist"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
