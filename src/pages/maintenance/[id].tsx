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

const statusConfig: Record<string, { label: string; color: string }> = {
    scheduled: { label: "Programmata", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    pending: { label: "In attesa", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    in_progress: { label: "In corso", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    completed: { label: "Completata", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    cancelled: { label: "Annullata", color: "bg-slate-500/20 text-muted-foreground border-slate-500/30" },
};

export default function MaintenanceScheduleDetail() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { t } = useLanguage();

    const [schedule, setSchedule] = useState < any > (null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState < "admin" | "supervisor" | "technician" > ("technician");

    useEffect(() => {
        if (id && typeof id === "string") {
            loadSchedule(id);
        }
    }, [id]);

    const loadSchedule = async (scheduleId: string) => {
        try {
            // Get user role
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();
                if (profile) {
                    setUserRole(profile.role as "admin" | "supervisor" | "technician");
                }
            }

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

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    if (loading) return <MainLayout><div className="text-foreground">{t("common.loading")}</div></MainLayout>;
    if (!schedule) return <MainLayout><div className="text-foreground">{t("maintenance.notFound")}</div></MainLayout>;

    const status = statusConfig[schedule.status] || statusConfig.scheduled;

    return (
        <MainLayout>
            <SEO title={schedule.title || t("maintenance.title")} />
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-foreground hover:bg-muted">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{schedule.title || t("maintenance.title")}</h1>
                            <p className="text-muted-foreground">
                                {t("equipment.title")}: {schedule.equipment?.name}
                            </p>
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.push(`/maintenance/edit/${schedule.id}`)} className="border-border text-foreground hover:bg-muted">
                                <Edit className="h-4 w-4 mr-2" />
                                {t("common.edit")}
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("common.delete")}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground">{t("maintenance.scheduleDetails")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <span className="text-muted-foreground">{t("common.status")}</span>
                                <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${status.color}`}>
                                    {status.label}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <span className="text-muted-foreground">{t("maintenance.frequency")}</span>
                                <span className="text-foreground">{schedule.frequency}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <span className="text-muted-foreground">{t("maintenance.nextDue")}</span>
                                <span className="font-medium text-blue-400">
                                    {schedule.next_due_date ? new Date(schedule.next_due_date).toLocaleDateString() : "N/A"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <span className="text-muted-foreground">{t("maintenance.lastPerformedAt")}</span>
                                <span className="text-foreground">
                                    {schedule.last_performed_at
                                        ? new Date(schedule.last_performed_at).toLocaleDateString()
                                        : t("common.never")}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground">{t("common.description")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                                {schedule.description || t("common.noDescription")}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {schedule.status !== "completed" && (
                    <div className="flex justify-center pt-6">
                        <Button size="lg" className="w-full md:w-auto bg-[#FF6B35] hover:bg-[#e55a2b]" onClick={() => router.push(`/checklist/execute?schedule=${schedule.id}&equipment=${schedule.equipment_id}`)}>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            {t("maintenance.performMaintenance")}
                        </Button>
                    </div>
                )}

                {schedule.status === "completed" && (
                    <Card className="bg-green-500/10 border-green-500/30">
                        <CardContent className="p-6 text-center">
                            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-green-400">Manutenzione completata</h3>
                            <p className="text-muted-foreground mt-1">
                                Eseguita il {schedule.last_performed_at ? new Date(schedule.last_performed_at).toLocaleDateString("it-IT") : ""}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}