import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Building2, Factory } from "lucide-react";
import { createEquipment } from "@/services/equipmentService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { useLanguage } from "@/contexts/LanguageContext";

interface Plant {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  plant_id: string;
}

export default function NewEquipment() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

  // Plants & departments
  const [plants, setPlants] = useState < Plant[] > ([]);
  const [departments, setDepartments] = useState < Department[] > ([]);
  const [filteredDepartments, setFilteredDepartments] = useState < Department[] > ([]);

  const [formData, setFormData] = useState({
    name: "",
    equipment_code: "",
    category: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    location: "",
    status: "active" as "active" | "inactive" | "under_maintenance" | "retired",
    technical_specs: "",
    notes: "",
    plant_id: "",
    department_id: "",
  });

  // Load plants & departments
  useEffect(() => {
    const loadHierarchy = async () => {
      const { data: plantsData } = await supabase
        .from("plants")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (plantsData) setPlants(plantsData);

      const { data: deptsData } = await supabase
        .from("departments")
        .select("id, name, plant_id")
        .eq("is_active", true)
        .order("name");
      if (deptsData) setDepartments(deptsData);
    };
    loadHierarchy();
  }, []);

  // Filter departments when plant changes
  useEffect(() => {
    if (formData.plant_id) {
      setFilteredDepartments(departments.filter(d => d.plant_id === formData.plant_id));
    } else {
      setFilteredDepartments([]);
    }
    // Reset department if plant changes
    setFormData(prev => ({ ...prev, department_id: "" }));
  }, [formData.plant_id, departments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createEquipment({
        name: formData.name.trim(),
        equipment_code: formData.equipment_code.trim(),
        category: formData.category.trim() || null,
        status: formData.status,
        location: formData.location.trim() || null,
        purchase_date: formData.purchase_date || null,
        manufacturer: formData.manufacturer.trim() || null,
        model: formData.model.trim() || null,
        serial_number: formData.serial_number.trim() || null,
        technical_specs: formData.technical_specs.trim() || null,
        notes: formData.notes.trim() || null,
        plant_id: formData.plant_id || null,
        department_id: formData.department_id || null,
      });

      toast({
        title: t("common.success"),
        description: t("equipment.saveEquipment"),
      });

      router.push("/equipment");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("common.error");
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/equipment")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-white">{t("equipment.new")}</h1>
          </div>
          <Button onClick={() => setShowQRGenerator(!showQRGenerator)}>
            {showQRGenerator ? t("equipment.hideQR") : t("equipment.showQR")}
          </Button>
        </div>

        {showQRGenerator && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t("equipment.qrGenerator")}</CardTitle>
            </CardHeader>
            <CardContent>
              <QRCodeGenerator value={formData.equipment_code || "new-equipment"} allowCustomLink />
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">{t("equipment.information")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">{t("equipment.name")} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_code" className="text-white">{t("equipment.code")} *</Label>
                  <Input
                    id="equipment_code"
                    value={formData.equipment_code}
                    onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>

                {/* Stabilimento */}
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Stabilimento
                  </Label>
                  <Select
                    value={formData.plant_id}
                    onValueChange={(value) => setFormData({ ...formData, plant_id: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Seleziona stabilimento..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {plants.map((plant) => (
                        <SelectItem key={plant.id} value={plant.id} className="text-white">
                          {plant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reparto */}
                <div className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    <Factory className="w-4 h-4 text-amber-400" />
                    Reparto
                  </Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                    disabled={!formData.plant_id || filteredDepartments.length === 0}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder={
                        !formData.plant_id
                          ? "Seleziona prima uno stabilimento"
                          : filteredDepartments.length === 0
                            ? "Nessun reparto disponibile"
                            : "Seleziona reparto..."
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {filteredDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id} className="text-white">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-white">{t("equipment.category")}</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer" className="text-white">{t("equipment.manufacturer")}</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model" className="text-white">{t("equipment.model")}</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial_number" className="text-white">{t("equipment.serialNumber")}</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase_date" className="text-white">{t("equipment.purchaseDate")}</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-white">{t("equipment.location")}</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-white">{t("equipment.status")}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive" | "under_maintenance" | "retired") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="active" className="text-white">{t("equipment.active")}</SelectItem>
                      <SelectItem value="inactive" className="text-white">{t("equipment.inactive")}</SelectItem>
                      <SelectItem value="under_maintenance" className="text-white">{t("equipment.maintenance")}</SelectItem>
                      <SelectItem value="retired" className="text-white">{t("equipment.decommissioned")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technical_specs" className="text-white">{t("equipment.technicalSpecs")}</Label>
                <Textarea
                  id="technical_specs"
                  value={formData.technical_specs}
                  onChange={(e) => setFormData({ ...formData, technical_specs: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                  placeholder={t("equipment.technicalSpecsPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-white">{t("common.notes")}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                  placeholder={t("equipment.notesPlaceholder")}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/equipment")}
                  className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? t("equipment.saving") : t("equipment.saveEquipment")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
