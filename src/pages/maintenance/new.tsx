import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { maintenanceService } from "@/services/maintenanceService";
import { equipmentService } from "@/services/equipmentService";
import { checklistService, ChecklistTemplateWithTasks } from "@/services/checklistService";
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
import { useToast } from "@/hooks/use-toast";

export default function NewMaintenancePage() {
  const router = useRouter();
  const { toast } = useToast();
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
    const loadData = async () => {
      try {
        setLoading(true);
        // Load equipment
        const equipmentData = await equipmentService.getAll();
        setEquipment(equipmentData);

        // Load checklist templates
        const templatesData = await checklistService.getActiveTemplates();
        setTemplates(templatesData);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          variant: "destructive",
          title: "Errore durante il caricamento dei dati",
          description: "Si è verificato un errore durante il caricamento dei dati. Riprova più tardi."
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
                  <Label htmlFor="equipment" className="text-white">Macchina *</Label>
                  <Select
                    value={formData.equipment_id}
                    onValueChange={(value) => handleChange("equipment_id", value)}
                    required
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Seleziona macchina" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {equipment.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id} className="text-white hover:bg-gray-700 focus:bg-gray-700">
                          {eq.name} ({eq.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-white">Tipo Manutenzione *</Label>
                  <Select
                    value={formData.maintenance_type}
                    onValueChange={(value) => handleChange("maintenance_type", value)}
                    required
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="preventive" className="text-white hover:bg-gray-700 focus:bg-gray-700">Preventiva</SelectItem>
                      <SelectItem value="predictive" className="text-white hover:bg-gray-700 focus:bg-gray-700">Predittiva</SelectItem>
                      <SelectItem value="corrective" className="text-white hover:bg-gray-700 focus:bg-gray-700">Correttiva</SelectItem>
                      <SelectItem value="extraordinary" className="text-white hover:bg-gray-700 focus:bg-gray-700">Straordinaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title" className="text-white">Titolo *</Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Es. Manutenzione Preventiva Mensile"
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled_date" className="text-white">Data Pianificata *</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => handleChange("scheduled_date", e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date" className="text-white">Data Scadenza</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleChange("due_date", e.target.value)}
                    placeholder="Opzionale"
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-white">Priorità *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleChange("priority", value)}
                    required
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Seleziona priorità" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="low" className="text-white hover:bg-gray-700 focus:bg-gray-700">Bassa</SelectItem>
                      <SelectItem value="medium" className="text-white hover:bg-gray-700 focus:bg-gray-700">Media</SelectItem>
                      <SelectItem value="high" className="text-white hover:bg-gray-700 focus:bg-gray-700">Alta</SelectItem>
                      <SelectItem value="critical" className="text-white hover:bg-gray-700 focus:bg-gray-700">Critica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-white">Durata Stimata (minuti)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => handleChange("estimated_duration_minutes", e.target.value)}
                    placeholder="Es. 60"
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-white">Frequenza (giorni)</Label>
                  <Input
                    id="frequency"
                    type="number"
                    value={formData.frequency_days}
                    onChange={(e) => handleChange("frequency_days", e.target.value)}
                    placeholder="Es. 30 per mensile"
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrence" className="text-white">Pattern Ricorrenza</Label>
                  <Select
                    value={formData.recurrence_pattern}
                    onValueChange={(value) => handleChange("recurrence_pattern", value)}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Nessuna ricorrenza" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="daily" className="text-white hover:bg-gray-700 focus:bg-gray-700">Giornaliera</SelectItem>
                      <SelectItem value="weekly" className="text-white hover:bg-gray-700 focus:bg-gray-700">Settimanale</SelectItem>
                      <SelectItem value="monthly" className="text-white hover:bg-gray-700 focus:bg-gray-700">Mensile</SelectItem>
                      <SelectItem value="yearly" className="text-white hover:bg-gray-700 focus:bg-gray-700">Annuale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="technician" className="text-white">Assegna a Tecnico</Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(value) => handleChange("assigned_to", value)}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Seleziona tecnico" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id} className="text-white hover:bg-gray-700 focus:bg-gray-700">
                          {tech.full_name || tech.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="template" className="text-white">Template Checklist</Label>
                  <Select
                    value={formData.checklist_template_id}
                    onValueChange={(value) => handleChange("checklist_template_id", value)}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Seleziona template (opzionale)" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id} className="text-white hover:bg-gray-700 focus:bg-gray-700">
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Descrizione / Note</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  placeholder="Dettagli sull'intervento di manutenzione..."
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
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