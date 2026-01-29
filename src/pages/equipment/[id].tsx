import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trash2, Activity, ClipboardList, FileText, History } from "lucide-react";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { DocumentList } from "@/components/Equipment/DocumentList";
import { getEquipmentById, type Equipment } from "@/services/equipmentService";
import { getMaintenanceByEquipment } from "@/services/maintenanceService";
import type { Database } from "@/integrations/supabase/types";

type MaintenanceSchedule = Database["public"]["Tables"]["maintenance_schedules"]["Row"];

export default function EquipmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);
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
      const data = await getMaintenanceByEquipment(equipmentId);
      setMaintenance(data);
    } catch (error) {
      console.error("Error loading maintenance:", error);
    }
  };

  const handleDelete = async () => {
    if (!equipment || !confirm("Are you sure you want to delete this equipment?")) return;
    router.push("/equipment");
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!equipment) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Equipment not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/equipment")}
              className="hover:bg-slate-700"
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
              onClick={() => setShowQR(!showQR)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-700"
            >
              {showQR ? "Hide" : "Show"} QR Generator
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/equipment/edit/${equipment.id}`)}
              className="hover:bg-slate-700 border-slate-600"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview Card */}
          <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <Badge variant={equipment.status === "active" ? "default" : "secondary"} className="mt-1">
                    {equipment.status || "N/A"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Location</p>
                  <p className="text-white font-medium">{equipment.location || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Manufacturer</p>
                  <p className="text-white font-medium">{equipment.manufacturer || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Model</p>
                  <p className="text-white font-medium">{equipment.model || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Serial Number</p>
                  <p className="text-white font-medium">{equipment.serial_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Installation Date</p>
                  <p className="text-white font-medium">
                    {equipment.installation_date
                      ? new Date(equipment.installation_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
              {equipment.technical_specs && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Technical Specifications</p>
                  <p className="text-white text-sm whitespace-pre-wrap">
                    {typeof equipment.technical_specs === "string"
                      ? equipment.technical_specs
                      : JSON.stringify(equipment.technical_specs, null, 2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start hover:bg-slate-700 border-slate-600"
                onClick={() => router.push(`/maintenance/new?equipment=${equipment.id}`)}
              >
                <Activity className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start hover:bg-slate-700 border-slate-600"
                onClick={() => router.push(`/checklist/new?equipment=${equipment.id}`)}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Start Inspection
              </Button>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {showQR && (
            <Card className="lg:col-span-3 bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">QR Code Generator</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <QRCodeGenerator value={equipment.equipment_code || equipment.id} size={256} />
              </CardContent>
            </Card>
          )}

          <Card className="lg:col-span-3 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {equipment.notes ? (
                <p className="text-slate-300 whitespace-pre-wrap">{equipment.notes}</p>
              ) : (
                <p className="text-slate-500">No notes available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="maintenance" className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-slate-700">
              <Activity className="h-4 w-4 mr-2" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-slate-700">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="maintenance">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Scheduled Maintenance</CardTitle>
                <Button
                  onClick={() => router.push(`/maintenance/new?equipment=${equipment.id}`)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Schedule
                </Button>
              </CardHeader>
              <CardContent>
                {maintenance.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No scheduled maintenance found</p>
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
                            {item.next_maintenance_date
                              ? new Date(item.next_maintenance_date).toLocaleDateString()
                              : "No date"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            item.status === "completed"
                              ? "default"
                              : item.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {item.status}
                        </Badge>
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
                <CardTitle className="text-white">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentList equipmentId={equipment.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Maintenance History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 text-center py-8">No history available</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}