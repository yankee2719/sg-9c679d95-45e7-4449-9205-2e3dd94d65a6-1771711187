import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trash2, Activity, ClipboardList, FileText, History } from "lucide-react";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { DocumentList } from "@/components/Equipment/DocumentList";
import { getEquipmentById, type Equipment } from "@/services/equipmentService";
import { useLanguage } from "@/contexts/LanguageContext";
import { SEO } from "@/components/SEO";

export default function EquipmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useLanguage();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadEquipment(id);
      loadMaintenance(id);
    }
  }, [id]);

  const loadEquipment = async (equipmentId: string) => {
    try {
      const data = await getEquipmentById(equipmentId);
      setEquipment(data);
    } catch (error) {
      console.error("Error loading equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenance = async (equipmentId: string) => {
    try {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("next_due_date", { ascending: true });

      if (!error && data) {
        setMaintenance(data);
      }
    } catch (error) {
      console.error("Error loading maintenance:", error);
    }
  };

  const handleDelete = async () => {
    if (!equipment || !confirm(t("equipment.confirmDelete"))) return;

    try {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", equipment.id);

      if (error) throw error;

      router.push("/equipment");
    } catch (error) {
      console.error("Error deleting equipment:", error);
      alert(t("common.error"));
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">{t("common.loading")}</p>
        </div>
      </MainLayout>
    );
  }

  if (!equipment) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">{t("equipment.notFound")}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEO title={`${equipment.name} - Maint Ops`} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/equipment")}
              className="hover:bg-slate-700 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{equipment.name}</h1>
              <p className="text-slate-400 flex items-center gap-2 mt-1">
                {equipment.equipment_code}
                {equipment.status && (
                  <Badge variant={equipment.status === "active" ? "default" : "secondary"}>
                    {equipment.status}
                  </Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/equipment/edit/${equipment.id}`)}
              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
            >
              <Edit className="h-4 w-4 mr-2" />
              {t("common.edit")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("common.delete")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview Card */}
          <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t("equipment.overview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">{t("equipment.purchaseDate")}</p>
                  <p className="font-medium text-white">
                    {equipment.purchase_date
                      ? new Date(equipment.purchase_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">{t("equipment.location")}</p>
                  <p className="font-medium text-white">{equipment.location || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">{t("equipment.manufacturer")}</p>
                  <p className="text-white font-medium">{equipment.manufacturer || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">{t("equipment.model")}</p>
                  <p className="text-white font-medium">{equipment.model || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">{t("equipment.serialNumber")}</p>
                  <p className="text-white font-medium">{equipment.serial_number || "N/A"}</p>
                </div>
              </div>
              {equipment.technical_specs && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">{t("equipment.technicalSpecs")}</p>
                  <p className="text-white text-sm whitespace-pre-wrap">
                    {typeof equipment.technical_specs === "string"
                      ? equipment.technical_specs
                      : JSON.stringify(equipment.technical_specs, null, 2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code Card - Now takes the right column */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">QR Code</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQR(!showQR)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-primary"
              >
                {showQR ? t("common.hide") : t("common.show")}
              </Button>
            </CardHeader>
            <CardContent className="flex justify-center">
              {showQR ? (
                <QRCodeGenerator 
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/equipment/${equipment.id}`} 
                  size={200}
                  allowCustomLink={true}
                />
              ) : (
                <p className="text-muted-foreground text-sm">{t("common.clickToShow")}</p>
              )}
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="lg:col-span-3 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t("equipment.notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              {equipment.notes ? (
                <p className="text-slate-300 whitespace-pre-wrap">{equipment.notes}</p>
              ) : (
                <p className="text-slate-500">{t("equipment.noNotes")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="maintenance" className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-slate-700">
              <Activity className="h-4 w-4 mr-2" />
              {t("maintenance.title")}
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-slate-700">
              <FileText className="h-4 w-4 mr-2" />
              {t("equipment.documents")}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
              <History className="h-4 w-4 mr-2" />
              {t("equipment.history")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="maintenance">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">{t("maintenance.scheduled")}</CardTitle>
                <Button
                  onClick={() => router.push(`/maintenance/new?equipment=${equipment.id}`)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {t("maintenance.schedule")}
                </Button>
              </CardHeader>
              <CardContent>
                {maintenance.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">{t("maintenance.noScheduled")}</p>
                ) : (
                  <div className="space-y-3">
                    {maintenance.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors"
                        onClick={() => router.push(`/maintenance/${item.id}`)}
                      >
                        <div>
                          <h4 className="font-medium text-white">{item.title}</h4>
                          <p className="text-sm text-slate-400">
                            {item.next_due_date
                              ? new Date(item.next_due_date).toLocaleDateString()
                              : t("common.noDate")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">{t("equipment.documents")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentList equipmentId={equipment.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">{t("equipment.maintenanceHistory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 text-center py-8">{t("equipment.noHistory")}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}