import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getEquipmentById, updateEquipment } from "@/services/equipmentService";
import { ArrowLeft, Save } from "lucide-react";

export default function EditEquipment() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    equipment_code: "",
    category: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    installation_date: "",
    location: "",
    status: "active" as "active" | "under_maintenance" | "out_of_service",
    technical_specs: "",
    notes: ""
  });

  useEffect(() => {
    if (id && typeof id === "string") {
      loadEquipment(id);
    }
  }, [id]);

  const loadEquipment = async (equipmentId: string) => {
    try {
      const equipment = await getEquipmentById(equipmentId);
      setFormData({
        name: equipment.name || "",
        equipment_code: equipment.equipment_code || "",
        category: equipment.category || "",
        manufacturer: equipment.manufacturer || "",
        model: equipment.model || "",
        serial_number: equipment.serial_number || "",
        installation_date: equipment.installation_date || "",
        location: equipment.location || "",
        status: (equipment.status as "active" | "under_maintenance" | "out_of_service") || "active",
        technical_specs: typeof equipment.technical_specs === 'string' 
          ? equipment.technical_specs 
          : JSON.stringify(equipment.technical_specs || ""),
        notes: equipment.notes || ""
      });
    } catch (error) {
      console.error("Error loading equipment:", error);
      toast({
        title: "Error",
        description: "Failed to load equipment data",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || typeof id !== "string") return;

    setLoading(true);
    try {
      await updateEquipment(id, formData);
      toast({
        title: "Success",
        description: "Equipment updated successfully",
      });
      router.push(`/equipment/${id}`);
    } catch (error) {
      console.error("Error updating equipment:", error);
      toast({
        title: "Error",
        description: "Failed to update equipment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <MainLayout>
      <SEO title="Edit Equipment - Industrial Maintenance" />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Equipment</h1>
        </div>

        <Card className="border-slate-700">
          <CardHeader>
            <CardTitle>Equipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Equipment Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_code">Equipment Code *</Label>
                  <Input
                    id="equipment_code"
                    value={formData.equipment_code}
                    onChange={(e) => handleChange("equipment_code", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => handleChange("manufacturer", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleChange("model", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => handleChange("serial_number", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installation_date">Installation Date</Label>
                  <Input
                    id="installation_date"
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) => handleChange("installation_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                      <SelectItem value="out_of_service">Out of Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technical_specs">Technical Specifications</Label>
                <Textarea
                  id="technical_specs"
                  value={formData.technical_specs}
                  onChange={(e) => handleChange("technical_specs", e.target.value)}
                  rows={4}
                  placeholder="Enter technical specifications..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}