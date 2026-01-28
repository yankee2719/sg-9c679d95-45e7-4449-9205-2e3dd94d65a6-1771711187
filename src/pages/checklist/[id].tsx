import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { checklistService, ChecklistTemplateWithTasks } from "@/services/checklistService";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Flag,
  MessageSquarePlus,
  Check,
  Loader2,
  AlertCircle,
  Wrench
} from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  flagged?: boolean;
}

interface MaintenanceScheduleInfo {
  id: string;
  title: string;
  equipment: {
    id: string;
    name: string;
    code: string;
  };
}

export default function ChecklistExecutionPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<ChecklistTemplateWithTasks | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<MaintenanceScheduleInfo | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [timer, setTimer] = useState(0);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Note modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNoteItemId, setCurrentNoteItemId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  
  // Flag modal
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [currentFlagItemId, setCurrentFlagItemId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");

  // Load template and start execution
  useEffect(() => {
    if (!id || typeof id !== "string") return;
    loadTemplateAndStartExecution(id);
  }, [id]);

  // Timer
  useEffect(() => {
    if (!executionId) return;
    
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [executionId]);

  const loadTemplateAndStartExecution = async (templateId: string) => {
    try {
      setLoading(true);
      
      // Check auth
      const session = await authService.getCurrentSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Load template with tasks
      const templateData = await checklistService.getTemplateWithTasks(templateId);
      
      if (!templateData) {
        toast({
          title: "Errore",
          description: "Template checklist non trovato",
          variant: "destructive"
        });
        router.push("/checklists");
        return;
      }

      setTemplate(templateData);

      // Convert template tasks to execution items
      const executionItems: ChecklistItem[] = (templateData.checklist_tasks || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || "",
        required: task.required,
        completed: false,
        notes: ""
      }));

      setItems(executionItems);

      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from("checklist_executions")
        .insert({
          template_id: templateId,
          equipment_id: scheduleInfo?.equipment.id || "00000000-0000-0000-0000-000000000000", // Fallback if no schedule
          executed_by: session.user.id,
          status: "in_progress",
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (execError) throw execError;

      setExecutionId(execution.id);

      // Load schedule info if exists
      if (execution.schedule_id) {
        const { data: scheduleData } = await supabase
          .from("maintenance_schedules")
          .select(`
            id,
            title,
            equipment:equipment_id (
              id,
              name,
              code
            )
          `)
          .eq("id", execution.schedule_id)
          .single();

        if (scheduleData) {
          setScheduleInfo({
            id: scheduleData.id,
            title: scheduleData.title,
            equipment: scheduleData.equipment as any
          });
        }
      }

      // Create execution items
      const executionItemsData = executionItems.map(item => ({
        execution_id: execution.id,
        task_id: item.id,
        completed: false
      }));

      const { error: itemsError } = await supabase
        .from("checklist_execution_items")
        .insert(executionItemsData);

      if (itemsError) throw itemsError;

    } catch (error) {
      console.error("Error loading template:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la checklist",
        variant: "destructive"
      });
      router.push("/checklists");
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleItemCompletion = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newCompleted = !item.completed;
    const now = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    setItems(items.map(i => 
      i.id === itemId 
        ? { ...i, completed: newCompleted, completedAt: newCompleted ? now : undefined }
        : i
    ));

    try {
      const { error } = await supabase
        .from("checklist_execution_items")
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq("execution_id", executionId)
        .eq("task_id", itemId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il task",
        variant: "destructive"
      });
    }
  };

  const handleAddNote = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    setCurrentNoteItemId(itemId);
    setNoteText(item?.notes || "");
    setShowNoteModal(true);
  };

  const saveNote = async () => {
    if (!currentNoteItemId) return;

    setItems(items.map(i => 
      i.id === currentNoteItemId 
        ? { ...i, notes: noteText }
        : i
    ));

    try {
      const { error } = await supabase
        .from("checklist_execution_items")
        .update({
          notes: noteText,
          updated_at: new Date().toISOString()
        })
        .eq("execution_id", executionId)
        .eq("task_id", currentNoteItemId);

      if (error) throw error;

      toast({
        title: "Nota salvata",
        description: "La nota è stata aggiunta al task"
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la nota",
        variant: "destructive"
      });
    }

    setShowNoteModal(false);
    setCurrentNoteItemId(null);
    setNoteText("");
  };

  const handleFlagItem = (itemId: string) => {
    setCurrentFlagItemId(itemId);
    setFlagReason("");
    setShowFlagModal(true);
  };

  const saveFlagItem = async () => {
    if (!currentFlagItemId) return;

    setItems(items.map(i => 
      i.id === currentFlagItemId 
        ? { ...i, flagged: true }
        : i
    ));

    try {
      const { error } = await supabase
        .from("checklist_execution_items")
        .update({
          flagged: true,
          flag_reason: flagReason,
          updated_at: new Date().toISOString()
        })
        .eq("execution_id", executionId)
        .eq("task_id", currentFlagItemId);

      if (error) throw error;

      toast({
        title: "Task segnalato",
        description: "Il task è stato segnalato per revisione",
        variant: "destructive"
      });
    } catch (error) {
      console.error("Error flagging item:", error);
      toast({
        title: "Errore",
        description: "Impossibile segnalare il task",
        variant: "destructive"
      });
    }

    setShowFlagModal(false);
    setCurrentFlagItemId(null);
    setFlagReason("");
  };

  const handleCompleteAndSign = () => {
    const completedCount = items.filter(item => item.completed).length;
    const requiredCount = items.filter(item => item.required).length;
    const completedRequired = items.filter(item => item.required && item.completed).length;

    if (completedRequired < requiredCount) {
      toast({
        title: "Checklist incompleta",
        description: `Completa tutti i task obbligatori prima di firmare (${completedRequired}/${requiredCount})`,
        variant: "destructive"
      });
      return;
    }

    setShowSignatureModal(true);
  };

  const handleSubmitSignature = async () => {
    if (!signatureName.trim() || !confirmChecked || !executionId) return;

    try {
      setSubmitting(true);

      // Update execution with signature
      const { error: updateError } = await supabase
        .from("checklist_executions")
        .update({
          signature_name: signatureName,
          total_duration: Math.floor(timer / 60),
          updated_at: new Date().toISOString()
        })
        .eq("id", executionId);

      if (updateError) throw updateError;

      // Use service to complete and auto-update maintenance status
      await checklistService.completeExecutionForSchedule(executionId);

      toast({
        title: "Checklist completata!",
        description: scheduleInfo 
          ? "La manutenzione è stata aggiornata automaticamente"
          : "La checklist è stata firmata e salvata con successo"
      });

      // Redirect based on context
      if (scheduleInfo) {
        router.push(`/maintenance/${scheduleInfo.id}`);
      } else {
        router.push("/checklists");
      }
    } catch (error) {
      console.error("Error completing checklist:", error);
      toast({
        title: "Errore",
        description: "Impossibile completare la checklist",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const requiredCount = items.filter(item => item.required).length;
  const completedRequired = items.filter(item => item.required && item.completed).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Template non trovato</h2>
          <p className="text-slate-400 mb-6">Il template checklist richiesto non esiste</p>
          <Button onClick={() => router.push("/checklists")}>
            Torna alle Checklist
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title={`${template.name} - Maint Ops`} />
      
      <div className="min-h-screen bg-slate-900 text-white">
        {/* Maintenance Banner */}
        {scheduleInfo && (
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-blue-500/30">
            <div className="max-w-4xl mx-auto px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-slate-400">Parte della manutenzione</p>
                    <button
                      onClick={() => router.push(`/maintenance/${scheduleInfo.id}`)}
                      className="text-base font-semibold text-white hover:text-blue-400 transition-colors"
                    >
                      {scheduleInfo.title}
                    </button>
                  </div>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {scheduleInfo.equipment.name} ({scheduleInfo.equipment.code})
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scheduleInfo ? router.push(`/maintenance/${scheduleInfo.id}`) : router.back()}
                className="text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">{template.name}</h1>
                <p className="text-sm text-slate-400">{template.equipment || "Equipaggiamento generico"}</p>
              </div>
            </div>
            
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2 text-base font-mono">
              <Clock className="h-4 w-4 mr-2" />
              {formatTimer(timer)}
            </Badge>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
          
          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Progresso</p>
                <p className="text-2xl font-bold text-white">
                  {completedCount} di {totalCount} completati
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Task obbligatori: {completedRequired}/{requiredCount}
                </p>
              </div>
              
              <div className="relative">
                <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${
                  completedRequired >= requiredCount ? "border-green-500 bg-green-500/10" : "border-amber-500 bg-amber-500/10"
                }`}>
                  <span className={`text-2xl font-bold ${
                    completedRequired >= requiredCount ? "text-green-400" : "text-amber-400"
                  }`}>
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <Card 
                key={item.id}
                className={`bg-slate-800/50 border transition-all ${
                  item.flagged 
                    ? "border-red-500/50 bg-red-500/5"
                    : item.completed 
                      ? "border-green-500/30" 
                      : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleItemCompletion(item.id)}
                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          item.completed
                            ? "bg-green-500 text-white"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                        }`}
                      >
                        {item.completed && <Check className="h-6 w-6" />}
                      </button>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`text-lg font-bold ${
                            item.completed ? "line-through text-slate-400" : "text-white"
                          }`}>
                            {item.title}
                          </h3>
                          {item.flagged && (
                            <Flag className="h-4 w-4 text-red-400 fill-red-400" />
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{item.description}</p>
                        
                        {item.completed && item.completedAt && (
                          <div className="flex items-center gap-2 text-xs text-green-400 mb-2">
                            <Clock className="h-3 w-3" />
                            <span>Completato alle {item.completedAt}</span>
                          </div>
                        )}

                        {item.notes && (
                          <div className="bg-slate-700/50 rounded-lg p-3 text-sm text-slate-300 mb-2">
                            <span className="text-slate-400 font-semibold">Nota:</span> {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Badge Required */}
                    {item.required && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        Richiesto
                      </Badge>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFlagItem(item.id)}
                      disabled={item.flagged}
                      className={`${item.flagged ? "text-red-400" : "text-slate-400 hover:text-white"} hover:bg-slate-700`}
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      {item.flagged ? "Segnalato" : "Segnala"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddNote(item.id)}
                      className="text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      {item.notes ? "Modifica nota" : "Aggiungi nota"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom Fixed Button */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={handleCompleteAndSign}
              disabled={completedRequired < requiredCount || submitting}
              className="w-full h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6 mr-2" />
                  Completa e Firma
                </>
              )}
            </Button>
            {completedRequired < requiredCount && (
              <p className="text-center text-sm text-amber-400 mt-2">
                Completa tutti i {requiredCount} task obbligatori per continuare
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Note Modal */}
      <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Aggiungi Nota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Inserisci una nota per questo task..."
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 min-h-[120px]"
            />
            <div className="flex gap-3">
              <Button
                onClick={() => setShowNoteModal(false)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Annulla
              </Button>
              <Button
                onClick={saveNote}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Salva Nota
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flag Modal */}
      <Dialog open={showFlagModal} onOpenChange={setShowFlagModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400">Segnala Problema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-400">
              Segnala questo task per revisione. Il supervisore verrà notificato.
            </p>
            <Textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Descrivi il problema riscontrato..."
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 min-h-[120px]"
            />
            <div className="flex gap-3">
              <Button
                onClick={() => setShowFlagModal(false)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Annulla
              </Button>
              <Button
                onClick={saveFlagItem}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                <Flag className="h-4 w-4 mr-2" />
                Segnala
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Modal */}
      <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-2">
              Firma Digitale
            </DialogTitle>
            <p className="text-sm text-slate-400 text-center">
              Conferma il completamento della checklist
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Summary Card */}
            <Card className="bg-slate-700/50 border-slate-600 p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Template</span>
                  <span className="text-white font-semibold">{template.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Equipaggiamento</span>
                  <span className="text-white font-semibold">{template.equipment || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Durata</span>
                  <span className="text-white font-semibold">{Math.floor(timer / 60)} minuti</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Task Completati</span>
                  <span className="text-white font-semibold">{completedCount}/{totalCount}</span>
                </div>
              </div>
            </Card>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Inserisci il tuo nome completo</label>
              <Input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Nome e Cognome"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 h-12"
              />
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-slate-700/30 rounded-xl border border-slate-600">
              <Checkbox
                id="confirm"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
                className="mt-1 border-slate-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
              <label
                htmlFor="confirm"
                className="text-sm text-slate-300 leading-relaxed cursor-pointer"
              >
                Confermo che tutte le attività obbligatorie sono state eseguite correttamente secondo le procedure stabilite
              </label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmitSignature}
              disabled={!signatureName.trim() || !confirmChecked || submitting}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Conferma e Invia
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}