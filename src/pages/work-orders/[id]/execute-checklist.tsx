// src/pages/work-orders/[id]/execute-checklist.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type WorkOrderRow = {
    id: string;
    organization_id: string;
    machine_id: string;
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
    input_type: string; // boolean | text | number | photo ...
    is_required: boolean;
    order_index: number;
    metadata: any;
};

type ItemValue = {
    value: string | null; // store as text, convert number on UI only
    notes: string | null;
    bool?: "yes" | "no" | "na"; // helper for boolean UI
};

function isManager(role?: string) {
    return role === "admin" || role === "supervisor";
}

export default function ExecuteChecklistInWorkOrderPage() {
    const router = useRouter();
    const { toast } = useToast();

    const workOrderId = typeof router.query.id === "string" ? router.query.id : null;

    const [role, setRole] = useState < string > ("technician");
    const canExecute = useMemo(() => true, []); // technician must be able to execute
    const canPickAny = useMemo(() => isManager(role), [role]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [wo, setWo] = useState < WorkOrderRow | null > (null);

    const [assignments, setAssignments] = useState <
        (AssignmentRow & { template?: TemplateRow | null })[]
        > ([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState < string > ("none");

    const selectedAssignment = useMemo(
        () => assignments.find((a) => a.id === selectedAssignmentId) ?? null,
        [assignments, selectedAssignmentId]
    );

    const [templateItems, setTemplateItems] = useState < TemplateItemRow[] > ([]);
    const [values, setValues] = useState < Record < string, ItemValue>> ({});

    // Load WO + assignments + template list
    useEffect(() => {
        const load = async () => {
            if (!workOrderId) return;
            setLoading(true);

            try {
                const ctx: any = await getUserContext();
                const r = ctx?.role ?? "technician";
                setRole(r);

                // 1) Load Work Order (must include machine_id + org)
                const { data: woData, error: woErr } = await supabase
                    .from("work_orders")
                    .select("id,organization_id,machine_id,title")
                    .eq("id", workOrderId)
                    .single();

                if (woErr) throw woErr;
                const woRow = woData as any as WorkOrderRow;
                if (!woRow?.machine_id) throw new Error("Work order senza machine_id.");
                setWo(woRow);

                // 2) Load checklist assignments for that machine (active)
                const { data: asgData, error: asgErr } = await supabase
                    .from("checklist_assignments")
                    .select("id,template_id,machine_id,production_line_id,is_active")
                    .eq("organization_id", woRow.organization_id)
                    .eq("machine_id", woRow.machine_id)
                    .eq("is_active", true);

                if (asgErr) throw asgErr;

                const aRows = ((asgData ?? []) as any[]) as AssignmentRow[];

                // 3) Load templates names/versions for display
                const templateIds = Array.from(new Set(aRows.map((a) => a.template_id).filter(Boolean)));
                let templatesMap = new Map < string, TemplateRow> ();

                if (templateIds.length > 0) {
                    const { data: tData, error: tErr } = await supabase
                        .from("checklist_templates")
                        .select("id,name,version,is_active")
                        .in("id", templateIds);

                    if (tErr) throw tErr;
                    (tData ?? []).forEach((t: any) => templatesMap.set(t.id, t));
                }

                const merged = aRows.map((a) => ({
                    ...a,
                    template: templatesMap.get(a.template_id) ?? null,
                }));

                setAssignments(merged);

                // Auto-select first assignment
                if (merged.length > 0) {
                    setSelectedAssignmentId(merged[0].id);
                } else {
                    setSelectedAssignmentId("none");
                }
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento checklist",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workOrderId]);

    // Load template items when assignment changes
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
                    .select("id,title,description,input_type,is_required,order_index,metadata")
                    .eq("template_id", selectedAssignment.template_id)
                    .order("order_index", { ascending: true })
                    .limit(500);

                if (error) throw error;

                const items = (data ?? []) as any as TemplateItemRow[];
                setTemplateItems(items);

                // init values
                const init: Record<string, ItemValue> = {};
                for (const it of items) {
                    if (it.input_type === "boolean") {
                        init[it.id] = { value: null, notes: null, bool: "na" };
                    } else {
                        init[it.id] = { value: null, notes: null };
                    }
                }
                setValues(init);
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento items",
                    variant: "destructive",
                });
            }
        };

        loadItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAssignmentId]);

    const setItemValue = (itemId: string, patch: Partial<ItemValue>) => {
        setValues((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] ?? {}), ...patch } }));
    };

    const validate = () => {
        for (const it of templateItems) {
            const v = values[it.id];
            if (!it.is_required) continue;

            if (it.input_type === "boolean") {
                const b = v?.bool ?? "na";
                if (b === "na") return `Completa: "${it.title}" (Sì/No richiesto)`;
                continue;
            }

            const val = (v?.value ?? "").toString().trim();
            if (!val) return `Completa: "${it.title}"`;
        }
        return null;
    };

    const handleSave = async () => {
        if (!canExecute) return;
        if (!wo) return;

        if (selectedAssignmentId === "none") {
            toast({
                title: "Errore",
                description: "Nessuna checklist assegnata a questa macchina.",
                variant: "destructive",
            });
            return;
        }

        const err = validate();
        if (err) {
            toast({ title: "Errore", description: err, variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { data: userRes } = await supabase.auth.getUser();
            const executedBy = userRes?.user?.id;
            if (!executedBy) throw new Error("Utente non autenticato.");

            const templateVersion = selectedAssignment?.template?.version ?? 1;

            // 1) Create execution
            const { data: execRow, error: execErr } = await supabase
                .from("checklist_executions")
                .insert({
                    assignment_id: selectedAssignmentId,
                    organization_id: wo.organization_id,
                    work_order_id: wo.id,
                    machine_id: wo.machine_id,
                    executed_by: executedBy,
                    executed_at: new Date().toISOString(),
                    template_version: templateVersion,
                    overall_status: "pending",
                    notes: null,
                    results: [], // keep for future summary
                })
                .select("id")
                .single();

            if (execErr) throw execErr;

            const executionId = (execRow as any).id as string;

            // 2) Insert execution items
            const rows = templateItems.map((it) => {
                const v = values[it.id] ?? { value: null, notes: null };

                let outValue: string | null = v.value;
                if (it.input_type === "boolean") {
                    const b = v.bool ?? "na";
                    outValue = b === "yes" ? "true" : b === "no" ? "false" : null;
                }

                // number stays in text, ok
                if (it.input_type === "number" && outValue != null) {
                    const clean = outValue.toString().trim();
                    outValue = clean.length ? clean : null;
                }

                return {
                    execution_id: executionId,
                    template_item_id: it.id,
                    value: outValue,
                    notes: v.notes?.toString().trim() || null,
                };
            });

            const { error: itemsErr } = await supabase
                .from("checklist_execution_items")
                .insert(rows);

            if (itemsErr) throw itemsErr;

            toast({ title: "OK", description: "Checklist compilata e salvata." });

            // go back to WO detail
            router.push(`/work-orders/${wo.id}`);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore salvataggio checklist",
                variant: "destructive",
            });
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
            <div className="p-6 space-y-6 max-w-5xl">
                <Button variant="ghost" onClick={() => router.push(`/work-orders/${wo.id}`)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Torna al Work Order
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Esegui checklist nel Work Order</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                            WO: <span className="font-medium text-foreground">{wo.title}</span>
                        </div>

                        <div className="space-y-2">
                            <Label>Checklist assegnata</Label>
                            <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona checklist..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignments.length === 0 && (
                                        <SelectItem value="none">Nessuna checklist assegnata</SelectItem>
                                    )}
                                    {assignments.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.template?.name ?? "Template"}{" "}
                                            {a.template?.version ? ` (v${a.template.version})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {assignments.length === 0 && (
                                <div className="text-xs text-muted-foreground">
                                    Non esistono assegnazioni checklist per questa macchina. Vai su “Assegnazioni Checklist”.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {selectedAssignmentId !== "none" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Compilazione</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {templateItems.map((it) => {
                                const v = values[it.id];

                                return (
                                    <div key={it.id} className="border rounded-xl p-4 space-y-3">
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                {it.title} {it.is_required ? <span className="text-destructive">*</span> : null}
                                            </div>
                                            {it.description ? (
                                                <div className="text-sm text-muted-foreground">{it.description}</div>
                                            ) : null}
                                            <div className="text-xs text-muted-foreground">
                                                type: {it.input_type}
                                            </div>
                                        </div>

                                        {it.input_type === "boolean" ? (
                                            <Select
                                                value={v?.bool ?? "na"}
                                                onValueChange={(x) => setItemValue(it.id, { bool: x as any })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleziona..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="na">—</SelectItem>
                                                    <SelectItem value="yes">Sì</SelectItem>
                                                    <SelectItem value="no">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : it.input_type === "number" ? (
                                            <Input
                                                type="number"
                                                value={v?.value ?? ""}
                                                onChange={(e) => setItemValue(it.id, { value: e.target.value })}
                                                placeholder="Inserisci valore numerico"
                                            />
                                        ) : it.input_type === "text" ? (
                                            <Textarea
                                                value={v?.value ?? ""}
                                                onChange={(e) => setItemValue(it.id, { value: e.target.value })}
                                                rows={2}
                                                placeholder="Inserisci testo"
                                            />
                                        ) : (
                                            <Input
                                                value={v?.value ?? ""}
                                                onChange={(e) => setItemValue(it.id, { value: e.target.value })}
                                                placeholder="Inserisci valore"
                                            />
                                        )}

                                        <div className="space-y-2">
                                            <Label className="text-xs">Note</Label>
                                            <Textarea
                                                value={v?.notes ?? ""}
                                                onChange={(e) => setItemValue(it.id, { notes: e.target.value })}
                                                rows={2}
                                                placeholder="Note (opzionali)"
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || assignments.length === 0}
                                    className="bg-orange-500 hover:bg-orange-600"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saving ? "Salvataggio..." : "Salva checklist"}
                                </Button>
                            </div>

                            {!canPickAny && (
                                <div className="text-xs text-muted-foreground">
                                    Il tecnico può eseguire checklist assegnate alla macchina.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}