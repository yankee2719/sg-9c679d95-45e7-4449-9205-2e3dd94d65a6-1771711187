import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus, Trash2, Upload, X } from "lucide-react";
import { checklistService } from "@/services/checklistService";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id?: string;
  title: string;
  description?: string;
  is_required?: boolean;
  images?: string[];
}

export default function EditChecklist() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<any>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadChecklist(id);
    }
  }, [id]);

  const loadChecklist = async (checklistId: string) => {
    try {
      const data = await checklistService.getChecklistById(checklistId);
      setChecklist(data);
      if (data?.items) {
        setItems(data.items);
      }
    } catch (error) {
      console.error("Error loading checklist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      const itemId = items[index].id || `temp-${index}`;
      const fileExt = file.name.split('.').pop();
      const fileName = `${itemId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('checklist-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('checklist-images')
        .getPublicUrl(filePath);

      const newItems = [...items];
      newItems[index].images = [...(newItems[index].images || []), publicUrl];
      setItems(newItems);

      toast({
        title: t("common.success"),
        description: "Immagine caricata con successo",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: t("common.error"),
        description: "Errore durante il caricamento dell'immagine",
        variant: "destructive",
      });
    }
  };

  const removeImage = (itemIndex: number, imageUrl: string) => {
    const newItems = [...items];
    newItems[itemIndex].images = newItems[itemIndex].images?.filter(img => img !== imageUrl) || [];
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { title: "", description: "", is_required: false, images: [] }]);
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
      await checklistService.updateChecklist(checklist.id, {
        name: checklist.name,
        description: checklist.description,
        is_active: checklist.is_active
      });
      router.push("/checklists");
    } catch (error) {
      console.error("Error updating checklist:", error);
      alert(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MainLayout><div className="text-white">{t("common.loading")}</div></MainLayout>;
  if (!checklist) return <MainLayout><div className="text-white">{t("checklists.notFound")}</div></MainLayout>;

  return (
    <MainLayout>
      <SEO title={`${t("common.edit")} ${checklist.name}`} />
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">{t("common.edit")}: {checklist.name}</h1>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">{t("checklists.details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-white">{t("common.name")}</Label>
              <Input 
                id="name"
                value={checklist.name || ""}
                onChange={(e) => setChecklist({...checklist, name: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-white">{t("common.description")}</Label>
              <Textarea 
                id="description"
                value={checklist.description || ""}
                onChange={(e) => setChecklist({...checklist, description: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">{t("checklists.items")}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10 bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              {t("checklists.addItem")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-start p-4 border border-slate-600 rounded-lg bg-slate-700/50">
                <div className="flex-1 space-y-4">
                  <Input 
                    placeholder={t("checklists.itemTitle")}
                    value={item.title || ""}
                    onChange={(e) => handleItemChange(index, "title", e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <Input 
                    placeholder={t("checklists.itemDescription")}
                    value={item.description || ""}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <div>
                    <Label className="text-xs text-slate-400 mb-2 block">Immagini di riferimento</Label>
                    <div className="space-y-2">
                      {item.images && item.images.length > 0 && (
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
                                onClick={() => removeImage(index, imageUrl)}
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
                          id={`image-${index}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(index, file);
                              e.target.value = '';
                            }
                          }}
                          className="hidden"
                        />
                        <Label
                          htmlFor={`image-${index}`}
                          className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-sm text-slate-300 transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          Carica immagine
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={item.is_required || false}
                      onCheckedChange={(checked) => handleItemChange(index, "is_required", checked)}
                    />
                    <Label className="text-slate-300">{t("checklists.required")}</Label>
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
          <Button type="button" variant="outline" onClick={() => router.back()} className="bg-transparent border-slate-600 text-white hover:bg-slate-700 hover:text-white">{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
            <Save className="mr-2 h-4 w-4" />
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}