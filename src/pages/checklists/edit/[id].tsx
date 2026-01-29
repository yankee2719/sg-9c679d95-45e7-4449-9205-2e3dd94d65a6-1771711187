import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { getChecklistById, updateChecklist, type ChecklistWithItems } from "@/services/checklistService";
import type { Database } from "@/integrations/supabase/types";
import { SEO } from "@/components/SEO";

type ChecklistItem = Database["public"]["Tables"]["checklist_items"]["Row"];

export default function EditChecklist() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistWithItems | null>(null);
  const [items, setItems] = useState<Partial<ChecklistItem>[]>([]);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadChecklist(id);
    }
  }, [id]);

  const loadChecklist = async (checklistId: string) => {
    try {
      const data = await getChecklistById(checklistId);
      setChecklist(data);
      if (data.items) {
        setItems(data.items);
      }
    } catch (error) {
      console.error("Error loading checklist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { title: "", description: "", is_required: false }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!checklist) return;

    try {
      setSaving(true);
      await updateChecklist(checklist.id, {
        name: checklist.name,
        description: checklist.description,
        category: checklist.category
      });
      router.push("/checklists");
    } catch (error) {
      console.error("Error updating checklist:", error);
      alert("Failed to update checklist");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MainLayout>Loading...</MainLayout>;
  if (!checklist) return <MainLayout>Checklist not found</MainLayout>;

  return (
    <MainLayout>
      <SEO title={`Edit ${checklist.name}`} />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Edit: {checklist.name}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Checklist Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-white">Name</Label>
              <Input 
                id="name"
                value={checklist.name}
                onChange={(e) => setChecklist({...checklist, name: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category" className="text-white">Category</Label>
              <Input 
                id="category"
                value={checklist.category || ""}
                onChange={(e) => setChecklist({...checklist, category: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea 
                id="description"
                value={checklist.description || ""}
                onChange={(e) => setChecklist({...checklist, description: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Checklist Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-start p-4 border border-gray-600 rounded-lg bg-gray-800/50">
                <div className="flex-1 space-y-4">
                  <Input 
                    placeholder="Item title"
                    value={item.title || ""}
                    onChange={(e) => handleItemChange(index, "title", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                  <Input 
                    placeholder="Item description (optional)"
                    value={item.description || ""}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={item.is_required || false}
                      onCheckedChange={(checked) => handleItemChange(index, "is_required", checked)}
                    />
                    <Label className="text-gray-300">Required</Label>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}