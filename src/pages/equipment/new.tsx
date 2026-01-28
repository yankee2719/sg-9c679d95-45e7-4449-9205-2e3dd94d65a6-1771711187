import { useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { equipmentService } from "@/services/equipmentService";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { SEO } from "@/components/SEO";

interface TechnicalSpec {
  spec_key: string;
  spec_value: string;
  unit: string;
}

export default function NewEquipment() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    location: "",
    installation_date: "",
    status: "active" as "active" | "inactive" | "under_maintenance" | "decommissioned",
    notes: "",
  });

  const [specifications, setSpecifications] = useState<TechnicalSpec[]>([]);

  const categories = [
    "Conveyor Systems",
    "Robotic Arms",
    "CNC Machines",
    "Hydraulic Presses",
    "Assembly Lines",
    "Packaging Equipment",
    "Material Handling",
    "Quality Control",
    "Welding Equipment",
    "Other",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create equipment first
      const newEquipment = await equipmentService.create({
        ...formData,
        installation_date: formData.installation_date || null,
      });

      // Then add technical specifications if any
      if (specifications.length > 0 && newEquipment.id) {
        const validSpecs = specifications.filter(
          (spec) => spec.spec_key.trim() && spec.spec_value.trim()
        );
        
        if (validSpecs.length > 0) {
          await equipmentService.updateSpecifications(newEquipment.id, validSpecs);
        }
      }

      toast({
        title: "Success",
        description: "Equipment created successfully",
      });

      router.push("/equipment");
    } catch (error) {
      console.error("Error creating equipment:", error);
      toast({
        title: "Error",
        description: "Failed to create equipment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpecification = () => {
    setSpecifications([
      ...specifications,
      { spec_key: "", spec_value: "", unit: "" },
    ]);
  };

  const handleRemoveSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const handleSpecificationChange = (
    index: number,
    field: keyof TechnicalSpec,
    value: string
  ) => {
    const updated = [...specifications];
    updated[index][field] = value;
    setSpecifications(updated);
  };

  return (
    <MainLayout>
      <SEO
        title="New Equipment - MaintPro"
        description="Add new equipment to the maintenance system"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/equipment")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                New Equipment
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Add new equipment to the system
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-blue-900/10 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-gray-900 dark:text-white">
                Equipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-gray-900 dark:text-gray-100">Equipment Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Conveyor Belt System"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="code" className="text-gray-900 dark:text-gray-100">Equipment Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., CNV-001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-gray-900 dark:text-gray-100">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Conveyor Systems">Conveyor Systems</SelectItem>
                      <SelectItem value="Robotic Arms">Robotic Arms</SelectItem>
                      <SelectItem value="CNC Machines">CNC Machines</SelectItem>
                      <SelectItem value="Packaging Equipment">Packaging Equipment</SelectItem>
                      <SelectItem value="Material Handling">Material Handling</SelectItem>
                      <SelectItem value="Quality Control">Quality Control</SelectItem>
                      <SelectItem value="Power Systems">Power Systems</SelectItem>
                      <SelectItem value="Safety Equipment">Safety Equipment</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status" className="text-gray-900 dark:text-gray-100">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      status: value as "active" | "inactive" | "under_maintenance" | "decommissioned" 
                    })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="decommissioned">Decommissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="manufacturer" className="text-gray-900 dark:text-gray-100">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer || ""}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g., Siemens"
                  />
                </div>

                <div>
                  <Label htmlFor="model" className="text-gray-900 dark:text-gray-100">Model</Label>
                  <Input
                    id="model"
                    value={formData.model || ""}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., S7-1500"
                  />
                </div>

                <div>
                  <Label htmlFor="serial_number" className="text-gray-900 dark:text-gray-100">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number || ""}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="e.g., SN-2024-001"
                  />
                </div>

                <div>
                  <Label htmlFor="location" className="text-gray-900 dark:text-gray-100">Location</Label>
                  <Input
                    id="location"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Building A - Assembly Line 1"
                  />
                </div>

                <div>
                  <Label htmlFor="installation_date" className="text-gray-900 dark:text-gray-100">Installation Date</Label>
                  <Input
                    id="installation_date"
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        installation_date: e.target.value,
                      })
                    }
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes" className="text-gray-900 dark:text-gray-100">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Additional information about the equipment..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-blue-900/10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-white">
                  Specifiche Tecniche
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSpecification}
                  className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Specifica
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {specifications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Nessuna specifica tecnica definita
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSpecification}
                    className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Prima Specifica
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {specifications.map((spec, index) => (
                    <div key={index} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4">
                          <Label htmlFor={`spec-key-${index}`} className="text-gray-900 dark:text-gray-100">Key</Label>
                          <Input
                            id={`spec-key-${index}`}
                            value={spec.spec_key}
                            onChange={(e) => handleSpecificationChange(index, "spec_key", e.target.value)}
                            placeholder="e.g., speed, voltage, power"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Label htmlFor={`spec-value-${index}`} className="text-gray-900 dark:text-gray-100">Value</Label>
                          <Input
                            id={`spec-value-${index}`}
                            value={spec.spec_value}
                            onChange={(e) => handleSpecificationChange(index, "spec_value", e.target.value)}
                            placeholder="e.g., 0.5-2, 400, 7.5"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label htmlFor={`spec-unit-${index}`} className="text-gray-900 dark:text-gray-100">Unit</Label>
                          <Input
                            id={`spec-unit-${index}`}
                            value={spec.unit || ""}
                            onChange={(e) => handleSpecificationChange(index, "unit", e.target.value)}
                            placeholder="e.g., m/s, V, kW"
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSpecification(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/equipment")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              {loading ? "Creating..." : "Create Equipment"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}