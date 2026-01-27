import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { equipmentService } from "@/services/equipmentService";
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
import { ArrowLeft, Loader2, Save } from "lucide-react";

export default function NewEquipmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category_id: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    location: "",
    notes: "",
    status: "active"
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await equipmentService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate QR code content (simple URL for now)
      const qrCode = `EQUIP:${formData.code}`;
      
      await equipmentService.create({
        ...formData,
        status: formData.status as "active" | "under_maintenance" | "inactive" | "decommissioned",
        qr_code: qrCode,
        installation_date: new Date().toISOString().split('T')[0]
      });

      router.push("/equipment");
    } catch (error) {
      console.error("Error creating equipment:", error);
      alert("Errore durante la creazione della macchina");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <MainLayout userRole="admin">
      <SEO title="Nuova Macchina - Industrial Maintenance" />
      
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <h1 className="text-2xl font-bold">Nuova Macchina</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dati Generali</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="code">Codice Identificativo *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="Es. MAC-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome Macchina *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Es. Pressa Idraulica 50T"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
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
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Stato Iniziale</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Attiva</SelectItem>
                      <SelectItem value="under_maintenance">In Manutenzione</SelectItem>
                      <SelectItem value="inactive">Inattiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Produttore</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => handleChange("manufacturer", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Modello</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleChange("model", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial">Numero di Serie</Label>
                  <Input
                    id="serial"
                    value={formData.serial_number}
                    onChange={(e) => handleChange("serial", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicazione</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="Es. Reparto A, Linea 2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Note Aggiuntive</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salva Macchina
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}