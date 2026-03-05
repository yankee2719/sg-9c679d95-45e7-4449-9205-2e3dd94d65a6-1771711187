import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Template = {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    target_type: "machine" | "production_line";
    version: number;
    is_active: boolean;
};

type Item = {
    id: string;
    template_id: string;
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

export default function ChecklistTemplateEditorPage() {
    const router = useRouter();
    const { toast } = useToast();
    const templateId = typeof router.query.id === "string" ? router.query.id : null;

    const [role, setRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const allow = useMemo(() => canManage(role), [role]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [tpl, setTpl] = useState < Template | null > (null);
    const [items, setItems] = useState < Item[] > ([]);

    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newType, setNewType] = useState < string > ("boolean");
    const [newRequired, setNewRequired] = useState(true);

    const load = async () => {
        if (!templateId) return;
        setLoading(true);
        try {
            const ctx: any = await getUserContext();
            const r = ctx?.role ?? "technician";
            setRole(r);

            const oid =
                ctx?.orgId || ctx?.organizationId || ctx?.organization_id || ctx?.tenant_id || null;
            if (!oid) throw new Error("Organization non trovata.");
            setOrgId(oid);

            const { data: tData, error: tErr } = await supabase
                .from("checklist_templates")
                .select("id,organization_id,name,description,target_type,version,is_active")
                .eq("id", templateId)
                .single();

            if (tErr) throw tErr;
            setTpl(tData as any);

            const { data: iData, error: iErr } = await supabase
                .from("checklist_template_items")
                .select("id,template_id,title,description,input_type,is_required,order_index,metadata,created_at")
                .eq("template_id", templateId)
                .order("order_index", { ascending: true })
                .order("created_at", { ascending: true });

            if (iErr) throw iErr;
            setItems((iData ?? []) as any);
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore caricamento", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateId]);

    const saveTemplate = async () => {
        if (!allow || !tpl) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("checklist_templates")
                .update({
                    name: tpl.name.trim(),
                    description: tpl.description?.trim() || null,
                })
                .eq("id", tpl.id);

            if (error) throw error;
            toast({ title: "OK", description: "Template salvato." });
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore salvataggio", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const addItem = async () => {
        if (!allow || !orgId || !templateId) return;
        if (!newTitle.trim()) {
            toast({ title: "Errore", description: "Titolo item obbligatorio.", variant: "destructive" });
            return;
        }
        try {
            const id = crypto.randomUUID();
            const nextOrder = items.length > 0 ? Math.max(...items.map((x) => x.order_index)) + 1 : 0;

            const { error } = await supabase.from("checklist_template_items").insert({
                id,
                template_id: templateId,
                organization_id: orgId,
                title: newTitle.trim(),
                description: newDesc.trim() || null,
                input_type: newType,
                is_required: newRequired,
                order_index: nextOrder,
                metadata: {},
            });

            if (error) throw error;

            setNewTitle("");
            setNewDesc("");
            setNewType("boolean");
            setNewRequired(true);

            await load();
            toast({ title: "OK", description: "Item aggiunto." });
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore aggiunta item", variant: "destructive" });
        }
    };

    const deleteItem = async (id: string) => {
        if (!allow) return;
        try {
            const { error } = await supabase.from("checklist_template_items").delete().eq("id", id);
            if (error) throw error;
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

    if (!tpl) {
        return (
            <MainLayout userRole={role as any}>
                <div className="p-6">Template non trovato.</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={role as any}>
            <div className="p-6 space-y-6">
                <Button variant="ghost" onClick={() => router.push("/checklists/templates")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                                value={tpl.name}
                                onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
                                disabled={!allow}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Descrizione</Label>
                            <Textarea
                                value={tpl.description ?? ""}
                                onChange={(e) => setTpl({ ...tpl, description: e.target.value })}
                                disabled={!allow}
                                rows={3}
                            />
                        </div>

                        <div className="text-xs text-muted-foreground">
                            target: {tpl.target_type} • v{tpl.version} • {tpl.is_active ? "active" : "inactive"}
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={saveTemplate} disabled={!allow || saving} className="bg-orange-500 hover:bg-orange-600">
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? "Salvataggio..." : "Salva"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Items (Domande)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Titolo item *</Label>
                                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} disabled={!allow} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Descrizione</Label>
                                <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} disabled={!allow} rows={2} />
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo input</Label>
                                <Select value={newType} onValueChange={setNewType} disabled={!allow}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="boolean">Sì/No</SelectItem>
                                        <SelectItem value="text">Testo</SelectItem>
                                        <SelectItem value="number">Numero</SelectItem>
                                        <SelectItem value="photo">Foto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Obbligatorio</Label>
                                <Select value={newRequired ? "yes" : "no"} onValueChange={(v) => setNewRequired(v === "yes")} disabled={!allow}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="yes">Sì</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={addItem} disabled={!allow} className="bg-orange-500 hover:bg-orange-600">
                                <Plus className="w-4 h-4 mr-2" />
                                Aggiungi item
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {items.map((it) => (
                                <div key={it.id} className="flex items-start justify-between gap-4 border rounded-xl p-3">
                                    <div>
                                        <div className="font-medium">
                                            {it.order_index}. {it.title}
                                        </div>
                                        <div className="text-sm text-muted-foreground">{it.description ?? "—"}</div>
                                        <div className="text-xs text-muted-foreground">
                                            type: {it.input_type} • required: {it.is_required ? "yes" : "no"}
                                        </div>
                                    </div>
                                    {allow && (
                                        <Button variant="ghost" className="text-destructive" onClick={() => deleteItem(it.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {items.length === 0 && <div className="text-sm text-muted-foreground">Nessun item ancora.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}