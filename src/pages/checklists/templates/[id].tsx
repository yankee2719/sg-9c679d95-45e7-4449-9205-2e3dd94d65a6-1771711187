import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type TargetType = "machine" | "production_line";
type InputType = "boolean" | "text" | "number" | "value";

type Template = {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    target_type: TargetType;
    version: number;
    is_active: boolean;
};

type TemplateItem = {
    id: string;
    template_id: string;
    organization_id: string;
    title: string;
    description: string | null;
    input_type: string;
    is_required: boolean;
    order_index: number;
    metadata: any;
    created_at: string;
};

function canManage(role?: string) {
    return role === "admin" || role === "supervisor";
}

export default function ChecklistTemplateDetailPage() {
    const router = useRouter();
    const { toast } = useToast();
    const templateId = typeof router.query.id === "string" ? router.query.id : null;

    const [role, setRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingItem, setAddingItem] = useState(false);

    const [template, setTemplate] = useState < Template | null > (null);
    const [items, setItems] = useState < TemplateItem[] > ([]);

    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newInputType, setNewInputType] = useState < InputType > ("boolean");
    const [newRequired, setNewRequired] = useState(true);

    const allow = useMemo(() => canManage(role), [role]);

    const load = async () => {
        if (!templateId) return;

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
            setOrgId(activeOrgId);

            const { data: tplData, error: tplErr } = await supabase
                .from("checklist_templates")
                .select("id, organization_id, name, description, target_type, version, is_active")
                .eq("id", templateId)
                .eq("organization_id", activeOrgId)
                .single();

            if (tplErr) throw tplErr;
            setTemplate(tplData as Template);

            const { data: itemRows, error: itemsErr } = await supabase
                .from("checklist_template_items")
                .select("id, template_id, organization_id, title, description, input_type, is_required, order_index, metadata, created_at")
                .eq("template_id", templateId)
                .order("order_index", { ascending: true })
                .order("created_at", { ascending: true });

            if (itemsErr) throw itemsErr;
            setItems((itemRows ?? []) as TemplateItem[]);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore caricamento template",
                variant: "destructive",
            });
            router.push("/checklists/templates");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [templateId]);

    const saveTemplate = async () => {
        if (!template || !allow) return;

        if (!template.name.trim()) {
            toast({ title: "Errore", description: "Il nome template è obbligatorio.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from("checklist_templates")
                .update({
                    name: template.name.trim(),
                    description: template.description?.trim() || null,
                    target_type: template.target_type,
                    is_active: template.is_active,
                })
                .eq("id", template.id)
                .eq("organization_id", orgId);

            if (error) throw error;

            toast({ title: "OK", description: "Template aggiornato." });
            await load();
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore salvataggio template", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const addItem = async () => {
        if (!allow || !orgId || !template) return;

        if (!newTitle.trim()) {
            toast({ title: "Errore", description: "Il titolo item è obbligatorio.", variant: "destructive" });
            return;
        }

        setAddingItem(true);
        try {
            const nextOrder = items.length > 0 ? Math.max(...items.map((x) => x.order_index ?? 0)) + 1 : 0;

            const { error } = await supabase.from("checklist_template_items").insert({
                id: crypto.randomUUID(),
                template_id: template.id,
                organization_id: orgId,
                title: newTitle.trim(),
                description: newDescription.trim() || null,
                input_type: newInputType,
                is_required: newRequired,
                order_index: nextOrder,
                metadata: {},
            });

            if (error) throw error;

            setNewTitle("");
            setNewDescription("");
            setNewInputType("boolean");
            setNewRequired(true);

            toast({ title: "OK", description: "Item aggiunto al template." });
            await load();
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore aggiunta item", variant: "destructive" });
        } finally {
            setAddingItem(false);
        }
    };

    const deleteItem = async (itemId: string) => {
        if (!allow) return;
        if (!confirm("Eliminare questo item dal template?")) return;

        try {
            const { error } = await supabase.from("checklist_template_items").delete().eq("id", itemId);
            if (error) throw error;
            toast({ title: "OK", description: "Item eliminato." });
            await load();
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore eliminazione item", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <MainLayout userRole={role as any}>
                <div className="p-6">Loading...</div>
            </MainLayout>
        );
    }

    if (!template) {
        return (
            <MainLayout userRole={role as any}>
                <div className="p-6">Template non trovato.</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
                <Button variant="ghost" onClick={() => router.push("/checklists/templates")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Indietro
                </Button>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>Template checklist</CardTitle>
                        <CardDescription>
                            I template appartengono all&apos;owner operativo. Da qui definisci struttura e campi di compilazione.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Nome *</Label>
                                <Input
                                    value={template.name}
                                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                                    disabled={!allow}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Target</Label>
                                <Select
                                    value={template.target_type}
                                    onValueChange={(v) => setTemplate({ ...template, target_type: v as TargetType })}
                                    disabled={!allow}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="machine">Macchina</SelectItem>
                                        <SelectItem value="production_line">Linea</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button
                                    variant={template.is_active ? "default" : "outline"}
                                    onClick={() => allow && setTemplate({ ...template, is_active: !template.is_active })}
                                    disabled={!allow}
                                >
                                    {template.is_active ? "Template attivo" : "Template inattivo"}
                                </Button>
                                <Badge variant="outline">v{template.version}</Badge>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Descrizione</Label>
                                <Textarea
                                    value={template.description ?? ""}
                                    onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                                    rows={3}
                                    disabled={!allow}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={saveTemplate} disabled={!allow || saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? "Salvataggio..." : "Salva template"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>Items del template</CardTitle>
                        <CardDescription>
                            Ogni item corrisponde a una domanda o controllo che il tecnico compilerà in esecuzione.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border p-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Titolo item *</Label>
                                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={!allow} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Descrizione</Label>
                                <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} disabled={!allow} />
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo input</Label>
                                <Select value={newInputType} onValueChange={(v) => setNewInputType(v as InputType)} disabled={!allow}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="boolean">Sì / No</SelectItem>
                                        <SelectItem value="text">Testo</SelectItem>
                                        <SelectItem value="number">Numero</SelectItem>
                                        <SelectItem value="value">Valore generico</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end gap-3 rounded-xl border px-3 py-2">
                                <Checkbox
                                    checked={newRequired}
                                    onCheckedChange={(checked) => setNewRequired(Boolean(checked))}
                                    disabled={!allow}
                                    id="new-required"
                                />
                                <Label htmlFor="new-required">Item obbligatorio</Label>
                            </div>

                            <div className="md:col-span-2 flex justify-end">
                                <Button onClick={addItem} disabled={!allow || addingItem}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    {addingItem ? "Aggiunta..." : "Aggiungi item"}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {items.length === 0 && (
                                <div className="text-sm text-muted-foreground">Nessun item presente nel template.</div>
                            )}

                            {items.map((item) => (
                                <div key={item.id} className="rounded-xl border p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="font-medium">{item.order_index + 1}. {item.title}</div>
                                            <Badge variant="secondary">{item.input_type}</Badge>
                                            {item.is_required && <Badge variant="outline">Obbligatorio</Badge>}
                                        </div>
                                        {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => deleteItem(item.id)} disabled={!allow}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Elimina
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
