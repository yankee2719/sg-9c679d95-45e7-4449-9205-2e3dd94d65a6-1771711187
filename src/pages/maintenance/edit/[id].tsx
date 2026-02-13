import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import maintenanceService from "@/services/maintenanceService";
import { getAllEquipment } from "@/services/equipmentService";
import { checklistService } from "@/services/checklistService";
import { ArrowLeft, Save } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EditMaintenanceSchedule() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [equipmentList, setEquipmentList] = useState < any[] > ([]);
    const [checklists, setChecklists] = useState < any[] > ([]);

    const [formData, setFormData] = useState({
        equipment_id: "",
        title: "",
        description: "",
        frequency: "monthly",
        next_due_date: "",
        assigned_to: "",
        checklist_id: ""
    });

    useEffect(() => {
        loadEquipment();
        loadChecklists();
        if (id && typeof id === "string") {
            loadSchedule(id);
        }
    }, [id]);

    const loadEquipment = async () => {
        try {
            const data = await getAllEquipment();
            setEquipmentList(data);
        } catch (error) {
            console.error("Error loading equipment:", error);
        }
    };

    const loadChecklists = async () => {
        try {
            const data = await checklistService.getAllChecklists();
            setChecklists(data);
        } catch (error) {
            console.error("Error loading checklists:", error);
        }
    };

    const loadSchedule = async (scheduleId: string) => {
        try {
            const schedules = await maintenanceService.getSchedules();
            const data = schedules.find((s: any) => s.id === scheduleId);
            if (data) {
                setFormData({
                    equipment_id: data.equipment_id,
                    title: data.title,
                    description: data.description || "",
                    frequency: data.frequency,
                    next_due_date: data.next_due_date ? new Date(data.next_due_date).toISOString().split("T")[0] : "",
                    assigned_to: data.assigned_to || "",
                    checklist_id: data.checklist_id || ""
                });
            }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await maintenanceService.updateSchedule(id as string, {
                ...formData,
                checklist_id: formData.checklist_id || null
            });
            toast({
                title: t("common.success"),
                description: t("maintenance.updateSuccess"),
            });
            router.push("/maintenance");
        } catch (error) {
            console.error(error);
            toast({
                title: t("common.error"),
                description: t("maintenance.updateError"),
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <MainLayout><div className="text-white">{t("common.loading")}</div></MainLayout>;

    return (
        <MainLayout>
            <SEO title={`${t("maintenance.editMaintenance")} - Maint Ops`} />
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">{t("maintenance.editMaintenance")}</h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white">{t("maintenance.details")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="equipment" className="text-white">{t("equipment.title")}</Label>
                                <Select
                                    value={formData.equipment_id}
                                    onValueChange={(value) => setFormData({ ...formData, equipment_id: value })}
                                >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue placeholder={t("maintenance.selectEquipment")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        {equipmentList.map((eq) => (
                                            <SelectItem key={eq.id} value={eq.id} className="text-white">
                                                {eq.name} ({eq.equipment_code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="title" className="text-white">{t("common.title")}</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={t("maintenance.titlePlaceholder")}
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description" className="text-white">{t("common.description")}</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="frequency" className="text-white">{t("maintenance.frequency")}</Label>
                                <Select
                                    value={formData.frequency}
                                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                                >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="daily" className="text-white">{t("maintenance.daily")}</SelectItem>
                                        <SelectItem value="weekly" className="text-white">{t("maintenance.weekly")}</SelectItem>
                                        <SelectItem value="monthly" className="text-white">{t("maintenance.monthly")}</SelectItem>
                                        <SelectItem value="quarterly" className="text-white">{t("maintenance.quarterly")}</SelectItem>
                                        <SelectItem value="yearly" className="text-white">{t("maintenance.yearly")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="date" className="text-white">{t("maintenance.nextDue")}</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.next_due_date}
                                    onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="checklist" className="text-white">{t("checklists.associatedChecklist")}</Label>
                                <Select
                                    value={formData.checklist_id}
                                    onValueChange={(value) => setFormData({ ...formData, checklist_id: value })}
                                >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue placeholder={t("checklists.selectChecklist")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        {checklists.map((checklist) => (
                                            <SelectItem key={checklist.id} value={checklist.id} className="text-white">
                                                {checklist.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4 mt-6">
                        <Button type="button" variant="outline" onClick={() => router.back()} className="border-slate-600 text-slate-300 hover:bg-slate-700">{t("common.cancel")}</Button>
                        <Button type="submit" disabled={saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? t("common.saving") : t("common.save")}
                        </Button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
}
