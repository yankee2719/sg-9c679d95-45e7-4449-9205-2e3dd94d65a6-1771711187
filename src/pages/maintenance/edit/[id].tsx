import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { maintenanceService } from "@/services/maintenanceService";
import { getAllEquipment } from "@/services/equipmentService";
import { ArrowLeft, Save } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function EditMaintenanceSchedule() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  
  const [schedule, setSchedule] = useState({
    equipment_id: "",
    title: "",
    description: "",
    frequency: "monthly", // Changed from frequency_days number to enum string
    priority: "medium",
    next_maintenance_date: "",
    status: "scheduled" // Changed from is_active boolean to status enum
  });

  useEffect(() => {
    loadEquipment();
    if (id) {
      loadSchedule();
    }
  }, [id]);

  const loadEquipment = async () => {
    try {
      const data = await getAllEquipment();
      setEquipmentList(data);
    } catch (error) {
      console.error("Error loading equipment:", error);
    }
  };

  const loadSchedule = async () => {
    try {
      const data = await maintenanceService.getSchedule(id as string);
      setSchedule({
        equipment_id: data.equipment_id,
        title: data.title || "",
        description: data.description || "",
        frequency: data.frequency || "monthly",
        priority: data.priority || "medium",
        next_maintenance_date: data.next_maintenance_date ? data.next_maintenance_date.split('T')[0] : "",
        status: data.status || "scheduled"
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceService.updateSchedule(id as string, schedule);
      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
      router.push("/maintenance");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MainLayout>Loading...</MainLayout>;

  return (
    <MainLayout>
      <SEO title="Edit Maintenance Schedule" />
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Maintenance Schedule</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Schedule Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="equipment" className="text-white">Equipment</Label>
                <Select 
                  value={schedule.equipment_id} 
                  onValueChange={(value) => setSchedule({...schedule, equipment_id: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {equipmentList.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id} className="text-white hover:bg-gray-700 focus:bg-gray-700">
                        {eq.name} ({eq.equipment_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title" className="text-white">Title</Label>
                <Input 
                  id="title"
                  value={schedule.title}
                  onChange={(e) => setSchedule({...schedule, title: e.target.value})}
                  placeholder="e.g. Monthly Inspection"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description" className="text-white">Description</Label>
                <Textarea 
                  id="description"
                  value={schedule.description}
                  onChange={(e) => setSchedule({...schedule, description: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="frequency" className="text-white">Frequency</Label>
                  <Select 
                    value={schedule.frequency} 
                    onValueChange={(value) => setSchedule({...schedule, frequency: value})}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="daily" className="text-white hover:bg-gray-700 focus:bg-gray-700">Daily</SelectItem>
                      <SelectItem value="weekly" className="text-white hover:bg-gray-700 focus:bg-gray-700">Weekly</SelectItem>
                      <SelectItem value="monthly" className="text-white hover:bg-gray-700 focus:bg-gray-700">Monthly</SelectItem>
                      <SelectItem value="quarterly" className="text-white hover:bg-gray-700 focus:bg-gray-700">Quarterly</SelectItem>
                      <SelectItem value="yearly" className="text-white hover:bg-gray-700 focus:bg-gray-700">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="priority" className="text-white">Priority</Label>
                  <Select 
                    value={schedule.priority} 
                    onValueChange={(value) => setSchedule({...schedule, priority: value})}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="low" className="text-white hover:bg-gray-700 focus:bg-gray-700">Low</SelectItem>
                      <SelectItem value="medium" className="text-white hover:bg-gray-700 focus:bg-gray-700">Medium</SelectItem>
                      <SelectItem value="high" className="text-white hover:bg-gray-700 focus:bg-gray-700">High</SelectItem>
                      <SelectItem value="critical" className="text-white hover:bg-gray-700 focus:bg-gray-700">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date" className="text-white">Next Maintenance Date</Label>
                <Input 
                  id="date"
                  type="date"
                  value={schedule.next_maintenance_date}
                  onChange={(e) => setSchedule({...schedule, next_maintenance_date: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status" className="text-white">Status</Label>
                <Select 
                  value={schedule.status} 
                  onValueChange={(value) => setSchedule({...schedule, status: value})}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="scheduled" className="text-white hover:bg-gray-700 focus:bg-gray-700">Scheduled</SelectItem>
                    <SelectItem value="in_progress" className="text-white hover:bg-gray-700 focus:bg-gray-700">In Progress</SelectItem>
                    <SelectItem value="completed" className="text-white hover:bg-gray-700 focus:bg-gray-700">Completed</SelectItem>
                    <SelectItem value="overdue" className="text-white hover:bg-gray-700 focus:bg-gray-700">Overdue</SelectItem>
                    <SelectItem value="cancelled" className="text-white hover:bg-gray-700 focus:bg-gray-700">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}