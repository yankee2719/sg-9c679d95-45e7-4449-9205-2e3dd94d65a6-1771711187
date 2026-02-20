import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, ArrowLeft, Link2, Play, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUserContext } from "@/lib/supabaseHelpers";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type InputType = "text" | "number" | "boolean" | "select" | "photo";

type Template = {
    id: string;
    name: string;
    description: string | null;
    target_type: "machine" | "production_line";
    version: number;
    is_active: boolean;
};

type TemplateItem = {
    id: string;
    template_id: string;
    title: string;
    description: string | null;
    input_type: InputType;
    is_required: boolean;
    order_index: number;
    metadata: any;
};

type MachineRow = {
    id: string;
    name: string | null;
    internal_code: string | null;
};

type ChecklistAssignmentRow = {
    id: string;
    machine_id: string;
    is_active: boolean;
    created_at: string;
    machines?: { name: string | null; internal_code: string | null } | null;
};

function isEditorRole(role?: string) {
    return role === "admin" || role === "supervisor";
}

export default function EditChecklistTemplatePage() {
    const router = useRouter();
    const { toast } = useToast();
    const templateId = router.query.id as string | undefined;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [userRole, setUserRole] = useState < string > ("technician");
    const canEdit = useMemo(() => isEditorRole(userRole), [userRole]);

    const [tpl, setTpl] = useState < Template | null > (null);
    const [items, setItems] = useState < TemplateItem[] > ([]);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const [orgId, setOrgId] = useState < string | null > (null);
    const [assignments, setAssignments] = useState < ChecklistAssignmentRow[] > ([]);
    const [machines, setMachines] = useState < MachineRow[] > ([]);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [machineQuery, setMachineQuery] = useState("");
    const [selectedMachineId, setSelectedMachineId] = useState < string | null > (null);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }
                setUserRole(ctx.role);
                setOrgId(ctx.orgId);

                if (!templateId) return;

                const { data: tplData, error: tplErr } = await supabase
                    .from("checklist_templates")
                    .select("id,name,description,target_type,version,is_active")
                    .eq("id", templateId)
                    .single();

                if (tplErr) throw tplErr;

                const { data: itemData, error: itemErr } = await supabase
                    .from("checklist_template_items")
                    .select("id,template_id,title,description,input_type,is_required,order_index,metadata")
                    .eq("template_id", templateId)
                    .order("order_index", { ascending: true });

                if (itemErr) throw itemErr;

                // Load current assignments for this template
                const { data: asgData, error: asgErr } = await supabase
                    .from("checklist_assignments")
                    .select("id, machine_id, is_active, created_at, machines(name, internal_code)")
                    .eq("template_id", templateId)
                    .eq("is_active", true)
                    .order("created_at", { ascending: false });
                if (asgErr) throw asgErr;
                setAssignments((asgData as any) ?? []);

                // Preload machines for assignment picker (only if we have orgId)
                if (ctx.orgId) {
                    const { data: mData, error: mErr } = await supabase
                        .from("machines")
                        .select("id,name,internal_code")
                        .eq("organization_id", ctx.orgId)
                        .eq("is_archived", false)
                        .order("name", { ascending: true });
                    if (mErr) throw mErr;
                    setMachines((mData as any) ?? []);
                }

                setTpl(tplData as any);
                setName(tplData?.name ?? "");
                setDescription(tplData?.description ?? "");
                setItems((itemData as any) ?? []);
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e.message ?? "Errore caricamento template",
                    variant: "destructive",
                });
                router.push("/checklists");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [templateId, router]);

    const filteredMachines = useMemo(() => {
        const q = machineQuery.trim().toLowerCase();
        const assignedSet = new Set(assignments.map((a) => a.machine_id));
        const base = machines.filter((m) => !assignedSet.has(m.id));
        if (!q) return base;
        return base.filter((m) =>
            (m.name ?? "").toLowerCase().includes(q) ||
            (m.internal_code ?? "").toLowerCase().includes(q)
        );
    }, [machineQuery, machines, assignments]);

    const handleCreateAssignment = async () => {
        if (!tpl) return;
        if (!canEdit) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin/Supervisor possono assegnare template.",
                variant: "destructive",
            });
            return;
        }
        if (!orgId) {
            toast({ title: "Errore", description: "Organizzazione non trovata.", variant: "destructive" });
            return;
        }
        if (!selectedMachineId) {
            toast({ title: "Errore", description: "Seleziona una macchina.", variant: "destructive" });
            return;
        }

        setAssigning(true);
        try {
            const { data, error } = await supabase
                .from("checklist_assignments")
                .insert({
                    organization_id: orgId,
                    template_id: tpl.id,
                    machine_id: selectedMachineId,
                    is_active: true,
                })
                .select("id, machine_id, is_active, created_at, machines(name, internal_code)")
                .single();

            if (error) {
                // handle unique conflict gracefully
                if ((error as any).code === "23505") {
                    toast({ title: "Già assegnata", description: "Questo template è già assegnato alla macchina." });
                } else {
                    throw error;
                }
            } else {
                setAssignments((prev) => [data as any, ...prev]);
                toast({ title: "Assegnata", description: "Template assegnato alla macchina." });
            }

            setAssignDialogOpen(false);
            setMachineQuery("");
            setSelectedMachineId(null);
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e.message ?? "Errore assegnazione", variant: "destructive" });
        } finally {
            setAssigning(false);
        }
    };

    const handleDeactivateAssignment = async (assignmentId: string) => {
        if (!canEdit) return;
        if (!confirm("Rimuovere questa assegnazione?")) return;
        try {
            const { error } = await supabase
                .from("checklist_assignments")
                .update({ is_active: false })
                .eq("id", assignmentId);
            if (error) throw error;
            setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
            toast({ title: "Assegnazione rimossa" });
        } catch (e: any) {
            toast({ title: "Errore", description: e.message ?? "Errore rimozione", variant: "destructive" });
        }
    };

    const addItem = () => {
        if (!tpl) return;
        const nextIndex = items.length;
        setItems((prev) => [
            ...prev,
            {
                id: `tmp_${crypto.randomUUID()}`,
                template_id: tpl.id,
                title: "",
                description: null,
                input_type: "boolean",
                is_required: true,
                order_index: nextIndex,
                metadata: { requiresPhoto: false },
            },
        ]);
    };

    const removeItem = (id: string) => {
        setItems((prev) =>
            prev
                .filter((i) => i.id !== id)
                .map((i, idx) => ({ ...i, order_index: idx }))
        );
    };

    const updateItem = <K extends keyof TemplateItem>(id: string, field: K, value: TemplateItem[K]) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    };

    const toggleRequiresPhoto = (id: string, v: boolean) => {
        setItems((prev) =>
            prev.map((i) => {
                if (i.id !== id) return i;
                return { ...i, metadata: { ...(i.metadata ?? {}), requiresPhoto: v } };
            })
        );
    };

    const handleSave = async () => {
        if (!tpl) return;
        if (!canEdit) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin/Supervisor possono modificare.",
                variant: "destructive",
            });
            return;
        }
        if (!name.trim()) {
            toast({ title: "Errore", description: "Il nome template è obbligatorio.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { error: upErr } = await supabase
                .from("checklist_templates")
                .update({ name: name.trim(), description: description.trim() || null })
                .eq("id", tpl.id);
            if (upErr) throw upErr;

            const existing = items.filter((i) => !i.id.startsWith("tmp_"));
            const created = items.filter((i) => i.id.startsWith("tmp_"));

            const normalizedExisting = existing.map((i, idx) => ({ ...i, order_index: idx }));
            const normalizedCreated = created.map((i, idx) => ({
                ...i,
                order_index: normalizedExisting.length + idx,
            }));

            if (normalizedExisting.length > 0) {
                const { error: exErr } = await supabase
                    .from("checklist_template_items")
                    .upsert(
                        normalizedExisting.map((i) => ({
                            id: i.id,
                            template_id: tpl.id,
                            title: i.title,
                            description: i.description,
                            input_type: i.input_type,
                            is_required: i.is_required,
                            order_index: i.order_index,
                            metadata: i.metadata ?? {},
                        })),
                        { onConflict: "id" }
                    );
                if (exErr) throw exErr;
            }

            if (normalizedCreated.length > 0) {
                const { data: tplOrg, error: orgErr } = await supabase
                    .from("checklist_templates")
                    .select("organization_id")
                    .eq("id", tpl.id)
                    .single();
                if (orgErr) throw orgErr;

                const { error: crErr } = await supabase.from("checklist_template_items").insert(
                    normalizedCreated.map((i) => ({
                        template_id: tpl.id,
                        organization_id: (tplOrg as any).organization_id,
                        title: i.title,
                        description: i.description,
                        input_type: i.input_type,
                        is_required: i.is_required,
                        order_index: i.order_index,
                        metadata: i.metadata ?? {},
                    }))
                );
                if (crErr) throw crErr;
            }

            toast({ title: "Salvato", description: "Template aggiornato." });

            const { data: itemData, error: itemErr } = await supabase
                .from("checklist_template_items")
                .select("id,template_id,title,description,input_type,is_required,order_index,metadata")
                .eq("template_id", tpl.id)
                .order("order_index", { ascending: true });
            if (itemErr) throw itemErr;
            setItems((itemData as any) ?? []);
            setTpl((prev) => (prev ? { ...prev, name: name.trim(), description: description.trim() || null } : prev));
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e.message ?? "Errore salvataggio", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const statusBadge = (active: boolean) => (
        <Badge
            className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${active
                    ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30"
                    : "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30"
                }`}
        >
            {active ? "ATTIVA" : "DISATTIVA"}
        </Badge>
    );

    if (loading) return null;
    if (!tpl) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title={`Modifica Template - MACHINA`} />

            <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
                <Button variant="ghost" onClick={() => router.push("/checklists")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Indietro
                </Button>

                {!canEdit && (
                    <Card className="rounded-2xl border border-orange-500/30 bg-orange-500/10">
                        <CardContent className="p-4 text-orange-200">
                            Solo <b>Admin</b> e <b>Supervisor</b> possono modificare i template. Sei in sola lettura.
                        </CardContent>
                    </Card>
                )}

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle className="text-foreground">Template</CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Versione: {tpl.version} — {statusBadge(tpl.is_active)}
                                </CardDescription>
                            </div>

                            {canEdit && (
                                <div className="flex items-center gap-2">
                                    <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline">
                                                <Link2 className="w-4 h-4 mr-2" />
                                                Assegna a macchina
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[560px]">
                                            <DialogHeader>
                                                <DialogTitle>Assegna template a macchina</DialogTitle>
                                                <DialogDescription>
                                                    Seleziona una macchina della tua organizzazione. Le macchine già assegnate non sono mostrate.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        placeholder="Cerca macchina (nome o codice interno)..."
                                                        value={machineQuery}
                                                        onChange={(e) => setMachineQuery(e.target.value)}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setMachineQuery("");
                                                            setSelectedMachineId(null);
                                                        }}
                                                        title="Reset"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                <div className="max-h-[320px] overflow-auto border border-border rounded-xl">
                                                    {filteredMachines.length === 0 ? (
                                                        <div className="p-4 text-sm text-muted-foreground">Nessuna macchina disponibile.</div>
                                                    ) : (
                                                        <div className="divide-y divide-border">
                                                            {filteredMachines.map((m) => (
                                                                <button
                                                                    key={m.id}
                                                                    type="button"
                                                                    onClick={() => setSelectedMachineId(m.id)}
                                                                    className={`w-full text-left p-3 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 ${selectedMachineId === m.id ? "bg-muted/40" : ""
                                                                        }`}
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="font-medium text-foreground truncate">{m.name ?? "—"}</div>
                                                                        <div className="text-xs text-muted-foreground truncate">{m.internal_code ?? "—"}</div>
                                                                    </div>
                                                                    {selectedMachineId === m.id && (
                                                                        <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30">
                                                                            Selezionata
                                                                        </Badge>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                                                    Annulla
                                                </Button>
                                                <Button
                                                    className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                                                    onClick={handleCreateAssignment}
                                                    disabled={assigning || !selectedMachineId}
                                                >
                                                    {assigning ? "Assegnazione..." : "Assegna"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    <Button onClick={handleSave} disabled={saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                        <Save className="w-4 h-4 mr-2" />
                                        {saving ? "Salvataggio..." : "Salva"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
                        </div>

                        <div className="space-y-2">
                            <Label>Descrizione</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={!canEdit} />
                        </div>
                    </CardContent>
                </Card>

                {/* Assignments list */}
                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-foreground">Assegnazioni</CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Template assegnato a macchine (serve per eseguire la checklist)
                                </CardDescription>
                            </div>
                            <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30">
                                {assignments.length}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {assignments.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Nessuna macchina assegnata. Usa “Assegna a macchina”.</div>
                        ) : (
                            assignments.map((a) => (
                                <div
                                    key={a.id}
                                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20"
                                >
                                    <div className="min-w-0">
                                        <div className="font-medium text-foreground truncate">{a.machines?.name ?? "—"}</div>
                                        <div className="text-xs text-muted-foreground truncate">{a.machines?.internal_code ?? a.machine_id}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/checklist/execute?assignmentId=${a.id}`)}
                                            title="Esegui checklist"
                                        >
                                            <Play className="w-4 h-4 mr-2" />
                                            Esegui
                                        </Button>
                                        {canEdit && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                onClick={() => handleDeactivateAssignment(a.id)}
                                                title="Rimuovi assegnazione"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-foreground">Elementi</CardTitle>
                                <CardDescription className="text-muted-foreground">Gestisci i campi della checklist</CardDescription>
                            </div>

                            {canEdit && (
                                <Button variant="outline" onClick={addItem}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Aggiungi
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        {items.map((it) => (
                            <div key={it.id} className="p-4 rounded-xl border border-border bg-background space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Titolo *</Label>
                                            <Input value={it.title} onChange={(e) => updateItem(it.id, "title", e.target.value)} disabled={!canEdit} />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Tipo input</Label>
                                            <select
                                                value={it.input_type}
                                                onChange={(e) => updateItem(it.id, "input_type", e.target.value as any)}
                                                disabled={!canEdit}
                                                className="w-full border border-border bg-background rounded-md px-3 py-2"
                                            >
                                                <option value="boolean">Boolean (OK/KO)</option>
                                                <option value="number">Numero</option>
                                                <option value="text">Testo</option>
                                                <option value="select">Selezione</option>
                                                <option value="photo">Foto</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs text-muted-foreground">Descrizione</Label>
                                            <Input
                                                value={it.description ?? ""}
                                                onChange={(e) => updateItem(it.id, "description", e.target.value as any)}
                                                disabled={!canEdit}
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={it.is_required}
                                                onCheckedChange={(v) => updateItem(it.id, "is_required", Boolean(v) as any)}
                                                disabled={!canEdit}
                                            />
                                            <Label>Obbligatorio</Label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={Boolean(it.metadata?.requiresPhoto)}
                                                onCheckedChange={(v) => toggleRequiresPhoto(it.id, Boolean(v))}
                                                disabled={!canEdit}
                                            />
                                            <Label>Richiede foto</Label>
                                        </div>
                                    </div>

                                    {canEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                            onClick={() => removeItem(it.id)}
                                            title="Rimuovi"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {canEdit && (
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Salvataggio..." : "Salva tutto"}
                        </Button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

