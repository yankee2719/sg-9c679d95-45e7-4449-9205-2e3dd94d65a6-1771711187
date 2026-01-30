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
    purchase_date: "",
    location: "",
    status: "active" as "active" | "inactive" | "under_maintenance" | "retired",
    technical_specs: "",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newEquipment = await createEquipment({
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
        notes: formData.notes.trim() || null
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
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle>QR Code Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <QRCodeGenerator value={formData.equipment_code || "new-equipment"} />
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-800 border-slate-700">
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
                    className="bg-slate-700 border-slate-600"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_code">Equipment Code *</Label>
                  <Input
                    id="equipment_code"
                    value={formData.equipment_code}
                    onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive" | "under_maintenance" | "retired") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
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
                  className="bg-slate-700 border-slate-600 min-h-[100px]"
                  placeholder="Enter technical specifications..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-slate-700 border-slate-600 min-h-[100px]"
                  placeholder="Additional notes..."
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