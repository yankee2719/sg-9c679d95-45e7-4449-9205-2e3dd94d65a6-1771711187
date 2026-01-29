import { useState, useEffect } from "react";
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
      description: "",
      is_required: true,
      order_index: 0,
    },
  ]);

  const categories = [
    "Conveyor Systems",
    "Robotic Arms",
    "CNC Machines",
    "Hydraulic Presses",
    "Assembly Lines",
    "Packaging Equipment",
    "Material Handling",
    "Quality Control",
    "Welding Equipment",
    "Other",
  ];

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
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          equipment_type: formData.equipment_type.trim() || null,
          created_by: user.id,
          is_active: true,
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
          className="mb-6 text-gray-200 hover:text-white hover:bg-gray-700"
          onClick={() => router.push("/checklists")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alle Checklist
        </Button>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Nuovo Template Checklist</CardTitle>
            <CardDescription className="text-gray-300">
              Crea un nuovo template di checklist per le manutenzioni
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-200">Titolo Template *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Es: Checklist Manutenzione Motore"
                  required
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-gray-200">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {categories.map((category) => (
                      <SelectItem 
                        key={category} 
                        value={category}
                        className="text-white hover:bg-gray-600"
                      >
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment_type" className="text-gray-200">Tipo Equipaggiamento</Label>
                <Input
                  id="equipment_type"
                  value={formData.equipment_type}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment_type: e.target.value })
                  }
                  placeholder="Es: Motore Elettrico, Pompa Idraulica"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-200">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descrizione opzionale del template"
                  rows={3}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-200">Elementi Checklist *</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addItem}
                    className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi Elemento
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-3 p-4 border border-gray-600 rounded-lg bg-gray-700/50">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, "description", e.target.value)
                          }
                          placeholder={`Elemento ${index + 1}`}
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
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
                            className="text-sm font-normal cursor-pointer text-gray-300"
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
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
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
                  className="border-gray-600 text-gray-200 hover:bg-gray-700"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
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