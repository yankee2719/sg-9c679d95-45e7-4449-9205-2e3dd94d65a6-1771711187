import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { maintenanceService } from "@/services/maintenanceService";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Edit, Trash2, CheckCircle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function MaintenanceScheduleDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [timeSpent, setTimeSpent] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  useEffect(() => {
    if (id && typeof id === "string") {
      loadSchedule(id);
    }
  }, [id]);

  const loadSchedule = async (scheduleId: string) => {
    try {
      const schedules = await maintenanceService.getSchedules();
      const found = schedules.find((s: any) => s.id === scheduleId);
      setSchedule(found || null);
    } catch (error) {
      console.error("Error loading schedule:", error);
      toast({
        title: t("common.error"),
        description: t("maintenance.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("maintenance.confirmDelete"))) return;
    try {
      await maintenanceService.deleteSchedule(id as string);
      toast({
        title: t("common.success"),
        description: t("maintenance.deleteSuccess"),
      });
      router.push("/maintenance");
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("maintenance.deleteError"),
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    try {
      // First create a maintenance log if it doesn't exist
      const logs = await maintenanceService.getLogs(schedule.equipment_id);
      let logId = logs.find((log: any) => log.schedule_id === schedule.id)?.id;

      if (!logId) {
        // Create a new log entry
        const { data: session } = await supabase.auth.getSession();
        const newLog = await maintenanceService.createLog({
          equipment_id: schedule.equipment_id,
          performed_by: session?.session?.user?.id || "",
          title: schedule.title,
          description: schedule.description || "",
          schedule_id: schedule.id,
          status: "completed"
        });
        logId = newLog.id;
      }

      // Complete the log
      await maintenanceService.completeLog(logId, {
        time_spent_minutes: timeSpent ? parseInt(timeSpent) : undefined,
        notes: completionNotes || undefined
      });

      // Update the schedule's last_performed_at
      await maintenanceService.updateSchedule(schedule.id, {
        last_performed_at: new Date().toISOString()
      });

      toast({
        title: t("common.success"),
        description: "Manutenzione completata con successo",
      });

      setShowCompleteDialog(false);
      loadSchedule(id as string);
    } catch (error) {
      console.error("Error completing maintenance:", error);
      toast({
        title: t("common.error"),
        description: "Errore durante il completamento della manutenzione",
        variant: "destructive",
      });
    }
  };

  if (loading) return <MainLayout><div className="text-white">{t("common.loading")}</div></MainLayout>;
  if (!schedule) return <MainLayout><div className="text-white">{t("maintenance.notFound")}</div></MainLayout>;

  return (
    <MainLayout>
      <SEO title={schedule.title || t("maintenance.title")} />
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-slate-700">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{schedule.title || t("maintenance.title")}</h1>
              <p className="text-slate-400">
                {t("equipment.title")}: {schedule.equipment?.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/maintenance/edit/${schedule.id}`)} className="border-slate-600 text-white hover:bg-slate-700">
              <Edit className="h-4 w-4 mr-2" />
              {t("common.edit")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t("common.delete")}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t("maintenance.scheduleDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-slate-400">{t("common.status")}</span>
                <Badge variant="default">
                  {t("checklists.active")}
                </Badge>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-slate-400">{t("maintenance.frequency")}</span>
                <span className="text-white">{schedule.frequency}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-slate-400">{t("maintenance.nextDue")}</span>
                <span className="font-medium text-blue-400">
                  {schedule.next_due_date ? new Date(schedule.next_due_date).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-slate-400">{t("maintenance.lastPerformedAt")}</span>
                <span className="text-white">
                  {schedule.last_performed_at 
                    ? new Date(schedule.last_performed_at).toLocaleDateString() 
                    : t("common.never")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{t("common.description")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 whitespace-pre-wrap">
                {schedule.description || t("common.noDescription")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-6">
          <Button size="lg" className="w-full md:w-auto bg-[#FF6B35] hover:bg-[#e55a2b]" onClick={() => setShowCompleteDialog(true)}>
            <CheckCircle className="mr-2 h-5 w-5" />
            Completa Manutenzione
          </Button>
        </div>

        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Completa Manutenzione</DialogTitle>
              <DialogDescription className="text-slate-400">
                Inserisci i dettagli del completamento della manutenzione
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="timeSpent">Tempo impiegato (minuti)</Label>
                <Input
                  id="timeSpent"
                  type="number"
                  placeholder="Es: 120"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Note (opzionale)</Label>
                <Textarea
                  id="notes"
                  placeholder="Aggiungi note sul lavoro svolto..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)} className="border-slate-600 text-white hover:bg-slate-700">
                Annulla
              </Button>
              <Button onClick={handleComplete} className="bg-[#FF6B35] hover:bg-[#e55a2b]">
                Completa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}