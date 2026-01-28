import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { checklistService, ChecklistTemplateWithTasks } from "@/services/checklistService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ChecklistTask {
  id: string;
  title: string;
  description: string;
  required: boolean;
  order: number;
}

export default function EditChecklistPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Template data
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Preventiva");
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [equipment, setEquipment] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("active");
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);

  const categories = ["Preventiva", "Sicurezza", "Elettrica", "CNC", "Robotica", "Idraulica"];

  useEffect(() => {
    if (id) {
      checkAuthAndLoadTemplate();
    }
  }, [id]);

  const checkAuthAndLoadTemplate = async () => {
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

      // RBAC: Only admin and supervisor can edit templates
      if (role === "technician") {
        toast({
          variant: "destructive",
          title: "Accesso Negato",
          description: "Solo amministratori e supervisori possono modificare template checklist",
        });
        router.push("/dashboard");
        return;
      }

      // Load template data
      await loadTemplate();
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async () => {
    try {
      const template = await checklistService.getTemplateById(id as string);
      
      if (!template) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Template non trovato",
        });
        router.push("/checklists");
        return;
      }

      // Populate form with existing data
      setTemplateName(template.name);
      setDescription(template.description || "");
      setCategory(template.category);
      setEstimatedTime(template.estimated_time);
      setEquipment(template.equipment || "");
      setStatus(template.status as any);

      // Populate tasks
      const loadedTasks = (template.checklist_tasks || []).map((task, index) => ({
        id: task.id,
        title: task.title,
        description: task.description || "",
        required: task.required,
        order: index + 1,
      }));
      setTasks(loadedTasks);
    } catch (error) {
      console.error("Error loading template:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare il template",
      });
      router.push("/checklists");
    }
  };

  const addTask = () => {
    const newTask: ChecklistTask = {
      id: `temp-${Date.now()}`,
      title: "",
      description: "",
      required: true,
      order: tasks.length + 1,
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (id: string, field: keyof ChecklistTask, value: string | boolean) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, [field]: value } : task
      )
    );
  };

  const removeTask = (id: string) => {
    if (tasks.length === 1) {
      toast({
        variant: "destructive",
        title: "Impossibile eliminare",
        description: "Deve esserci almeno un task nella checklist",
      });
      return;
    }
    setTaskToDelete(id);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      const updatedTasks = tasks
        .filter((task) => task.id !== taskToDelete)
        .map((task, index) => ({ ...task, order: index + 1 }));
      setTasks(updatedTasks);
      toast({
        title: "Task eliminato",
        description: "Il task è stato rimosso dalla checklist",
      });
    }
    setTaskToDelete(null);
  };

  const moveTaskUp = (index: number) => {
    if (index === 0) return;
    const newTasks = [...tasks];
    [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]];
    setTasks(newTasks.map((task, idx) => ({ ...task, order: idx + 1 })));
  };

  const moveTaskDown = (index: number) => {
    if (index === tasks.length - 1) return;
    const newTasks = [...tasks];
    [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
    setTasks(newTasks.map((task, idx) => ({ ...task, order: idx + 1 })));
  };

  const handleSave = async () => {
    // Validation
    if (!templateName.trim()) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Il nome del template è obbligatorio",
      });
      return;
    }

    if (tasks.length === 0) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Aggiungi almeno un task alla checklist",
      });
      return;
    }

    const invalidTasks = tasks.filter((t) => !t.title.trim());
    if (invalidTasks.length > 0) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Tutti i task devono avere un titolo",
      });
      return;
    }

    setSaving(true);
    try {
      const success = await checklistService.updateTemplateWithTasks(
        id as string,
        {
          name: templateName,
          description: description || undefined,
          category,
          estimated_time: estimatedTime,
          equipment: equipment || undefined,
          status,
        },
        tasks.map((task) => ({
          title: task.title,
          description: task.description || undefined,
          required: task.required,
          task_order: task.order,
        }))
      );

      if (success) {
        toast({
          title: "✅ Template Aggiornato",
          description: `"${templateName}" è stato aggiornato con successo`,
        });
        router.push("/checklists");
      } else {
        toast({
          variant: "destructive",
          title: "❌ Errore",
          description: "Impossibile aggiornare il template. Riprova più tardi.",
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        variant: "destructive",
        title: "❌ Errore",
        description: "Si è verificato un errore durante il salvataggio",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <MainLayout userRole={userRole}>
      <SEO title="Modifica Template Checklist - Maint Ops" />

      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <h1 className="text-2xl font-bold">Modifica Template Checklist</h1>
        </div>

        {/* Template Info Card */}
        <Card className="max-w-4xl mx-auto mb-6">
          <CardHeader>
            <CardTitle>Informazioni Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name & Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white text-sm font-medium">
                  Nome Template <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="es. Controllo CNC Settimanale"
                  className="h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-white text-sm font-medium">
                  Categoria <span className="text-red-400">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 bg-slate-700 border-slate-600 text-white rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-white">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white text-sm font-medium">
                Descrizione
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrivi cosa include questa checklist..."
                className="min-h-24 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 rounded-xl resize-none"
              />
            </div>

            {/* Time & Equipment & Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="time" className="text-white text-sm font-medium">
                  Tempo Stimato (minuti)
                </Label>
                <Input
                  id="time"
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)}
                  min="1"
                  className="h-12 bg-slate-700 border-slate-600 text-white rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment" className="text-white text-sm font-medium">
                  Equipaggiamento (opzionale)
                </Label>
                <Input
                  id="equipment"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="es. Tornio CNC, Pressa..."
                  className="h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-white text-sm font-medium">
                  Stato Template
                </Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-12 bg-slate-700 border-slate-600 text-white rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="active" className="text-white">Attivo</SelectItem>
                    <SelectItem value="draft" className="text-white">Bozza</SelectItem>
                    <SelectItem value="archived" className="text-white">Archiviato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-xl">✅ Task Checklist ({tasks.length})</CardTitle>
                <CardDescription className="text-slate-400">
                  Modifica, aggiungi o rimuovi task dalla checklist
                </CardDescription>
              </div>
              <Button
                onClick={addTask}
                variant="outline"
                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              >
                <Plus className="h-5 w-5 mr-2" />
                Aggiungi Task
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasks.map((task, index) => (
              <Card
                key={task.id}
                className="rounded-xl border-slate-700 bg-slate-900/50 hover:border-slate-600 transition-colors"
              >
                <CardContent className="p-4 space-y-4">
                  {/* Task Header */}
                  <div className="flex items-center gap-3">
                    {/* Move Buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveTaskUp(index)}
                        disabled={index === 0}
                        className="h-6 w-8 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveTaskDown(index)}
                        disabled={index === tasks.length - 1}
                        className="h-6 w-8 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Grip Handle */}
                    <GripVertical className="h-5 w-5 text-slate-600" />

                    {/* Task Number */}
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 font-mono">
                      {index + 1}
                    </Badge>

                    {/* Required/Optional Toggle */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Label htmlFor={`required-${task.id}`} className="text-sm text-slate-400">
                        {task.required ? "Richiesto" : "Opzionale"}
                      </Label>
                      <Switch
                        id={`required-${task.id}`}
                        checked={task.required}
                        onCheckedChange={(checked) => updateTask(task.id, "required", checked)}
                      />
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTask(task.id)}
                      className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Task Title */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">
                      Titolo Task <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(task.id, "title", e.target.value)}
                      placeholder="es. Verifica livello olio"
                      className="h-11 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  {/* Task Description */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Descrizione (opzionale)</Label>
                    <Textarea
                      value={task.description}
                      onChange={(e) => updateTask(task.id, "description", e.target.value)}
                      placeholder="Descrivi in dettaglio cosa fare in questo step..."
                      className="min-h-20 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 rounded-xl resize-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {tasks.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Nessun task aggiunto</p>
                <Button onClick={addTask} variant="outline" className="border-blue-500/30 text-blue-400">
                  <Plus className="h-5 w-5 mr-2" />
                  Aggiungi Primo Task
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Footer */}
        <Card className="rounded-2xl border-slate-700 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Task Totali</p>
                  <p className="text-2xl font-bold text-white">{tasks.length}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Task Richiesti</p>
                  <p className="text-2xl font-bold text-green-400">
                    {tasks.filter((t) => t.required).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Task Opzionali</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {tasks.filter((t) => !t.required).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Tempo Totale</p>
                  <p className="text-2xl font-bold text-amber-400">{estimatedTime} min</p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl px-8"
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
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Sei sicuro di voler eliminare questo task? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}