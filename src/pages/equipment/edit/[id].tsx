import { useState, useEffect } from "react";
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
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";

interface TechnicalSpec {
  spec_key: string;
  spec_value: string;
  unit: string;
}

interface Equipment {
  id: string;
  name: string;
  equipment_code: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  location: string | null;
  installation_date: string | null;
  status: "active" | "inactive" | "under_maintenance" | "retired";
  notes: string | null;
  technical_specs: Record<string, unknown> | TechnicalSpec[];
}

export default function EditEquipment() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    equipment_code: "",
    category: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    location: "",
    installation_date: "",
    status: "active" as "active" | "inactive" | "under_maintenance" | "retired",
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

  // Load equipment data
  useEffect(() => {
    if (!id || typeof id !== "string") return;

    const loadEquipment = async () => {
      try {
        setFetchingData(true);
        const equipment = await equipmentService.getById(id);

        setFormData({
          name: equipment.name,
          equipment_code: equipment.equipment_code,
          category: equipment.category,
          manufacturer: equipment.manufacturer || "",
          model: equipment.model || "",
          serial_number: equipment.serial_number || "",
          location: equipment.location || "",
          installation_date: equipment.installation_date || "",
          status: equipment.status as "active" | "inactive" | "under_maintenance" | "retired",
          notes: equipment.notes || "",
        });

        // Parse technical specs
        if (equipment.technical_specs) {
          if (Array.isArray(equipment.technical_specs)) {
            setSpecifications(equipment.technical_specs as unknown as TechnicalSpec[]);
          } else if (typeof equipment.technical_specs === "object") {
            const specs = Object.entries(equipment.technical_specs).map(
              ([key, value]) => ({
                spec_key: key,
                spec_value: String(value),
                unit: "",
              })
            );
            setSpecifications(specs);
          }
        }
      } catch (error) {
        console.error("Error loading equipment:", error);
        toast({
          title: "Error",
          description: "Failed to load equipment data",
          variant: "destructive",
        });
        router.push("/equipment");
      } finally {
        setFetchingData(false);
      }
    };

    loadEquipment();
  }, [id, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || typeof id !== "string") return;

    setLoading(true);

    try {
      await equipmentService.update(id, {
        ...formData,
        installation_date: formData.installation_date || null,
        technical_specs: specifications.length > 0 ? specifications : {},
      });

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

  if (fetchingData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
            <p className="text-gray-400">Loading equipment data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEO
        title="Edit Equipment - MaintPro"
        description="Edit equipment details in the maintenance system"
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/equipment/${id}`)}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Edit Equipment
              </h1>
              <p className="text-gray-400 mt-1">
                Update equipment information
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-blue-900/10 border-b border-gray-700">
              <CardTitle className="text-white">
                Equipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-white">Equipment Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Conveyor Belt System"
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="equipment_code" className="text-white">Equipment Code *</Label>
                  <Input
                    id="equipment_code"
                    value={formData.equipment_code}
                    onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                    placeholder="e.g., CNV-001"
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-white">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category" className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {categories.map((cat) => (
                        <SelectItem 
                          key={cat} 
                          value={cat}
                          className="text-white hover:bg-gray-600"
                        >
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status" className="text-white">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      status: value as "active" | "inactive" | "under_maintenance" | "retired"
                    })}
                  >
                    <SelectTrigger id="status" className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="active" className="text-white hover:bg-gray-600">Active</SelectItem>
                      <SelectItem value="under_maintenance" className="text-white hover:bg-gray-600">Under Maintenance</SelectItem>
                      <SelectItem value="inactive" className="text-white hover:bg-gray-600">Inactive</SelectItem>
                      <SelectItem value="retired" className="text-white hover:bg-gray-600">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="manufacturer" className="text-white">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer || ""}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g., Siemens"
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="model" className="text-white">Model</Label>
                  <Input
                    id="model"
                    value={formData.model || ""}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., S7-1500"
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="serial_number" className="text-white">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number || ""}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="e.g., SN-2024-001"
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="location" className="text-white">Location</Label>
                  <Input
                    id="location"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Building A - Assembly Line 1"
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="installation_date" className="text-white">Installation Date</Label>
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
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes" className="text-white">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400"
                    placeholder="Additional information about the equipment..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-blue-900/10 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  Technical Specifications
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSpecification}
                  className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Specification
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {specifications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    No technical specifications defined
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSpecification}
                    className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Specification
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {specifications.map((spec, index) => (
                    <div key={index} className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4">
                          <Label htmlFor={`spec-key-${index}`} className="text-white">Key</Label>
                          <Input
                            id={`spec-key-${index}`}
                            value={spec.spec_key}
                            onChange={(e) => handleSpecificationChange(index, "spec_key", e.target.value)}
                            placeholder="e.g., speed, voltage, power"
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Label htmlFor={`spec-value-${index}`} className="text-white">Value</Label>
                          <Input
                            id={`spec-value-${index}`}
                            value={spec.spec_value}
                            onChange={(e) => handleSpecificationChange(index, "spec_value", e.target.value)}
                            placeholder="e.g., 0.5-2, 400, 7.5"
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label htmlFor={`spec-unit-${index}`} className="text-white">Unit</Label>
                          <Input
                            id={`spec-unit-${index}`}
                            value={spec.unit || ""}
                            onChange={(e) => handleSpecificationChange(index, "unit", e.target.value)}
                            placeholder="e.g., m/s, V, kW"
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSpecification(index)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/equipment/${id}`)}
              disabled={loading}
              className="border-gray-600 text-gray-200 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Equipment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}