import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { equipmentService } from "@/services/equipmentService";
import { maintenanceService } from "@/services/maintenanceService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Loader2, 
  Trash2,
  Download,
  QrCode,
  FileText,
  Video,
  Wrench,
  BarChart3,
  Calendar,
  AlertCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";

// Define strict type for status to match DB enum
type EquipmentStatus = "active" | "under_maintenance" | "inactive" | "decommissioned";

export default function EquipmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipment, setEquipment] = useState<any>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // New state for categories
  
  // Initialize with proper typing - renamed category to category_id
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    category_id: string; // Renamed from category to match DB
    manufacturer: string;
    model: string;
    serial_number: string;
    installation_date: string;
    location: string;
    status: EquipmentStatus;
    notes: string;
  }>({
    name: "",
    code: "",
    category_id: "", // Renamed
    manufacturer: "",
    model: "",
    serial_number: "",
    installation_date: "",
    location: "",
    status: "active",
    notes: ""
  });

  useEffect(() => {
    if (id && typeof id === "string") {
      loadData(id); // Renamed to loadData to reflect multiple fetches
    }
  }, [id]);

  const loadData = async (equipmentId: string) => {
    try {
      setLoading(true);
      
      const [equipmentData, maintenanceData, categoriesData] = await Promise.all([
        equipmentService.getById(equipmentId),
        maintenanceService.getByEquipmentId(equipmentId),
        equipmentService.getCategories() // Fetch categories
      ]);

      setCategories(categoriesData || []);

      if (!equipmentData) {
        router.push("/equipment");
        return;
      }

      setEquipment(equipmentData);
      setMaintenanceHistory(maintenanceData || []);
      
      const dbStatus = equipmentData.status as EquipmentStatus;
      
      setFormData({
        name: equipmentData.name || "",
        code: equipmentData.code || "",
        category_id: equipmentData.category_id || "", // Use category_id
        manufacturer: equipmentData.manufacturer || "",
        model: equipmentData.model || "",
        serial_number: equipmentData.serial_number || "",
        installation_date: equipmentData.installation_date || "",
        location: equipmentData.location || "",
        status: dbStatus || "active",
        notes: equipmentData.notes || ""
      });
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || typeof id !== "string") return;

    try {
      setSaving(true);
      
      // Clean up UUID fields: convert empty strings to null
      const cleanedData = {
        ...formData,
        category_id: formData.category_id || null,
      };
      
      await equipmentService.update(id, cleanedData);
      await loadData(id);
      setEditMode(false);
    } catch (error) {
      console.error("Error updating equipment:", error);
      alert("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || typeof id !== "string") return;

    try {
      await equipmentService.delete(id);
      router.push("/equipment");
    } catch (error) {
      console.error("Error deleting equipment:", error);
      alert("Errore durante l'eliminazione");
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      active: { variant: "default", label: "Attiva" },
      under_maintenance: { variant: "secondary", label: "In Manutenzione" },
      inactive: { variant: "outline", label: "Inattiva" },
      decommissioned: { variant: "destructive", label: "Dismessa" }
    };
    // Handle legacy "maintenance" value just in case
    if (status === "maintenance") status = "under_maintenance";
    
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateUptime = () => {
    if (!maintenanceHistory.length) return "100%";
    const completed = maintenanceHistory.filter(m => m.status === "completed").length;
    const total = maintenanceHistory.length;
    const uptime = ((total - completed) / total) * 100;
    return `${Math.round(uptime)}%`;
  };

  if (loading) {
    return (
      <MainLayout userRole="admin">
        <SEO title="Caricamento..." />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (!equipment) {
    return (
      <MainLayout userRole="admin">
        <SEO title="Macchina non trovata" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertCircle className="h-16 w-16 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-700">Macchina non trovata</h2>
          <Button onClick={() => router.push("/equipment")}>
            Torna alla lista
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userRole="admin">
      <SEO title={`${equipment.name} - Industrial Maintenance`} />
      
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{equipment.name}</h1>
              <p className="text-sm text-gray-500">Codice: {equipment.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(equipment.status)}
            {!editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => {
                  setEditMode(false);
                  setFormData({
                    name: equipment.name || "",
                    code: equipment.code || "",
                    category_id: equipment.category_id || "", // Use category_id
                    manufacturer: equipment.manufacturer || "",
                    model: equipment.model || "",
                    serial_number: equipment.serial_number || "",
                    installation_date: equipment.installation_date || "",
                    location: equipment.location || "",
                    status: equipment.status || "active",
                    notes: equipment.notes || ""
                  });
                }}>
                  <X className="h-4 w-4 mr-2" />
                  Annulla
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salva
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">
              <FileText className="h-4 w-4 mr-2" />
              Dettagli
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              <Wrench className="h-4 w-4 mr-2" />
              Manutenzioni
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documenti
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistiche
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Generali</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Macchina *</Label>
                    {editMode ? (
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                      />
                    ) : (
                      <p className="text-sm font-medium">{equipment.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">Codice *</Label>
                    {editMode ? (
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleChange("code", e.target.value)}
                        required
                      />
                    ) : (
                      <p className="text-sm font-medium">{equipment.code}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    {editMode ? (
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => handleChange("category_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                          {categories.length === 0 && (
                            <SelectItem value="no-categories" disabled>
                              Nessuna categoria disponibile
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium">
                        {equipment.equipment_categories?.name || "-"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Stato</Label>
                    {editMode ? (
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleChange("status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Attiva</SelectItem>
                          <SelectItem value="under_maintenance">In Manutenzione</SelectItem>
                          <SelectItem value="inactive">Inattiva</SelectItem>
                          <SelectItem value="decommissioned">Dismessa</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>{getStatusBadge(equipment.status)}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Produttore</Label>
                    {editMode ? (
                      <Input
                        id="manufacturer"
                        value={formData.manufacturer}
                        onChange={(e) => handleChange("manufacturer", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium">{equipment.manufacturer || "-"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Modello</Label>
                    {editMode ? (
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => handleChange("model", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium">{equipment.model || "-"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serial">Numero di Serie</Label>
                    {editMode ? (
                      <Input
                        id="serial"
                        value={formData.serial_number}
                        onChange={(e) => handleChange("serial_number", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium">{equipment.serial_number || "-"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="installation">Data Installazione</Label>
                    {editMode ? (
                      <Input
                        id="installation"
                        type="date"
                        value={formData.installation_date}
                        onChange={(e) => handleChange("installation_date", e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {equipment.installation_date 
                          ? new Date(equipment.installation_date).toLocaleDateString("it-IT")
                          : "-"
                        }
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location">Ubicazione</Label>
                    {editMode ? (
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleChange("location", e.target.value)}
                        placeholder="Es. Reparto A - Linea 1"
                      />
                    ) : (
                      <p className="text-sm font-medium">{equipment.location || "-"}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Note</Label>
                    {editMode ? (
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleChange("notes", e.target.value)}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm font-medium whitespace-pre-wrap">{equipment.notes || "-"}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qr">
            <Card>
              <CardHeader>
                <CardTitle>Codice QR Macchina</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <QRCodeGenerator 
                  value={`${window.location.origin}/equipment/${equipment.id}`}
                  size={256}
                />
                <p className="text-sm text-gray-500 text-center">
                  Scansiona questo codice QR per accedere rapidamente ai dettagli della macchina
                </p>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Scarica QR Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Storico Manutenzioni</CardTitle>
                  <Button onClick={() => router.push("/maintenance/new")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Nuova Manutenzione
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {maintenanceHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nessuna manutenzione registrata per questa macchina</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {maintenanceHistory.map((maintenance) => (
                      <div key={maintenance.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{maintenance.title}</h4>
                            <p className="text-sm text-gray-500">{maintenance.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span>
                                Data: {new Date(maintenance.scheduled_date).toLocaleDateString("it-IT")}
                              </span>
                              <span>Tipo: {maintenance.maintenance_type}</span>
                            </div>
                          </div>
                          <Badge variant={maintenance.status === "completed" ? "default" : "secondary"}>
                            {maintenance.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documentazione Tecnica</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Funzionalità di upload documenti in arrivo</p>
                  <p className="text-sm">Potrai caricare manuali, schede tecniche e certificati</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Manutenzioni Totali
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{maintenanceHistory.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Completate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {maintenanceHistory.filter(m => m.status === "completed").length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Uptime Stimato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {calculateUptime()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Analisi Manutenzioni per Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Grafici e analisi dettagliate in arrivo</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questa macchina?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Verranno eliminate anche tutte le manutenzioni
              e i documenti associati a questa macchina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}