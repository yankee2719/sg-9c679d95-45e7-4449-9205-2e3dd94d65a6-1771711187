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
import { useAuth } from "@/hooks/useAuth";
import {
    canManageChecklists,
    getChecklistTexts,
    translateChecklistInputType,
} from "@/lib/checklistsPageText";
import { checklistTemplateApi } from "@/lib/checklistTemplateApi";
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

export function ChecklistTemplateEditor({ mode, templateId = null }: Props) {
    const router = useRouter();
    const { toast } = useToast();
    const { language } = useLanguage();
    const { loading: authLoading, organization, membership } = useAuth();
    const text = getChecklistTexts(language);

    const [role, setRole] = useState("technician");
    const [loading, setLoading] = useState(mode === "edit");
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [targetType, setTargetType] = useState < "machine" | "production_line" > ("machine");
    const [isActive, setIsActive] = useState(true);
    const [items, setItems] = useState < TemplateItemDraft[] > ([]);

    const allow = useMemo(() => canManageChecklists(role), [role]);
    const orgId = organization?.id ?? null;

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;
            setRole(membership?.role ?? "technician");

            if (mode !== "edit") {
                if (active) setLoading(false);
                return;
            }

            if (!templateId || !orgId) {
                if (active) setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const template = await checklistTemplateApi.get(templateId);
                if (!active) return;

                setName(template.name ?? "");
                setDescription(template.description ?? "");
                setTargetType((template.target_type === "production_line" ? "production_line" : "machine"));
                setIsActive(Boolean(template.is_active ?? true));
                setItems(
                    (template.items ?? []).map((item, index) => ({
                        id: item.id,
                        localId: item.id,
                        title: item.title ?? "",
                        description: item.description ?? "",
                        input_type: (item.input_type ?? "boolean") as "boolean" | "text" | "number" | "value",
                        is_required: Boolean(item.is_required ?? true),
                        order_index: Number(item.order_index ?? index),
                    }))
                );
            } catch (error: any) {
                console.error(error);
                toast({
                    title: text.common.error,
                    description: error?.message ?? text.templates.loadError,
                    variant: "destructive",
                });
                router.push("/checklists/templates");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, membership?.role, mode, orgId, templateId, router, toast, text.common.error, text.templates.loadError]);

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
        setItems((prev) =>
            prev
                .filter((entry) => entry.localId !== localId)
                .map((entry, index) => ({ ...entry, order_index: index }))
        );
    };

    const updateItem = (localId: string, patch: Partial<TemplateItemDraft>) => {
        setItems((prev) => prev.map((entry) => (entry.localId === localId ? { ...entry, ...patch } : entry)));
    };

    const validate = () => {
        if (!name.trim()) return text.templates.validationName;
        if (items.length === 0 || items.some((item) => !item.title.trim())) return text.templates.validationItem;
        return null;
    };

    const handleSave = async () => {
        if (!allow || !orgId) return;

        const validationError = validate();
        if (validationError) {
            toast({ title: text.common.error, description: validationError, variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const result = await checklistTemplateApi.save({
                template_id: mode === "edit" ? templateId : null,
                name: name.trim(),
                description: description.trim() || null,
                target_type: targetType,
                is_active: isActive,
                items: items.map((item, index) => ({
                    title: item.title.trim(),
                    description: item.description.trim() || null,
                    input_type: item.input_type,
                    is_required: item.is_required,
                    order_index: index,
                })),
            });

            toast({
                title: mode === "create" ? text.templates.saveSuccessCreate : text.templates.saveSuccessUpdate,
            });
            router.replace(`/checklists/templates/${result.template_id}`);
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

    if (authLoading || loading) {
        return (
            <MainLayout userRole={role}>
                <div className="flex min-h-[60vh] items-center justify-center">{text.common.loading}</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={role}>
            <SEO title={`${mode === "create" ? text.templates.newTemplate : text.templates.editTemplate} - MACHINA`} />

            <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
                <Button variant="ghost" onClick={() => router.push("/checklists/templates")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {text.common.back}
                </Button>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{mode === "create" ? text.templates.newTemplate : text.templates.editTemplate}</CardTitle>
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
                                    <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} disabled={!allow} />
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
                                    {items.length > 0 ? `${items.length} ${text.templates.itemCount}` : text.templates.noItems}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {items.map((item, index) => (
                                    <div key={item.localId} className="space-y-4 rounded-xl border p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <GripVertical className="h-4 w-4" />
                                                <span>
                                                    #{index + 1} · {translateChecklistInputType(item.input_type, language)} · {" "}
                                                    {item.is_required ? text.templates.required : text.common.inactive}
                                                </span>
                                            </div>

                                            {allow && (
                                                <Button type="button" variant="outline" size="sm" onClick={() => removeItem(item.localId)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {text.templates.removeItem}
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label>{text.templates.itemTitle}</Label>
                                                <Input value={item.title} onChange={(e) => updateItem(item.localId, { title: e.target.value })} disabled={!allow} />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label>{text.templates.itemDescription}</Label>
                                                <Textarea
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.localId, { description: e.target.value })}
                                                    disabled={!allow}
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{text.templates.inputType}</Label>
                                                <Select
                                                    value={item.input_type}
                                                    onValueChange={(value) => updateItem(item.localId, { input_type: value as "boolean" | "text" | "number" | "value" })}
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
                                                        onCheckedChange={(checked) => updateItem(item.localId, { is_required: Boolean(checked) })}
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
                            <Button variant="outline" onClick={() => router.push("/checklists/templates")}>{text.common.cancel}</Button>
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
