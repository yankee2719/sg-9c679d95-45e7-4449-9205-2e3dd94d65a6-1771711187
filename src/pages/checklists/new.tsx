import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowLeft, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addTemplateItems, ChecklistInputType, createTemplate } from "@/services/checklistService";

interface TemplateItemDraft {
    id: string;
    title: string;
    description: string;
    is_required: boolean;
    order_index: number;
    input_type: ChecklistInputType;
    requires_photo: boolean;
}

let itemIdCounter = 0;
function newItemId() { return `item-${++itemIdCounter}`; }

export default function NewChecklistTemplate() {
    const router = useRouter();
    const { toast } = useToast();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        category: "",
        equipmentType: "",
        description: "",
    });
    const [items, setItems] = useState<TemplateItemDraft[]>([
        { id: "item-0", title: "", description: "", is_required: true, order_index: 0, input_type: "boolean", requires_photo: false },
    ]);

    useEffect(() => { setMounted(true); }, []);

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            { id: newItemId(), title: "", description: "", is_required: true, order_index: prev.length, input_type: "boolean", requires_photo: false },
        ]);
    };

    const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

    const updateItem = <K extends keyof TemplateItemDraft>(id: string, field: K, value: TemplateItemDraft[K]) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!formData.title.trim()) {
                toast({ title: "Errore", description: "Il titolo è obbligatorio", variant: "destructive" });
                return;
            }
            if (!formData.category.trim()) {
                toast({ title: "Errore", description: "La categoria è obbligatoria", variant: "destructive" });
                return;
            }
            const validItems = items.map((it, idx) => ({ ...it, order_index: idx })).filter((it) => it.title.trim().length > 0);
            if (validItems.length === 0) {
                toast({ title: "Errore", description: "Aggiungi almeno un elemento", variant: "destructive" });
                return;
            }

            const tpl = await createTemplate({
                name: formData.title.trim(),
                description: formData.description.trim() || null,
                target_type: "machine",
            });

            // Update with extra fields
            if (formData.category || formData.equipmentType) {
                await supabase.from("checklist_templates").update({
                    category: formData.category.trim() || null,
                    equipment_type: formData.equipmentType.trim() || null,
                }).eq("id", tpl.id);
            }

            await addTemplateItems(
                validItems.map((it) => ({
                    template_id: tpl.id,
                    title: it.title.trim(),
                    description: it.description.trim() || null,
                    input_type: it.input_type,
                    is_required: it.is_required,
                    order_index: it.order_index,
                    metadata: { requiresPhoto: it.requires_photo },
                }))
            );

            toast({ title: "Successo", description: "Checklist creata con successo" });
            router.push("/checklists");
        } catch (error: any) {
            console.error("Error creating checklist:", error);
            toast({ title: "Errore", description: error.message || "Errore durante la creazione", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <MainLayout>
            <div className="container mx-auto py-8 px-4 max-w-3xl">
                <Button variant="ghost" className="mb-6" onClick={() => router.push("/checklists")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                </Button>

                <Card className="bg-card border-border shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-foreground">Nuova Checklist</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Crea un nuovo modello di checklist per le ispezioni
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Titolo */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Titolo *</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="es. Controllo giornaliero pressa"
                                    required
                                    className="bg-muted border-border text-foreground"
                                />
                            </div>

                            {/* Categoria */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Categoria *</Label>
                                <Input
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="es. Manutenzione preventiva"
                                    required
                                    className="bg-muted border-border text-foreground"
                                />
                            </div>

                            {/* Tipo Attrezzatura */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Tipo Attrezzatura</Label>
                                <Input
                                    value={formData.equipmentType}
                                    onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
                                    placeholder="es. Pressa idraulica"
                                    className="bg-muted border-border text-foreground"
                                />
                            </div>

                            {/* Descrizione */}
                            <div className="space-y-2">
                                <Label className="text-foreground">Descrizione</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Descrizione della checklist..."
                                    rows={3}
                                    className="bg-muted border-border text-foreground"
                                />
                            </div>

                            {/* Elementi */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-foreground">Elementi Checklist *</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addItem}
                                        className="border-[#FF6B35]/50 text-[#FF6B35] hover:bg-[#FF6B35]/10 bg-transparent">
                                        <Plus className="mr-2 h-4 w-4" /> Aggiungi Elemento
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {items.map((item, idx) => (
                                        <div key={item.id} className="p-4 border border-border rounded-lg bg-muted/30 space-y-3">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 space-y-3">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground mb-1 block">Titolo elemento *</Label>
                                                        <Input
                                                            value={item.title}
                                                            onChange={(e) => updateItem(item.id, "title", e.target.value)}
                                                            placeholder="es. Controllare livello olio"
                                                            className="bg-muted border-border text-foreground"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground mb-1 block">Descrizione elemento</Label>
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                                            placeholder="Istruzioni dettagliate..."
                                                            className="bg-muted border-border text-foreground"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Tipo input</Label>
                                                            <select
                                                                value={item.input_type}
                                                                onChange={(e) => updateItem(item.id, "input_type", e.target.value as any)}
                                                                className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm"
                                                            >
                                                                <option value="boolean">Boolean (OK/KO)</option>
                                                                <option value="number">Numero</option>
                                                                <option value="text">Testo</option>
                                                                <option value="select">Selezione</option>
                                                                <option value="photo">Foto</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center gap-2 pt-4">
                                                            <Switch
                                                                checked={item.is_required}
                                                                onCheckedChange={(v) => updateItem(item.id, "is_required", v)}
                                                            />
                                                            <Label className="text-foreground text-sm">Campo obbligatorio</Label>
                                                        </div>
                                                        <div className="flex items-center gap-2 pt-4">
                                                            <Switch
                                                                checked={item.requires_photo}
                                                                onCheckedChange={(v) => updateItem(item.id, "requires_photo", v)}
                                                            />
                                                            <Label className="text-foreground text-sm">Richiede foto</Label>
                                                        </div>
                                                    </div>
                                                </div>
                                                {items.length > 1 && (
                                                    <Button type="button" variant="ghost" size="icon"
                                                        onClick={() => removeItem(item.id)}
                                                        className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => router.push("/checklists")}>
                                    Annulla
                                </Button>
                                <Button type="submit" disabled={loading} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                    {loading ? "Salvataggio..." : "Crea Checklist"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
