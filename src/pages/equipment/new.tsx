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
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-900 dark:text-white">
                    Equipment Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Code */}
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-gray-900 dark:text-white">
                    Equipment Code *
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                    placeholder="e.g., CNV-001"
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-900 dark:text-white">
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                    required
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-gray-900 dark:text-white">
                    Status *
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                      <SelectItem value="decommissioned">Decommissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Manufacturer */}
                <div className="space-y-2">
                  <Label htmlFor="manufacturer" className="text-gray-900 dark:text-white">
                    Manufacturer
                  </Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) =>
                      setFormData({ ...formData, manufacturer: e.target.value })
                    }
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-gray-900 dark:text-white">
                    Model
                  </Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-2">
                  <Label htmlFor="serial_number" className="text-gray-900 dark:text-white">
                    Serial Number
                  </Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) =>
                      setFormData({ ...formData, serial_number: e.target.value })
                    }
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-900 dark:text-white">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g., Building A - Assembly Line 1"
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Installation Date */}
                <div className="space-y-2">
                  <Label htmlFor="installation_date" className="text-gray-900 dark:text-white">
                    Installation Date
                  </Label>
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

                {/* Notes */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes" className="text-gray-900 dark:text-white">
                    Notes
                  </Label>
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
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="md:col-span-4 space-y-2">
                        <Label className="text-gray-900 dark:text-white text-sm">
                          Key
                        </Label>
                        <Input
                          value={spec.spec_key}
                          onChange={(e) =>
                            handleSpecificationChange(
                              index,
                              "spec_key",
                              e.target.value
                            )
                          }
                          placeholder="e.g., speed, voltage, power"
                          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div className="md:col-span-4 space-y-2">
                        <Label className="text-gray-900 dark:text-white text-sm">
                          Value
                        </Label>
                        <Input
                          value={spec.spec_value}
                          onChange={(e) =>
                            handleSpecificationChange(
                              index,
                              "spec_value",
                              e.target.value
                            )
                          }
                          placeholder="e.g., 0.5-2, 400, 7.5"
                          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-2">
                        <Label className="text-gray-900 dark:text-white text-sm">
                          Unit
                        </Label>
                        <Input
                          value={spec.unit}
                          onChange={(e) =>
                            handleSpecificationChange(index, "unit", e.target.value)
                          }
                          placeholder="e.g., m/s, V, kW"
                          className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
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