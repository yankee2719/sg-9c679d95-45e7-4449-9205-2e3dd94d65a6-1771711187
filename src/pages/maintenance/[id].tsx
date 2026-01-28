import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { maintenanceService } from "@/services/maintenanceService";
import { checklistService } from "@/services/checklistService";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  Circle, 
  PlayCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

export default function MaintenanceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [startingChecklist, setStartingChecklist] = useState<string | null>(null);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadScheduleData();
    }
  }, [id]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      const data = await maintenanceService.getScheduleWithChecklists(id as string);
      
      if (!data) {
        toast({
          title: "Errore",
          description: "Manutenzione non trovata",
          variant: "destructive"
        });
        router.push("/maintenance");
        return;
      }

      setScheduleData(data);
    } catch (error) {
      console.error("Error loading schedule:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati della manutenzione",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartChecklist = async (templateId: string, checklistName: string) => {
    try {
      setStartingChecklist(templateId);

      // Get current user (technician)
      const { data: { user } } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.getUser());
      
      if (!user) {
        toast({
          title: "Errore",
          description: "Devi effettuare il login",
          variant: "destructive"
        });
        return;
      }

      // Create execution for this schedule
      const execution = await checklistService.createExecutionForSchedule(
        templateId,
        id as string,
        user.id
      );

      if (execution) {
        toast({
          title: "Checklist avviata",
          description: `Puoi iniziare a compilare: ${checklistName}`
        });

        // Redirect to checklist execution page
        router.push(`/checklist/${execution.id}`);
      }
    } catch (error) {
      console.error("Error starting checklist:", error);
      toast({
        title: "Errore",
        description: "Impossibile avviare la checklist",
        variant: "destructive"
      });
    } finally {
      setStartingChecklist(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Programmata", variant: "outline" },
      in_progress: { label: "In Corso", variant: "default" },
      completed: { label: "Completata", variant: "secondary" },
      overdue: { label: "In Ritardo", variant: "destructive" },
      cancelled: { label: "Annullata", variant: "destructive" }
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      low: { label: "Bassa", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      medium: { label: "Media", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      high: { label: "Alta", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
      critical: { label: "Critica", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" }
    };

    const config = priorityConfig[priority] || { label: priority, className: "" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!scheduleData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Manutenzione non trovata</p>
        </div>
      </MainLayout>
    );
  }

  const { checklists, checklistStats } = scheduleData;
  const completionPercentage = checklistStats.total > 0 
    ? Math.round((checklistStats.completed / checklistStats.total) * 100) 
    : 0;

  const pendingChecklists = checklists.filter((c: any) => !c.isCompleted);
  const completedChecklists = checklists.filter((c: any) => c.isCompleted);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/maintenance")}
            className="gap-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
            Torna alle Manutenzioni
          </Button>

          {getStatusBadge(scheduleData.status)}
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{scheduleData.title}</h1>
          <p className="text-muted-foreground">
            Dettaglio manutenzione programmata con checklist associate
          </p>
        </div>

        {/* Info Card */}
        <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Wrench className="h-5 w-5" />
              Informazioni Manutenzione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Equipaggiamento</p>
                <p className="font-medium">
                  {scheduleData.equipment?.name} ({scheduleData.equipment?.code})
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Tecnico Assegnato</p>
                <p className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {scheduleData.assigned_to?.full_name || "Non assegnato"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Data Programmata</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(scheduleData.scheduled_date).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>

              {scheduleData.due_date && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Scadenza</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {new Date(scheduleData.due_date).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Priorità</p>
                {getPriorityBadge(scheduleData.priority)}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipo Manutenzione</p>
                <p className="font-medium capitalize">{scheduleData.maintenance_type || "-"}</p>
              </div>
            </div>

            {scheduleData.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Descrizione</p>
                  <p className="text-sm">{scheduleData.description}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Progresso Checklist</CardTitle>
            <CardDescription>
              {checklistStats.completed} di {checklistStats.total} checklist completate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={completionPercentage} className="h-3" />
              
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{checklistStats.total}</p>
                  <p className="text-xs text-muted-foreground">Totali</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{checklistStats.completed}</p>
                  <p className="text-xs text-muted-foreground">Completate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{checklistStats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Corso</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-600">{checklistStats.notStarted}</p>
                  <p className="text-xs text-muted-foreground">Da Iniziare</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Checklists */}
        {pendingChecklists.length > 0 && (
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Circle className="h-5 w-5 text-blue-500" />
                Checklist da Eseguire ({pendingChecklists.length})
              </CardTitle>
              <CardDescription>
                Checklist che devono ancora essere completate per questa manutenzione
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingChecklists.map((checklist: any, index: number) => (
                  <div
                    key={checklist.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {checklist.execution_order || index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">
                            {checklist.template?.name}
                          </h4>
                          {checklist.template?.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {checklist.template.description}
                            </p>
                          )}
                        </div>

                        <Button
                          onClick={() => handleStartChecklist(
                            checklist.template_id,
                            checklist.template?.name
                          )}
                          disabled={startingChecklist === checklist.template_id}
                          className="flex-shrink-0 bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl"
                        >
                          {startingChecklist === checklist.template_id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Avvio...
                            </>
                          ) : (
                            <>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Esegui
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {checklist.is_required && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Obbligatoria
                          </Badge>
                        )}

                        {checklist.template?.estimated_time && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {checklist.template.estimated_time} min stimati
                          </span>
                        )}

                        {checklist.template?.category && (
                          <Badge variant="outline">{checklist.template.category}</Badge>
                        )}

                        {checklist.isInProgress && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            In Corso
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Checklists */}
        {completedChecklists.length > 0 && (
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Checklist Completate ({completedChecklists.length})
              </CardTitle>
              <CardDescription>
                Checklist già eseguite e completate con successo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedChecklists.map((checklist: any, index: number) => (
                  <div
                    key={checklist.id}
                    className="flex items-start gap-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20"
                  >
                    <div className="flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1">
                        {checklist.template?.name}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {checklist.completedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Completata il {new Date(checklist.completedAt).toLocaleDateString("it-IT", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        )}

                        {checklist.execution?.total_duration && (
                          <span className="flex items-center gap-1">
                            Durata: {checklist.execution.total_duration} min
                          </span>
                        )}
                      </div>

                      {checklist.execution?.id && (
                        <Link href={`/checklist/${checklist.execution.id}`}>
                          <Button variant="link" className="p-0 h-auto mt-2">
                            Visualizza Dettagli →
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {checklists.length === 0 && (
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="py-12 text-center">
              <Circle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nessuna Checklist Associata</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Questa manutenzione non ha checklist associate.
              </p>
              <Button variant="outline" onClick={() => router.push("/checklists")}>
                Vai alle Checklist
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}