import { useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { checklistService, type ChecklistItem } from "@/services/checklistService";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function NewChecklistTemplate() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [template, setTemplate] = useState({
    title: "",
    description: "",
    category: "General",
    equipment_type: "",
    is_active: true
  });

  const [items, setItems] = useState<Partial<ChecklistItem>[]>([
    { description: "", is_required: false, requires_photo: false, requires_note: false }
  ]);

  const handleAddItem = () => {
    setItems([...items, { description: "", is_required: false, requires_photo: false, requires_note: false }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template.title) {
      toast({
        title: "Error",
        description: "Template title is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await checklistService.createTemplate(template, items);
      toast({
        title: "Success",
        description: "Template created successfully",
      });
      router.push("/checklists");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <SEO title="New Checklist Template" />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">New Checklist Template</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title"
                  value={template.title}
                  onChange={(e) => setTemplate({...template, title: e.target.value})}
                  placeholder="e.g. Daily Forklift Inspection"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input 
                  id="category"
                  value={template.category}
                  onChange={(e) => setTemplate({...template, category: e.target.value})}
                  placeholder="e.g. Safety"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={template.description}
                  onChange={(e) => setTemplate({...template, description: e.target.value})}
                  placeholder="Brief description of this checklist..."
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
                <div key={index} className="flex gap-4 items-start p-4 border rounded-lg bg-gray-50/50">
                  <div className="flex-1 space-y-4">
                    <Input 
                      placeholder={`Item ${index + 1} description`}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    />
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={item.is_required}
                          onCheckedChange={(checked) => handleItemChange(index, "is_required", checked)}
                        />
                        <Label>Required</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={item.requires_photo}
                          onCheckedChange={(checked) => handleItemChange(index, "requires_photo", checked)}
                        />
                        <Label>Photo Required</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          checked={item.requires_note}
                          onCheckedChange={(checked) => handleItemChange(index, "requires_note", checked)}
                        />
                        <Label>Note Required</Label>
                      </div>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}