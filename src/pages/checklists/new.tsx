import { useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addTemplateItems, ChecklistInputType, createTemplate } from "@/services/checklistService";

interface TemplateItemDraft {
    id: string;
    title: string;
    description: string;
    is_required: boolean;
    order_index: number;
    input_type: ChecklistInputType;
    requires_photo: boolean; // stored in metadata
}

export default function NewChecklistTemplate() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ title: "", description: "" });

    const [items, setItems] = useState < TemplateItemDraft[] > ([
        {
            id: crypto.randomUUID(),
            title: "",
            description: "",
            is_required: true,
            order_index: 0,
            input_type: "boolean",
            requires_photo: false,
        },
    ]);

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                title: "",
                description: "",
                is_required: true,
                order_index: prev.length,
                input_type: "boolean",
                requires_photo: false,
            },
        ]);
    };

    const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

    const updateItem = <K extends keyof TemplateItemDraft>(
        id: string,
        field: K,
        value: TemplateItemDraft[K]
    ) => {
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

            const validItems = items
                .map((it, idx) => ({ ...it, order_index: idx }))
                .filter((it) => it.title.trim().length > 0);

            if (validItems.length === 0) {
                toast({ title: "Errore", description: "Aggiungi almeno un elemento", variant: "destructive" });
                return;
            }

            // 1) create template
            const tpl = await createTemplate({
                name: formData.title.trim(),
                description: formData.description.trim() || null,
                target_type: "machine",
            });

            // 2) create items
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

            toast({ title: "Successo", description: "Template creato con successo" });
            router.push("/checklists");
        } catch (error: any) {
            console.error("Error creating checklist template:", error);
            toast({
                title: "Errore",
                description: error.message || "Errore durante la creazione del template",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="container mx-auto py-8 px-4 max-w-4xl">
                <Button variant="ghost" className="mb-6" onClick={() => router.push("/checklists")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Indietro
                </Button>

                <Card className="bg-slate-800 border-slate-700 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white">Nuovo Template Checklist</CardTitle>
                        <CardDescription className="text-slate-400">
                            Crea un modello riutilizzabile per ispezioni/manutenzioni
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-slate-200">
                                    Titolo *
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="es. Controllo giornaliero pressa"
                                    required
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-slate-200">
                                    Descrizione
                                </Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Descrizione..."
                                    rows={3}
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-slate-200">Elementi *</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addItem}
                                        className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10 bg-transparent"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Aggiungi
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-4 border border-slate-700 rounded-lg bg-slate-900/50 space-y-3"
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 space-y-3">
                                                    <div>
                                                        <Label className="text-xs text-slate-400 mb-1 block">Titolo elemento *</Label>
                                                        <Input
                                                            value={item.title}
                                                            onChange={(e) => updateItem(item.id, "title", e.target.value)}
                                                            placeholder="es. Controllare livello olio"
                                                            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label className="text-xs text-slate-400 mb-1 block">Descrizione</Label>
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                                            placeholder="note/criteri..."
                                                            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-slate-400">Tipo input</Label>
                                                            <select
                                                                value={item.input_type}
                                                                onChange={(e) => updateItem(item.id, "input_type", e.target.value as any)}
                                                                className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2"
                                                            >
                                                                <option value="boolean">Boolean (OK/KO)</option>
                                                                <option value="number">Numero</option>
                                                                <option value="text">Testo</option>
                                                                <option value="select">Selezione</option>
                                                                <option value="photo">Foto</option>
                                                            </select>
                                                        </div>

                                                        <div className="flex items-center gap-2 pt-6">
                                                            <Checkbox
                                                                checked={item.is_required}
                                                                onCheckedChange={(v) => updateItem(item.id, "is_required", Boolean(v))}
                                                            />
                                                            <Label className="text-slate-200">Obbligatorio</Label>
                                                        </div>

                                                        <div className="flex items-center gap-2 pt-6">
                                                            <Checkbox
                                                                checked={item.requires_photo}
                                                                onCheckedChange={(v) => updateItem(item.id, "requires_photo", Boolean(v))}
                                                            />
                                                            <Label className="text-slate-200">Richiede foto</Label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                                    title="Rimuovi"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => router.push("/checklists")}>
                                    Annulla
                                </Button>
                                <Button type="submit" disabled={loading} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                    {loading ? "Salvataggio..." : "Crea Template"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}

