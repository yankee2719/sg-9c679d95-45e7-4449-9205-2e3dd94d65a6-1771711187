
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
    canManageChecklists,
    getChecklistTexts,
    translateChecklistInputType,
    translateChecklistTarget,
} from "@/lib/checklistsPageText";
import { ArrowLeft, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type EditorMode = "create" | "edit";

type TemplateItemDraft = {
    id?: string;
    localId: string;
    title: string;
    description: string;
    input_type: "boolean" | "text" | "number" | "value";
    is_required: boolean;
    order_index: number;
};

type Props = {
    mode: EditorMode;
    templateId?: string | null;
};

export function ChecklistTemplateEditor({
    mode,
    templateId = null,
}: Props) {
    const router = useRouter();
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = getChecklistTexts(language);

    const [role, setRole] = useState("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [targetType, setTargetType] = useState < "machine" | "production_line" > ("machine");
    const [isActive, setIsActive] = useState(true);
    const [items, setItems] = useState < TemplateItemDraft[] > ([]);
    const [removedItemIds, setRemovedItemIds] = useState < string[] > ([]);

    const allow = useMemo(() => canManageChecklists(role), [role]);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }

                setRole(ctx.role ?? "technician");
                setOrgId(ctx.orgId ?? null);

                if (mode === "edit" && templateId && ctx.orgId) {
                    setLoading(true);

                    const { data: templateRow, error: templateError } = await supabase
                        .from("checklist_templates")
                        .select("id, name, description, target_type, is_active")
                        .eq("id", templateId)
                        .eq("organization_id", ctx.orgId)
                        .single();

                    if (templateError) throw templateError;

                    const { data: itemRows, error: itemError } = await supabase
                        .from("checklist_template_items")
                        .select("id, title, description, input_type, is_required, order_index")
                        .eq("template_id", templateId)
                        .order("order_index", { ascending: true });

                    if (itemError) throw itemError;

                    setName((templateRow as any)?.name ?? "");
                    setDescription((templateRow as any)?.description ?? "");
                    setTargetType(((templateRow as any)?.target_type ?? "machine") as "machine" | "production_line");
                    setIsActive(Boolean((templateRow as any)?.is_active ?? true));
                    setItems(
                        ((itemRows ?? []) as any[]).map((row, index) => ({
                            id: row.id,
                            localId: row.id,
                            title: row.title ?? "",
                            description: row.description ?? "",
                            input_type: (row.input_type ?? "boolean") as "boolean" | "text" | "number" | "value",
                            is_required: Boolean(row.is_required ?? true),
                            order_index: row.order_index ?? index,
                        }))
                    );
                }
            } catch (error: any) {
                console.error(error);
                toast({
                    title: text.common.error,
                    description: error?.message ?? text.templates.loadError,
                    variant: "destructive",
                });
                router.push("/checklists/templates");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [mode, templateId, router, toast, text.templates.loadError]);

    const pushItem = () => {
        setItems((prev) => [
            ...prev,
            {
                localId: crypto.randomUUID(),
                title: "",
                description: "",
                input_type: "boolean",
                is_required: true,
                order_index: prev.length,
            },
        ]);
    };

    const removeItem = (localId: string) => {
        if (!window.confirm(text.templates.deleteConfirm)) return;

        setItems((prev) => {
            const item = prev.find((entry) => entry.localId === localId);
            if (item?.id) {
                setRemovedItemIds((current) => [...current, item.id!]);
            }
            return prev
                .filter((entry) => entry.localId !== localId)
                .map((entry, index) => ({ ...entry, order_index: index }));
        });
    };

    const updateItem = (
        localId: string,
        patch: Partial<TemplateItemDraft>
    ) => {
        setItems((prev) =>
            prev.map((entry) =>
                entry.localId === localId ? { ...entry, ...patch } : entry
            )
        );
    };

    const validate = () => {
        if (!name.trim()) return text.templates.validationName;
        if (items.some((item) => !item.title.trim())) return text.templates.validationItem;
        return null;
    };

    const handleSave = async () => {
        if (!allow || !orgId) return;

        const validationError = validate();
        if (validationError) {
            toast({
                title: text.common.error,
                description: validationError,
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            let currentTemplateId = templateId;

            if (mode === "create") {
                const { data: createdTemplate, error: createError } = await supabase
                    .from("checklist_templates")
                    .insert({
                        organization_id: orgId,
                        name: name.trim(),
                        description: description.trim() || null,
                        target_type: targetType,
                        is_active: isActive,
                    } as any)
                    .select("id")
                    .single();

                if (createError) throw createError;
                currentTemplateId = (createdTemplate as any)?.id ?? null;
            } else {
                const { error: updateError } = await supabase
                    .from("checklist_templates")
                    .update({
                        name: name.trim(),
                        description: description.trim() || null,
                        target_type: targetType,
                        is_active: isActive,
                    } as any)
                    .eq("id", templateId)
                    .eq("organization_id", orgId);

                if (updateError) throw updateError;
            }

            if (!currentTemplateId) {
                throw new Error(text.templates.saveError);
            }

            if (removedItemIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from("checklist_template_items")
                    .delete()
                    .in("id", removedItemIds);

                if (deleteError) throw deleteError;
            }

            const payload = items.map((item, index) => ({
                id: item.id ?? crypto.randomUUID(),
                template_id: currentTemplateId,
                organization_id: orgId,
                title: item.title.trim(),
                description: item.description.trim() || null,
                input_type: item.input_type,
                is_required: item.is_required,
                order_index: index,
                metadata: {},
            }));

            if (payload.length > 0) {
                const { error: upsertError } = await supabase
                    .from("checklist_template_items")
                    .upsert(payload as any, { onConflict: "id" });

                if (upsertError) throw upsertError;
            }

            toast({
                title: mode === "create" ? text.templates.saveSuccessCreate : text.templates.saveSuccessUpdate,
            });

            router.replace(`/checklists/templates/${currentTemplateId}`);
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.common.error,
                description: error?.message ?? text.templates.saveError,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <MainLayout userRole={role}>
                <div className="flex min-h-[60vh] items-center justify-center">
                    {text.common.loading}
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={role}>
            <SEO
                title={`${mode === "create" ? text.templates.newTemplate : text.templates.editTemplate
                    } - MACHINA`}
            />

            <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
                <Button variant="ghost" onClick={() => router.push("/checklists/templates")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {text.common.back}
                </Button>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>
                            {mode === "create" ? text.templates.newTemplate : text.templates.editTemplate}
                        </CardTitle>
                        <CardDescription>{text.templates.editorSubtitle}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label>{text.templates.name}</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!allow} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>{text.templates.description}</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={!allow}
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{text.templates.target}</Label>
                                <Select
                                    value={targetType}
                                    onValueChange={(value) => setTargetType(value as "machine" | "production_line")}
                                    disabled={!allow}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="machine">{text.templates.targetMachine}</SelectItem>
                                        <SelectItem value="production_line">{text.templates.targetLine}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">{text.templates.targetHelp}</p>
                            </div>

                            <div className="space-y-2">
                                <Label>{text.templates.enabled}</Label>
                                <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                                    <Checkbox
                                        checked={isActive}
                                        onCheckedChange={(checked) => setIsActive(Boolean(checked))}
                                        disabled={!allow}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {isActive ? text.templates.statusActive : text.templates.statusInactive}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Card className="rounded-2xl border-dashed">
                            <CardHeader>
                                <CardTitle className="text-lg">{text.templates.itemsTitle}</CardTitle>
                                <CardDescription>
                                    {items.length > 0
                                        ? `${items.length} ${text.templates.itemCount}`
                                        : text.templates.noItems}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {items.map((item, index) => (
                                    <div key={item.localId} className="rounded-xl border p-4 space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <GripVertical className="h-4 w-4" />
                                                <span>
                                                    #{index + 1} · {translateChecklistInputType(item.input_type, language)} ·{" "}
                                                    {item.is_required ? text.templates.required : text.common.inactive}
                                                </span>
                                            </div>

                                            {allow && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeItem(item.localId)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {text.templates.removeItem}
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>{text.templates.itemTitle}</Label>
                                                <Input
                                                    value={item.title}
                                                    onChange={(e) => updateItem(item.localId, { title: e.target.value })}
                                                    disabled={!allow}
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label>{text.templates.itemDescription}</Label>
                                                <Textarea
                                                    value={item.description}
                                                    onChange={(e) =>
                                                        updateItem(item.localId, { description: e.target.value })
                                                    }
                                                    disabled={!allow}
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{text.templates.inputType}</Label>
                                                <Select
                                                    value={item.input_type}
                                                    onValueChange={(value) =>
                                                        updateItem(item.localId, {
                                                            input_type: value as "boolean" | "text" | "number" | "value",
                                                        })
                                                    }
                                                    disabled={!allow}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="boolean">{text.inputs.boolean}</SelectItem>
                                                        <SelectItem value="text">{text.inputs.text}</SelectItem>
                                                        <SelectItem value="number">{text.inputs.number}</SelectItem>
                                                        <SelectItem value="value">{text.inputs.value}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{text.templates.required}</Label>
                                                <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                                                    <Checkbox
                                                        checked={item.is_required}
                                                        onCheckedChange={(checked) =>
                                                            updateItem(item.localId, { is_required: Boolean(checked) })
                                                        }
                                                        disabled={!allow}
                                                    />
                                                    <span className="text-sm text-muted-foreground">
                                                        {item.is_required ? text.common.yes : text.common.no}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {allow && (
                                    <Button type="button" variant="outline" onClick={pushItem}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {text.templates.addItem}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => router.push("/checklists/templates")}>
                                {text.common.cancel}
                            </Button>
                            <Button onClick={handleSave} disabled={!allow || saving}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? text.common.saving : text.common.save}
                            </Button>
                        </div>

                        {!allow && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-muted-foreground">
                                {text.assignments.onlyManagers}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
