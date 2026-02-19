import { useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ArrowLeft, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
    id: string;
    title: string;
    description: string;
    is_required: boolean;
    order_index: number;
    images: string[];
}

export default function NewChecklistTemplate() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
    });
    const [items, setItems] = useState < ChecklistItem[] > ([
        {
            id: crypto.randomUUID(),
            title: "",
            description: "",
            is_required: true,
            order_index: 0,
            images: [],
        },
    ]);

    const addItem = () => {
        setItems([
            ...items,
            {
                id: crypto.randomUUID(),
                title: "",
                description: "",
                is_required: true,
                order_index: items.length,
                images: [],
            },
        ]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const updateItem = (id: string, field: keyof ChecklistItem, value: string | boolean) => {
        setItems(items.map((item) => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleImageUpload = async (itemId: string, file: File) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${itemId}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('checklist-images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('checklist-images')
                .createSignedUrl(fileName, 60 * 60 * 24 * 365);

            if (signedUrlError) throw signedUrlError;

            setItems(items.map((item) =>
                item.id === itemId
                    ? { ...item, images: [...item.images, signedUrlData.signedUrl] }
                    : item
            ));

            toast({ title: "Successo", description: "Immagine caricata con successo" });
        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast({ title: "Errore", description: "Errore durante il caricamento dell'immagine", variant: "destructive" });
        }
    };

    const removeImage = async (itemId: string, imageUrl: string) => {
        try {
            const urlParts = imageUrl.split('/');
            const fileName = urlParts[urlParts.length - 1].split('?')[0];
            await supabase.storage.from('checklist-images').remove([fileName]);
            setItems(items.map((item) =>
                item.id === itemId
                    ? { ...item, images: item.images.filter(img => img !== imageUrl) }
                    : item
            ));
        } catch (error) {
            console.error('Error removing image:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.title.trim()) {
                toast({ title: "Errore", description: "Il titolo è obbligatorio", variant: "destructive" });
                setLoading(false);
                return;
            }

            const validItems = items.filter((item) => item.title.trim());
            if (validItems.length === 0) {
                toast({ title: "Errore", description: "Aggiungi almeno un elemento alla checklist", variant: "destructive" });
                setLoading(false);
                return;
            }

            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                toast({ title: "Errore", description: "Devi essere autenticato", variant: "destructive" });
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("default_organization_id")
                .eq("id", user.id)
                .single();

            if (!profile?.default_organization_id) {
                toast({ title: "Errore", description: "Profilo utente non configurato correttamente", variant: "destructive" });
                setLoading(false);
                return;
            }

            const { data: checklist, error: checklistError } = await supabase
                .from("checklists")
                .insert({
                    title: formData.title.trim(),
                    description: formData.description.trim() || null,
                    created_by: user.id,
                    organization_id: profile.default_organization_id,
                    is_template: true,
                    is_active: true,
                })
                .select()
                .single();

            if (checklistError) throw checklistError;

            const itemsToInsert = validItems.map((item, index) => ({
                checklist_id: checklist.id,
                title: item.title.trim(),
                description: item.description.trim() || null,
                is_required: item.is_required,
                order_index: index,
                input_type: "checkbox",
                images: item.images,
            }));

            const { error: itemsError } = await supabase
                .from("checklist_items")
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            toast({ title: "Successo", description: "Checklist creata con successo" });
            router.push("/checklists");
        } catch (error: any) {
            console.error("Error creating checklist template:", error);
            toast({ title: "Errore", description: error.message || "Errore durante la creazione della checklist", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="container mx-auto py-8 px-4 max-w-4xl">
                <Button
                    variant="ghost"
                    className="mb-6 hover:bg-slate-800 text-slate-200"
                    onClick={() => router.push("/checklists")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Indietro
                </Button>

                <Card className="bg-slate-800 border-slate-700 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white">Nuova Checklist</CardTitle>
                        <CardDescription className="text-slate-400">
                            Crea un nuovo modello di checklist per le ispezioni
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-slate-200">Titolo *</Label>
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
                                <Label htmlFor="description" className="text-slate-200">Descrizione</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Descrizione della checklist..."
                                    rows={3}
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-slate-200">Elementi Checklist *</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addItem}
                                        className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10 bg-transparent"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Aggiungi Elemento
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <div key={item.id} className="p-4 border border-slate-700 rounded-lg bg-slate-900/50 space-y-3">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 space-y-3">
                                                    <div>
                                                        <Label htmlFor={`item-title-${item.id}`} className="text-xs text-slate-400 mb-1 block">Titolo elemento *</Label>
                                                        <Input
                                                            id={`item-title-${item.id}`}
                                                            value={item.title}
                                                            onChange={(e) => updateItem(item.id, "title", e.target.value)}
                                                            placeholder="es. Controllare livello olio"
                                                            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`item-desc-${item.id}`} className="text-xs text-slate-400 mb-1 block">Descrizione elemento</Label>
                                                        <Input
                                                            id={`item-desc-${item.id}`}
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                                            placeholder="Istruzioni dettagliate..."
                                                            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-slate-400 mb-2 block">Immagini di riferimento</Label>
                                                        <div className="space-y-2">
                                                            {item.images.length > 0 && (
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    {item.images.map((imageUrl, imgIndex) => (
                                                                        <div key={imgIndex} className="relative group">
                                                                            <img
                                                                                src={imageUrl}
                                                                                alt={`Riferimento ${imgIndex + 1}`}
                                                                                className="w-full h-20 object-cover rounded border border-slate-600"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeImage(item.id, imageUrl)}
                                                                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    id={`image-${item.id}`}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            handleImageUpload(item.id, file);
                                                                            e.target.value = '';
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                                <Label
                                                                    htmlFor={`image-${item.id}`}
                                                                    className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-sm text-slate-300 transition-colors"
                                                                >
                                                                    <Upload className="h-4 w-4" />
                                                                    Carica immagine
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {items.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeItem(item.id)}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 mt-6"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`required-${item.id}`}
                                                    checked={item.is_required}
                                                    onCheckedChange={(checked) => updateItem(item.id, "is_required", checked === true)}
                                                    className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                                />
                                                <Label htmlFor={`required-${item.id}`} className="text-sm font-normal cursor-pointer text-slate-300">
                                                    Campo obbligatorio
                                                </Label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/checklists")}
                                    disabled={loading}
                                    className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white"
                                >
                                    Annulla
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                >
                                    {loading ? "Creazione..." : "Crea Checklist"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
