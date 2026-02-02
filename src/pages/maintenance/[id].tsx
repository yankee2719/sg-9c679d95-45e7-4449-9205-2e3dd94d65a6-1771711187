import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { maintenanceService } from "@/services/maintenanceService";
import { ArrowLeft, Edit, Trash2, CheckCircle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MaintenanceScheduleDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
              <CardTitle className="text-white">{t("maintenance.details")}</CardTitle>
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
                <span className="text-slate-400">{t("maintenance.lastPerformed")}</span>
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
          <Button size="lg" className="w-full md:w-auto bg-[#FF6B35] hover:bg-[#e55a2b]" onClick={() => router.push(`/checklist/execute?schedule=${schedule.id}&equipment=${schedule.equipment_id}`)}>
            <CheckCircle className="mr-2 h-5 w-5" />
            {t("maintenance.performNow")}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}