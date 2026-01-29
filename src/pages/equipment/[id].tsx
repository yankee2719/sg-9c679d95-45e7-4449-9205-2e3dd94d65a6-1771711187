import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getEquipmentById, deleteEquipment, type Equipment } from "@/services/equipmentService";
import { maintenanceService } from "@/services/maintenanceService";
import { ArrowLeft, Edit, Trash2, Calendar, FileText, Activity } from "lucide-react";
import { SEO } from "@/components/SEO";
import { DocumentUpload } from "@/components/Equipment/DocumentUpload";

export default function EquipmentDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const eqData = await getEquipmentById(id as string);
      // Cast the status to the correct type to satisfy TypeScript
      const typedEquipment = {
        ...eqData,
        status: eqData.status as "active" | "under_maintenance" | "out_of_service",
        technical_specs: (eqData.technical_specs as unknown as Record<string, any>) || null
      };
      setEquipment(typedEquipment);
      
      // Load schedules logic would go here if we need to filter by equipment
      // For now just load all or implementing getByEquipmentId in service would be better
      // const schedData = await maintenanceService.getByEquipmentId(id as string);
      // setSchedules(schedData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load equipment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this equipment?")) return;
    try {
      await deleteEquipment(id as string);
      toast({
        title: "Success",
        description: "Equipment deleted successfully",
      });
      router.push("/equipment");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete equipment",
        variant: "destructive",
      });
    }
  };

  if (loading) return <MainLayout>Loading...</MainLayout>;
  if (!equipment) return <MainLayout>Equipment not found</MainLayout>;

  return (
    <MainLayout>
      <SEO title={equipment.name} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{equipment.name}</h1>
              <div className="flex items-center gap-2 text-gray-500">
                <span>{equipment.equipment_code}</span>
                <span>•</span>
                <span>{equipment.category}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/equipment/edit/${equipment.id}`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={equipment.status === 'active' ? 'default' : 'secondary'}>
                      {equipment.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="mt-1">{equipment.location || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Manufacturer</label>
                  <p className="mt-1">{equipment.manufacturer || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Model</label>
                  <p className="mt-1">{equipment.model || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Serial Number</label>
                  <p className="mt-1">{equipment.serial_number || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Installation Date</label>
                  <p className="mt-1">{equipment.installation_date || "N/A"}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="maintenance">
              <TabsList>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="maintenance" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Scheduled Maintenance</h3>
                  <Button size="sm" onClick={() => router.push(`/maintenance/new?equipment=${equipment.id}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </div>
                {/* Maintenance list would go here */}
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  No scheduled maintenance found
                </div>
              </TabsContent>
              
              <TabsContent value="documents">
                <DocumentUpload 
                  equipmentId={equipment.id} 
                  onUploadComplete={() => {
                    toast({ title: "Success", description: "Document uploaded" });
                  }}
                />
              </TabsContent>
              
              <TabsContent value="history">
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  No history available
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline" onClick={() => router.push(`/maintenance/new?equipment=${equipment.id}`)}>
                  <Activity className="mr-2 h-4 w-4" />
                  Report Issue
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={() => router.push(`/checklist/execute?equipment=${equipment.id}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Start Inspection
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {equipment.notes || "No notes available."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}