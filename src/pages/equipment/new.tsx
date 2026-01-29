import { useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { createEquipment } from "@/services/equipmentService";
import { useToast } from "@/hooks/use-toast";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";

export default function NewEquipment() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createEquipment({
        name: formData.name,
        equipment_code: formData.equipment_code,
        category: formData.category || null,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        installation_date: formData.installation_date || null,
        location: formData.location || null,
        status: formData.status,
        technical_specs: formData.technical_specs || null,
        notes: formData.notes || null
      });

      toast({
        title: "Success",
        description: "Equipment created successfully",
      });

      router.push("/equipment");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create equipment";
      toast({
        title: "Error",
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
            <h1 className="text-3xl font-bold">New Equipment</h1>
          </div>
          <Button onClick={() => setShowQRGenerator(!showQRGenerator)}>
            {showQRGenerator ? "Hide" : "Show"} QR Generator
          </Button>
        </div>

        {showQRGenerator && (
          <Card className="border-slate-700">
            <CardHeader>
              <CardTitle>QR Code Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <QRCodeGenerator value={formData.equipment_code || "new-equipment"} />
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-700">
          <CardHeader>
            <CardTitle>Equipment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_code">Equipment Code *</Label>
                  <Input
                    id="equipment_code"
                    value={formData.equipment_code}
                    onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installation_date">Installation Date</Label>
                  <Input
                    id="installation_date"
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: "active" | "under_maintenance" | "out_of_service") => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
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
                  onChange={(e) => setFormData({ ...formData, technical_specs: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/equipment")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Saving..." : "Save Equipment"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}