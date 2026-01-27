import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { equipmentService } from "@/services/equipmentService";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, Loader2, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FormData {
  name: string;
  code: string;
  category_id: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  location: string;
  notes: string;
  status: string;
  yearOfProduction: string;
  technicalSpecs: string;
}

export default function NewEquipmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: "",
    category_id: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    location: "",
    notes: "",
    status: "active",
    yearOfProduction: "",
    technicalSpecs: ""
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
      setError("Errore nel caricamento delle categorie");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Utente non autenticato");
      }

      // Generate QR code content (simple URL for now)
      const qrCode = `EQUIP:${formData.code}`;
      
      // Prepare equipment data mapping form state to DB schema
      const equipmentData = {
        code: formData.code,
        name: formData.name,
        category_id: formData.category_id || null,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        location: formData.location || null,
        installation_date: formData.yearOfProduction ? `${formData.yearOfProduction}-01-01` : null,
        status: formData.status as "active" | "under_maintenance" | "inactive" | "decommissioned",
        notes: formData.notes || null,
        technical_specs: formData.technicalSpecs ? { specs: formData.technicalSpecs } : null, // Store as JSON
        qr_code: qrCode,
        created_by: user.id,
      };

      await equipmentService.create(equipmentData);

      router.push("/equipment");
    } catch (err: any) {
      console.error("Error creating equipment:", err);
      setError(err.message || "Errore durante la creazione della macchina");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
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

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errore</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                  <Label htmlFor="serial_number">Numero di Serie</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => handleChange("serial_number", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearOfProduction">Anno di Produzione</Label>
                  <Input
                    id="yearOfProduction"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formData.yearOfProduction}
                    onChange={(e) => handleChange("yearOfProduction", e.target.value)}
                    placeholder="Es. 2023"
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
                <Label htmlFor="technicalSpecs">Specifiche Tecniche</Label>
                <Textarea
                  id="technicalSpecs"
                  value={formData.technicalSpecs}
                  onChange={(e) => handleChange("technicalSpecs", e.target.value)}
                  placeholder="Dettagli tecnici aggiuntivi..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Note Aggiuntive</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={3}
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