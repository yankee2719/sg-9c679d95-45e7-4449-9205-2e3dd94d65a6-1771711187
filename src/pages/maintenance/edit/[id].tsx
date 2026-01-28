import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { maintenanceService } from "@/services/maintenanceService";
import { checklistService, ChecklistTemplateWithTasks } from "@/services/checklistService";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  AlertCircle,
  Wrench,
  CheckSquare,
  X
} from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  code: string;
}

interface SelectedChecklist {
  templateId: string;
  templateName: string;
  isRequired: boolean;
  executionOrder: number;
}

export default function EditMaintenancePage() {
  const router = useRouter();
  const { id } = router.query;
  const scheduleId = Array.isArray(id) ? id[0] : id; // Safe string id
  const { toast } = useToast();

  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [maintenanceType, setMaintenanceType] = useState<"preventive" | "corrective" | "predictive" | "extraordinary">("preventive");
  const [assignedTo, setAssignedTo] = useState("");

  // Data
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [availableChecklists, setAvailableChecklists] = useState<ChecklistTemplateWithTasks[]>([]);
  const [selectedChecklists, setSelectedChecklists] = useState<SelectedChecklist[]>([]);

  useEffect(() => {
    if (scheduleId) {
      checkAuthAndLoadData();
    }
  }, [scheduleId]);

  const checkAuthAndLoadData = async () => {
    try {
      setLoading(true);
      
      const session = await authService.getCurrentSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const role = await userService.getUserRole(session.user.id);
      if (!role) {
        router.push("/dashboard");
        return;
      }

      setUserRole(role as any);

      // RBAC: Only admin/supervisor can edit
      if (role === "technician") {
        toast({
          variant: "destructive",
          title: "Accesso Negato",
          description: "Solo amministratori e supervisori possono modificare le manutenzioni",
        });
        router.push("/dashboard");
        return;
      }

      await Promise.all([
        loadMaintenanceData(),
        loadEquipments(),
        loadTechnicians(),
        loadChecklists()
      ]);

    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceData = async () => {
    if (!scheduleId) return;
    
    try {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select(`
          *,
          equipment (id, name, code)
        `)
        .eq("id", scheduleId)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Manutenzione non trovata",
        });
        router.push("/maintenance");
        return;
      }

      // Pre-populate form
      setTitle(data.title);
      setDescription(data.description || "");
      setEquipmentId(data.equipment_id);
      setScheduledDate(data.scheduled_date?.split("T")[0] || "");
      setDueDate(data.due_date?.split("T")[0] || "");
      setPriority(data.priority || "medium");
      setMaintenanceType((data.maintenance_type as any) || "preventive");
      setAssignedTo(data.assigned_to || "");

      // Load associated checklists
      const checklists = await maintenanceService.getScheduleChecklists(scheduleId);
      const selectedChecklistsData: SelectedChecklist[] = checklists.map((c) => ({
        templateId: c.template_id,
        templateName: c.template?.name || "Checklist",
        isRequired: c.is_required,
        executionOrder: c.execution_order,
      }));
      setSelectedChecklists(selectedChecklistsData);

    } catch (error) {
      console.error("Error loading maintenance:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare i dati della manutenzione",
      });
    }
  };

  const loadEquipments = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, code")
        .order("name");

      if (error) throw error;
      setEquipments(data || []);
    } catch (error) {
      console.error("Error loading equipment:", error);
    }
  };

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("role", ["technician", "supervisor"])
        .order("full_name");

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error("Error loading technicians:", error);
    }
  };

  const loadChecklists = async () => {
    try {
      const checklists = await checklistService.getActiveTemplates();
      setAvailableChecklists(checklists);
    } catch (error) {
      console.error("Error loading checklists:", error);
    }
  };

  const handleAddChecklist = (templateId: string) => {
    const template = availableChecklists.find((c) => c.id === templateId);
    if (!template) return;

    const alreadyAdded = selectedChecklists.some((c) => c.templateId === templateId);
    if (alreadyAdded) {
      toast({
        variant: "destructive",
        title: "Checklist già aggiunta",
        description: "Questa checklist è già stata aggiunta alla manutenzione",
      });
      return;
    }

    setSelectedChecklists([
      ...selectedChecklists,
      {
        templateId: template.id,
        templateName: template.name,
        isRequired: true,
        executionOrder: selectedChecklists.length + 1,
      },
    ]);
  };

  const handleRemoveChecklist = (templateId: string) => {
    setSelectedChecklists(selectedChecklists.filter((c) => c.templateId !== templateId));
  };

  const handleToggleRequired = (templateId: string) => {
    setSelectedChecklists(
      selectedChecklists.map((c) =>
        c.templateId === templateId ? { ...c, isRequired: !c.isRequired } : c
      )
    );
  };

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Il titolo è obbligatorio",
      });
      return;
    }

    if (!equipmentId) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Seleziona una macchina",
      });
      return;
    }

    if (!scheduledDate) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "La data di programmazione è obbligatoria",
      });
      return;
    }

    setSaving(true);
    try {
      // Update maintenance schedule
      await maintenanceService.updateSchedule(scheduleId as string, {
        title,
        description: description || undefined,
        equipment_id: equipmentId,
        scheduled_date: scheduledDate,
        due_date: dueDate || undefined,
        priority,
        maintenance_type: maintenanceType,
        assigned_to: assignedTo || undefined,
      });

      // Update checklists: delete old, insert new
      // First, get current checklist links
      const currentLinks = await maintenanceService.getScheduleChecklists(scheduleId as string);
      
      // Delete all current links
      for (const link of currentLinks) {
        await maintenanceService.unlinkChecklistFromSchedule(scheduleId as string, link.template_id);
      }

      // Insert new links
      if (selectedChecklists.length > 0) {
        await maintenanceService.linkChecklistsToSchedule(
          scheduleId as string,
          selectedChecklists.map((c) => ({
            templateId: c.templateId,
            isRequired: c.isRequired,
            executionOrder: c.executionOrder,
          }))
        );
      }

      toast({
        title: "✅ Manutenzione Aggiornata",
        description: `"${title}" è stata aggiornata con successo`,
      });

      router.push("/maintenance");
    } catch (error) {
      console.error("Error updating maintenance:", error);
      toast({
        variant: "destructive",
        title: "❌ Errore",
        description: "Impossibile aggiornare la manutenzione. Riprova più tardi.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout userRole={userRole}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userRole={userRole}>
      <SEO title="Modifica Manutenzione - Maint Ops" />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Wrench className="h-8 w-8 text-blue-400" />
                Modifica Manutenzione
              </h1>
              <p className="text-slate-400 mt-1">Aggiorna i dettagli della manutenzione programmata</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                📋 Informazioni Base
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-300">
                    Titolo Manutenzione *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="es. Manutenzione Ordinaria Tornio"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment" className="text-slate-300">
                    Macchina *
                  </Label>
                  <Select value={equipmentId} onValueChange={setEquipmentId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Seleziona macchina" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {equipments.map((equipment) => (
                        <SelectItem key={equipment.id} value={equipment.id} className="text-white">
                          {equipment.name} ({equipment.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">
                  Descrizione
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrizione dettagliata dell'intervento..."
                  rows={3}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                Pianificazione
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate" className="text-slate-300">
                    Data Programmata *
                  </Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-slate-300">
                    Data Scadenza
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedTo" className="text-slate-300">
                    Assegnata a
                  </Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Seleziona tecnico" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id} className="text-white">
                          {tech.full_name || tech.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-slate-300">
                    Priorità
                  </Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="low" className="text-white">🟢 Bassa</SelectItem>
                      <SelectItem value="medium" className="text-white">🟡 Media</SelectItem>
                      <SelectItem value="high" className="text-white">🟠 Alta</SelectItem>
                      <SelectItem value="critical" className="text-white">🔴 Critica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenanceType" className="text-slate-300">
                    Tipo Manutenzione
                  </Label>
                  <Select value={maintenanceType} onValueChange={(value: any) => setMaintenanceType(value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="preventive" className="text-white">Preventiva</SelectItem>
                      <SelectItem value="corrective" className="text-white">Correttiva</SelectItem>
                      <SelectItem value="predictive" className="text-white">Predittiva</SelectItem>
                      <SelectItem value="extraordinary" className="text-white">Straordinaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklists */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-blue-400" />
                  Checklist Associate ({selectedChecklists.length})
                </h2>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Aggiungi Checklist</Label>
                <Select onValueChange={handleAddChecklist}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Seleziona una checklist da aggiungere" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {availableChecklists.map((checklist) => (
                      <SelectItem key={checklist.id} value={checklist.id} className="text-white">
                        {checklist.name} ({checklist.checklist_tasks.length} task)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedChecklists.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nessuna checklist associata</p>
                  <p className="text-sm">Aggiungi almeno una checklist per questa manutenzione</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedChecklists.map((checklist, index) => (
                    <div
                      key={checklist.templateId}
                      className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl border border-slate-600"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{checklist.templateName}</p>
                          <p className="text-sm text-slate-400">
                            {checklist.isRequired ? "🔴 Richiesta" : "⚪ Opzionale"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleRequired(checklist.templateId)}
                          className="text-slate-400 hover:text-white hover:bg-slate-600"
                        >
                          {checklist.isRequired ? "Rendi Opzionale" : "Rendi Richiesta"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveChecklist(checklist.templateId)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-8"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}