import { useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { checklistService } from "@/services/checklistService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, Plus, Trash2 } from "lucide-react";

interface ChecklistItem {
  title: string;
  description: string;
  is_required: boolean;
  order_index: number;
}

export default function NewChecklistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true
  });
  const [items, setItems] = useState<ChecklistItem[]>([
    { title: "", description: "", is_required: true, order_index: 0 }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const template = await checklistService.createTemplate({
        name: formData.name,
        description: formData.description || null,
        is_active: formData.is_active
      });

      // Create checklist items
      for (const item of items) {
        if (item.title.trim()) {
          await checklistService.createItem({
            template_id: template.id,
            description: item.title + (item.description ? `\n${item.description}` : ""),
            item_type: item.is_required ? "required" : "optional",
            order_index: item.order_index
          });
        }
      }

      router.push("/checklists");
    } catch (error) {
      console.error("Error creating checklist:", error);
      alert("Errore durante la creazione del template");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { title: "", description: "", is_required: true, order_index: items.length }
    ]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.map((item, i) => ({ ...item, order_index: i })));
  };

  const updateItem = (index: number, field: keyof ChecklistItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  return (
    <MainLayout userRole="admin">
      <SEO title="Nuovo Template Checklist - Industrial Maintenance" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <h1 className="text-2xl font-bold">Nuovo Template Checklist</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Es. Manutenzione Pressa Idraulica"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descrizione del template..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_active: checked as boolean })
                  }
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Template attivo
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items Checklist</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item {index + 1}</span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Titolo *</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(index, "title", e.target.value)}
                      placeholder="Es. Verificare livello olio"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrizione</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      rows={2}
                      placeholder="Dettagli opzionali..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={item.is_required}
                      onCheckedChange={(checked) => 
                        updateItem(index, "is_required", checked as boolean)
                      }
                    />
                    <Label className="cursor-pointer">
                      Controllo obbligatorio
                    </Label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salva Template
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}