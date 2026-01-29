import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
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
  description: string;
  is_required: boolean;
  order_index: number;
}

interface EquipmentCategory {
  id: string;
  name: string;
  description: string | null;
}

export default function NewChecklistTemplate() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
  });
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      is_required: true,
      order_index: 0,
    },
  ]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment_categories")
        .select("id, name, description")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le categorie",
        variant: "destructive",
      });
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
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
      // Validation
      if (!formData.name.trim()) {
        toast({
          title: "Errore",
          description: "Il nome del template è obbligatorio",
          variant: "destructive",
        });
        return;
      }

      if (!formData.category_id) {
        toast({
          title: "Errore",
          description: "Seleziona una categoria",
          variant: "destructive",
        });
        return;
      }

      const validItems = items.filter((item) => item.description.trim());
      if (validItems.length === 0) {
        toast({
          title: "Errore",
          description: "Aggiungi almeno un elemento alla checklist",
          variant: "destructive",
        });
        return;
      }

      // Get current user
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

      // Create checklist template
      const { data: template, error: templateError } = await supabase
        .from("checklist_templates")
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category_id: formData.category_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create checklist items
      const itemsToInsert = validItems.map((item, index) => ({
        template_id: template.id,
        description: item.description.trim(),
        is_required: item.is_required,
        order_index: index,
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
    } catch (error: unknown) {
      console.error("Error creating checklist template:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
      toast({
        title: "Errore",
        description: `Impossibile creare il template: ${errorMessage}`,
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
          className="mb-6"
          onClick={() => router.push("/checklists")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alle Checklist
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Nuovo Template Checklist</CardTitle>
            <CardDescription>
              Crea un nuovo template di checklist per le manutenzioni
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Es: Checklist Manutenzione Motore"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descrizione opzionale del template"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Elementi Checklist *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi Elemento
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, "description", e.target.value)
                          }
                          placeholder={`Elemento ${index + 1}`}
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`required-${item.id}`}
                            checked={item.is_required}
                            onCheckedChange={(checked) =>
                              updateItem(item.id, "is_required", checked === true)
                            }
                          />
                          <Label
                            htmlFor={`required-${item.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            Obbligatorio
                          </Label>
                        </div>
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/checklists")}
                  disabled={loading}
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={loading}>
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