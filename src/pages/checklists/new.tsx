import { useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { checklistService } from "@/services/checklistService";
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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  GripVertical,
  Loader2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface ChecklistTask {
  id: string;
  title: string;
  description: string;
  required: boolean;
  order: number;
}

export default function NewChecklistPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Form state
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [equipment, setEquipment] = useState("");
  
  // Tasks state
  const [tasks, setTasks] = useState<ChecklistTask[]>([
    {
      id: "1",
      title: "",
      description: "",
      required: true,
      order: 1,
    },
  ]);

  // Add new task
  const addTask = () => {
    const newTask: ChecklistTask = {
      id: Date.now().toString(),
      title: "",
      description: "",
      required: true,
      order: tasks.length + 1,
    };
    setTasks([...tasks, newTask]);
  };

  // Remove task with confirmation
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

  // Confirm delete
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

  // Move task up
  const moveTaskUp = (index: number) => {
    if (index === 0) return;
    const newTasks = [...tasks];
    [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]];
    setTasks(newTasks.map((task, idx) => ({ ...task, order: idx + 1 })));
  };

  // Move task down
  const moveTaskDown = (index: number) => {
    if (index === tasks.length - 1) return;
    const newTasks = [...tasks];
    [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
    setTasks(newTasks.map((task, idx) => ({ ...task, order: idx + 1 })));
  };

  // Update task field
  const updateTask = (id: string, field: keyof ChecklistTask, value: string | boolean) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, [field]: value } : task
      )
    );
  };

  // Count required vs optional
  const requiredCount = tasks.filter((t) => t.required).length;
  const optionalCount = tasks.filter((t) => !t.required).length;

  // Validation
  const isValid = () => {
    return (
      templateName.trim() !== "" &&
      category !== "" &&
      estimatedTime !== "" &&
      tasks.length > 0 &&
      tasks.every((t) => t.title.trim() !== "")
    );
  };

  // Save handlers
  const handleSave = async (status: "draft" | "active") => {
    if (!isValid()) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await checklistService.createTemplate({
        name: templateName,
        description,
        category,
        estimated_time: parseInt(estimatedTime),
        equipment,
        status,
        tasks: tasks.map((t, index) => ({
            title: t.title,
            description: t.description,
            required: t.required,
            task_order: index + 1
        }))
      });

      if (result) {
        toast({
            title: "Successo",
            description: `Template ${status === "active" ? "attivato" : "salvato come bozza"} correttamente!`,
        });
        router.push("/checklists");
      } else {
        throw new Error("Errore durante il salvataggio");
      }
    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Errore",
            description: "Si è verificato un errore durante il salvataggio del template.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePreview = () => {
    toast({
        title: "Anteprima",
        description: "Funzionalità in arrivo...",
    });
  };

  return (
    <>
      <SEO title="Crea Template Checklist - Maint Ops" />
      
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/checklists")}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">Nuovo Template Checklist</h1>
                <p className="text-sm text-slate-400">Crea un template personalizzato per le manutenzioni</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!isValid() || isSubmitting}
                className="hidden sm:flex border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                Anteprima
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleSave("draft")}
                disabled={!isValid() || isSubmitting}
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salva Bozza
              </Button>
              
              <Button
                onClick={() => handleSave("active")}
                disabled={!isValid() || isSubmitting}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/20"
              >
                 {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Salva e Attiva
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          
          {/* Basic Info Section */}
          <Card className="rounded-3xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-blue-400" />
                </div>
                Informazioni Base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Template Name */}
              <div className="space-y-2">
                <Label className="text-slate-300 font-medium">
                  Nome Template <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="es. Manutenzione Preventiva Standard"
                  className="h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-slate-300 font-medium">Descrizione</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrivi lo scopo e le attività principali di questa checklist..."
                  className="min-h-24 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 rounded-xl resize-none"
                />
              </div>

              {/* Row: Category + Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">
                    Categoria <span className="text-red-400">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-12 bg-slate-700 border-slate-600 text-white rounded-xl">
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="Preventiva">Preventiva</SelectItem>
                      <SelectItem value="Sicurezza">Sicurezza</SelectItem>
                      <SelectItem value="Elettrica">Elettrica</SelectItem>
                      <SelectItem value="CNC">CNC</SelectItem>
                      <SelectItem value="Robotica">Robotica</SelectItem>
                      <SelectItem value="Idraulica">Idraulica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Estimated Time */}
                <div className="space-y-2">
                  <Label className="text-slate-300 font-medium">
                    Tempo Stimato (minuti) <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      type="number"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="45"
                      min="1"
                      className="h-12 pl-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Equipment (optional) */}
              <div className="space-y-2">
                <Label className="text-slate-300 font-medium">
                  Equipaggiamento Associato <span className="text-slate-400 text-xs">(opzionale)</span>
                </Label>
                <Input
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="es. Pressa Idraulica A1, Tornio CNC..."
                  className="h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tasks Section */}
          <Card className="rounded-3xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  Task Checklist
                  <Badge className="ml-3 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                  </Badge>
                </CardTitle>
                
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-slate-400">{requiredCount} Richiesti</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-500 rounded-full" />
                    <span className="text-slate-400">{optionalCount} Opzionali</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Task List */}
              {tasks.map((task, index) => (
                <Card
                  key={task.id}
                  className="rounded-2xl border-slate-700 bg-slate-900/50"
                >
                  <CardContent className="p-5 space-y-4">
                    
                    {/* Task Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
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
                        <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 cursor-grab">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <Badge className="bg-slate-700 text-slate-300 border-slate-600">
                          Task {index + 1}
                        </Badge>
                        {task.required ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            Richiesto
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                            Opzionale
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Required Toggle */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-slate-400">Richiesto</Label>
                          <Switch
                            checked={task.required}
                            onCheckedChange={(checked) =>
                              updateTask(task.id, "required", checked)
                            }
                          />
                        </div>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTask(task.id)}
                          disabled={tasks.length === 1}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Task Title */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">
                        Titolo <span className="text-red-400">*</span>
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
                      <Label className="text-slate-300 text-sm">Descrizione</Label>
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

              {/* Add Task Button */}
              <Button
                onClick={addTask}
                className="w-full h-14 border-2 border-dashed border-slate-700 bg-slate-800/30 hover:bg-slate-800 hover:border-blue-500/50 text-slate-300 hover:text-white rounded-2xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                Aggiungi Task
              </Button>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="rounded-3xl border-slate-700 bg-gradient-to-r from-blue-500/10 to-green-500/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Riepilogo Template</h3>
                  <p className="text-sm text-slate-400">
                    {templateName || "Nome template non impostato"} • {tasks.length} tasks • {estimatedTime || "0"}min
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {isValid() ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Pronto per il salvataggio
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-2">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Compila i campi obbligatori
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Actions (Mobile) */}
          <div className="md:hidden flex flex-col gap-3">
            <Button
              onClick={() => handleSave("active")}
              disabled={!isValid() || isSubmitting}
              className="w-full h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/20"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              Salva e Attiva
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              disabled={!isValid() || isSubmitting}
              className="w-full h-14 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
              Salva come Bozza
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Sei sicuro di voler eliminare questo task? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600">
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
    </>
  );
}