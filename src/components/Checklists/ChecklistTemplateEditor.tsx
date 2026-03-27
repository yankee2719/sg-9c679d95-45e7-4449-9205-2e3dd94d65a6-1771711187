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
import { authService } from "@/services/authService";
import {
    canManageChecklists,
    getChecklistTexts,
    translateChecklistInputType,
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

type SaveApiResponse = {
    templateId: string;
    version: number;
    mode: "created" | "versioned";
    clonedAssignments: number;
};

async function getAuthHeaders() {
    const session = await authService.getCurrentSession();
    if (!session?.access_token) {
        throw new Error("Authentication required");
    }

    return {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
    };
}

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
    const [currentVersion, setCurrentVersion] = useState < number | null > (null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [targetType, setTargetType] = useState < "machine" | "production_line" > ("machine");
    const [isActive, setIsActive] = useState(true);
    const [items, setItems] = useState < TemplateItemDraft[] > ([]);

    const allow = useMemo(() => canManageChecklists(role), [role]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }

                if (!active) return;

                setRole(ctx.role ?? "technician");
                setOrgId(ctx.orgId ?? null);

                if (mode === "edit" && templateId && ctx.orgId) {
                    setLoading(true);

                    const { data: templateRow, error: templateError } = await supabase
                        .from("checklist_templates")
                        .select("id, name, description, target_type, version, is_active")
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
                    if (!active) return;

                    setName((templateRow as any)?.name ?? "");
                    setDescription((templateRow as any)?.description ?? "");
                    setTargetType(
                        ((templateRow as any)?.target_type ?? "machine") as "machine" | "production_line"
                    );
                    setCurrentVersion(Number((templateRow as any)?.version ?? 1));
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
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [mode, templateId, router, toast, text.common.error, text.templates.loadError]);

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
        setItems((prev) =>
            prev.map((entry) =>
                entry.localId === localId ? { ...entry, ...patch } : entry
            )
        );
    };

    const validate = () => {
        if (!name.trim()) return text.templates.validationName;
        if (items.length === 0) return text.templates.validationItem;
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
            const response = await fetch("/api/checklists/templates/save", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    template_id: mode === "edit" ? templateId : null,
                    organization_id: orgId,
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
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error || text.templates.saveError);
            }

            const data = (payload?.data ?? payload) as SaveApiResponse;
            const nextTemplateId = data.templateId;

            toast({
                title:
                    mode === "create"
                        ? text.templates.saveSuccessCreate
                        : text.templates.saveSuccessUpdate,
            });

            router.replace(`/checklists/templates/${nextTemplateId}`);
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
                title={`${mode === "create" ? text.templates.newTemplate : text.templates.editTemplate} - MACHINA`}
            />

            <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
                <Button variant="ghost" onClick={() => router.push("/checklists/templates")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {text.common.back}
                </Button>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle>
                                    {mode === "create" ? text.templates.newTemplate : text.templates.editTemplate}
                                </CardTitle>
                                <CardDescription>{text.templates.editorSubtitle}</CardDescription>
                            </div>
                            {currentVersion ? (
                                <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                                    {text.templates.version} {currentVersion}
                                </div>
                            ) : null}
                        </div>
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
                                    <div key={item.localId} className="space-y-4 rounded-xl border p-4">
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
                                                        <SelectItem value="boolean">
                                                            {translateChecklistInputType("boolean", language)}
                                                        </SelectItem>
                                                        <SelectItem value="text">
                                                            {translateChecklistInputType("text", language)}
                                                        </SelectItem>
                                                        <SelectItem value="number">
                                                            {translateChecklistInputType("number", language)}
                                                        </SelectItem>
                                                        <SelectItem value="value">
                                                            {translateChecklistInputType("value", language)}
                                                        </SelectItem>
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
                                                        {item.is_required ? text.templates.required : text.common.inactive}
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

                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={!allow || saving}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? text.common.loading : text.common.save}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}

