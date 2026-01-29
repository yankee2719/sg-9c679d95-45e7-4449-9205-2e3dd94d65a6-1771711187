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
import { equipmentService } from "@/services/equipmentService";
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
    frequency_days: 30,
    priority: "medium",
    next_maintenance_date: "",
    is_active: true
  });

  useEffect(() => {
    loadEquipment();
    if (id) {
      loadSchedule();
    }
  }, [id]);

  const loadEquipment = async () => {
    try {
      const data = await equipmentService.getAll();
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
        frequency_days: data.frequency_days || 30,
        priority: data.priority || "medium",
        next_maintenance_date: data.next_maintenance_date ? data.next_maintenance_date.split('T')[0] : "",
        is_active: data.is_active
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
                <Label htmlFor="equipment">Equipment</Label>
                <Select 
                  value={schedule.equipment_id} 
                  onValueChange={(value) => setSchedule({...schedule, equipment_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentList.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} ({eq.equipment_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title"
                  value={schedule.title}
                  onChange={(e) => setSchedule({...schedule, title: e.target.value})}
                  placeholder="e.g. Monthly Inspection"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={schedule.description}
                  onChange={(e) => setSchedule({...schedule, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="frequency">Frequency (Days)</Label>
                  <Input 
                    id="frequency"
                    type="number"
                    value={schedule.frequency_days}
                    onChange={(e) => setSchedule({...schedule, frequency_days: parseInt(e.target.value)})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={schedule.priority} 
                    onValueChange={(value) => setSchedule({...schedule, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Next Maintenance Date</Label>
                <Input 
                  id="date"
                  type="date"
                  value={schedule.next_maintenance_date}
                  onChange={(e) => setSchedule({...schedule, next_maintenance_date: e.target.value})}
                />
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