import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { maintenanceService } from "@/services/maintenanceService";
import { equipmentService } from "@/services/equipmentService";
import { checklistService } from "@/services/checklistService";
import { userService } from "@/services/userService";
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

export default function NewMaintenancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    equipment_id: "",
    maintenance_type: "",
    title: "",
    description: "",
    frequency_days: "",
    scheduled_date: "",
    due_date: "",
    assigned_to: "",
    checklist_template_id: "",
    estimated_duration_minutes: "",
    priority: "medium",
    recurrence_pattern: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [equipmentData, templatesData, techniciansData] = await Promise.all([
        equipmentService.getAll(),
        checklistService.getTemplates(),
        userService.getUsersByRole("technician")
      ]);
      
      setEquipment(equipmentData);
      setTemplates(templatesData);
      setTechnicians(techniciansData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduleData = {
        equipment_id: formData.equipment_id,
        maintenance_type: formData.maintenance_type,
        title: formData.title,
        description: formData.description || null,
        frequency_days: formData.frequency_days ? parseInt(formData.frequency_days) : null,
        scheduled_date: formData.scheduled_date,
        due_date: formData.due_date || formData.scheduled_date,
        assigned_to: formData.assigned_to || null,
        checklist_template_id: formData.checklist_template_id || null,
        estimated_duration_minutes: formData.estimated_duration_minutes ? parseInt(formData.estimated_duration_minutes) : null,
        priority: formData.priority,
        recurrence_pattern: formData.recurrence_pattern || null,
        is_active: true,
        status: "scheduled"
      };

      await maintenanceService.createSchedule(scheduleData as any);

      router.push("/maintenance");
    } catch (error) {
      console.error("Error creating maintenance:", error);
      alert("Errore durante la creazione della manutenzione");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <MainLayout userRole="admin">
      <SEO title="Nuova Manutenzione - Industrial Maintenance" />
      
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <h1 className="text-2xl font-bold">Nuova Manutenzione Programmata</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dati Manutenzione</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="equipment">Macchina *</Label>
                  <Select
                    value={formData.equipment_id}
                    onValueChange={(value) => handleChange("equipment_id", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona macchina" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.name} ({eq.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo Manutenzione *</Label>
                  <Select
                    value={formData.maintenance_type}
                    onValueChange={(value) => handleChange("maintenance_type", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventiva</SelectItem>
                      <SelectItem value="predictive">Predittiva</SelectItem>
                      <SelectItem value="corrective">Correttiva</SelectItem>
                      <SelectItem value="extraordinary">Straordinaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Titolo *</Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Es. Manutenzione Preventiva Mensile"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Data Pianificata *</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => handleChange("scheduled_date", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Data Scadenza</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleChange("due_date", e.target.value)}
                    placeholder="Opzionale"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priorità *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleChange("priority", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona priorità" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Bassa</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Critica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Durata Stimata (minuti)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => handleChange("estimated_duration_minutes", e.target.value)}
                    placeholder="Es. 60"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequenza (giorni)</Label>
                  <Input
                    id="frequency"
                    type="number"
                    value={formData.frequency_days}
                    onChange={(e) => handleChange("frequency_days", e.target.value)}
                    placeholder="Es. 30 per mensile"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrence">Pattern Ricorrenza</Label>
                  <Select
                    value={formData.recurrence_pattern}
                    onValueChange={(value) => handleChange("recurrence_pattern", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nessuna ricorrenza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Giornaliera</SelectItem>
                      <SelectItem value="weekly">Settimanale</SelectItem>
                      <SelectItem value="monthly">Mensile</SelectItem>
                      <SelectItem value="yearly">Annuale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="technician">Assegna a Tecnico</Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(value) => handleChange("assigned_to", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona tecnico" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.full_name || tech.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="template">Template Checklist</Label>
                  <Select
                    value={formData.checklist_template_id}
                    onValueChange={(value) => handleChange("checklist_template_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona template (opzionale)" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione / Note</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  placeholder="Dettagli sull'intervento di manutenzione..."
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
                      Crea Manutenzione
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