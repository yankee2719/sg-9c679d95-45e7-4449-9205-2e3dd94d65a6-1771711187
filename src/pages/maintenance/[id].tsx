import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { maintenanceService } from "@/services/maintenanceService";
import { ArrowLeft, Edit, Trash2, Calendar, Clock, CheckCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function MaintenanceScheduleDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSchedule();
    }
  }, [id]);

  const loadSchedule = async () => {
    try {
      const data = await maintenanceService.getSchedule(id as string);
      setSchedule(data);
    } catch (error) {
      console.error("Error loading schedule:", error);
      toast({
        title: "Error",
        description: "Failed to load schedule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await maintenanceService.deleteSchedule(id as string);
      toast({
        title: "Success",
        description: "Schedule deleted successfully",
      });
      router.push("/maintenance");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      });
    }
  };

  if (loading) return <MainLayout>Loading...</MainLayout>;
  if (!schedule) return <MainLayout>Schedule not found</MainLayout>;

  return (
    <MainLayout>
      <SEO title={schedule.title || "Maintenance Schedule"} />
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{schedule.title || "Maintenance Schedule"}</h1>
              <p className="text-gray-500">
                Equipment: {schedule.equipment?.name} ({schedule.equipment?.equipment_code})
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/maintenance/edit/${schedule.id}`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-500">Status</span>
                <Badge variant={schedule.is_active ? "default" : "secondary"}>
                  {schedule.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-500">Priority</span>
                <Badge variant="outline" className="capitalize">
                  {schedule.priority}
                </Badge>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-500">Frequency</span>
                <span>Every {schedule.frequency_days} days</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-500">Next Due</span>
                <span className="font-medium text-blue-600">
                  {new Date(schedule.next_maintenance_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-500">Last Performed</span>
                <span>
                  {schedule.last_maintenance_date 
                    ? new Date(schedule.last_maintenance_date).toLocaleDateString() 
                    : "Never"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 whitespace-pre-wrap">
                {schedule.description || "No description provided."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-6">
          <Button size="lg" className="w-full md:w-auto" onClick={() => router.push(`/checklist/execute?schedule=${schedule.id}&equipment=${schedule.equipment_id}`)}>
            <CheckCircle className="mr-2 h-5 w-5" />
            Perform Maintenance Now
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}