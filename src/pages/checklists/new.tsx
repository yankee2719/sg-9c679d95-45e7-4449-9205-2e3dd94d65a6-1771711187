import { useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  is_required: boolean;
  order_index: number;
}

export default function NewChecklistTemplate() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    equipment_type: "",
  });
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      is_required: true,
      order_index: 0,
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
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ChecklistItem, value: string | boolean) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        toast({
          title: "Errore",
          description: "Il titolo del template è obbligatorio",
          variant: "destructive",
        });
        return;
      }

      if (!formData.category) {
        toast({
          title: "Errore",
          description: "Seleziona una categoria",
          variant: "destructive",
        });
        return;
      }

      // Validate items
      const validItems = items.filter((item) => item.title.trim());
      if (validItems.length === 0) {
        toast({
          title: "Errore",
          description: "Aggiungi almeno un elemento valido (con titolo) alla checklist",
          variant: "destructive",
        });
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Errore",
          description: "Devi essere autenticato",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      // 1. Create Checklist Template
      const { data: template, error: templateError } = await supabase
        .from("checklists") // Updated table name
        .insert({
          name: formData.title.trim(), // 'name' in new schema, not 'title'
          description: formData.description.trim() || null,
          category: formData.category,
          equipment_category: formData.equipment_type.trim() || null, // 'equipment_category' in new schema
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // 2. Create Checklist Items
      const itemsToInsert = validItems.map((item, index) => ({
        checklist_id: template.id,
        title: item.title.trim(),
        description: item.description.trim() || null,
        is_required: item.is_required,
        order_index: index,
        input_type: "checkbox" // Default input type for now
      }));

      const { error: itemsError } = await supabase
        .from("checklist_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Successo",
        description: "Template checklist creato con successo",
      });

      router.push("/checklists");
    } catch (error: any) {
      console.error("Error creating checklist template:", error);
      toast({
        title: "Errore",
        description: `Impossibile creare il template: ${error.message || "Errore sconosciuto"}`,
        variant: "destructive",
      });
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
          Torna alle Checklist
        </Button>

        <Card className="bg-slate-800 border-slate-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Nuovo Template Checklist</CardTitle>
            <CardDescription className="text-slate-400">
              Crea un nuovo template di checklist per le manutenzioni
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-200">
                  Titolo Template *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Es: Checklist Manutenzione Motore"
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-500"
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-slate-200">
                  Categoria *
                </Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Es: Meccanica, Elettrica, Idraulica"
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment_type" className="text-slate-200">
                  Tipo Equipaggiamento
                </Label>
                <Input
                  id="equipment_type"
                  value={formData.equipment_type}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment_type: e.target.value })
                  }
                  placeholder="Es: Motore Elettrico, Pompa Idraulica"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-200">
                  Descrizione
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descrizione opzionale del template"
                  rows={3}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-500"
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
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 border border-slate-700 rounded-lg bg-slate-900/50 space-y-3">
                      <div className="flex justify-between items-start gap-3">
                         <div className="flex-1 space-y-3">
                            <div>
                                <Label htmlFor={`item-title-${item.id}`} className="text-xs text-slate-400 mb-1 block">Titolo Voce *</Label>
                                <Input
                                    id={`item-title-${item.id}`}
                                    value={item.title}
                                    onChange={(e) => updateItem(item.id, "title", e.target.value)}
                                    placeholder="Es: Controllare livello olio"
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <Label htmlFor={`item-desc-${item.id}`} className="text-xs text-slate-400 mb-1 block">Descrizione (Opzionale)</Label>
                                <Input
                                    id={`item-desc-${item.id}`}
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                    placeholder="Dettagli aggiuntivi..."
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-500 text-sm"
                                />
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
                            onCheckedChange={(checked) =>
                              updateItem(item.id, "is_required", checked === true)
                            }
                            className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                          <Label
                            htmlFor={`required-${item.id}`}
                            className="text-sm font-normal cursor-pointer text-slate-300"
                          >
                            Campo Obbligatorio
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
                  className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {loading ? "Creazione..." : "Crea Template"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}