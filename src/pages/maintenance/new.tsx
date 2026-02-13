import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { getAllEquipment } from "@/services/equipmentService";
import { checklistService } from "@/services/checklistService";
import { getMaintenanceService } from "@/services/maintenanceService";
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
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

// ✅ Singleton fuori dal componente
const maintenanceService = getMaintenanceService();

// ✅ Helper per convertire frequency in frequency_days
const frequencyToDays: Record<string, number> = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    yearly: 365,
};

export default function NewMaintenancePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();
    const [checklists, setChecklists] = useState < any[] > ([]);
    const [loading, setLoading] = useState(false);
    const [equipment, setEquipment] = useState < any[] > ([]);
    const [technicians, setTechnicians] = useState < any[] > ([]);

    // ✅ State aggiornato per createMaintenancePlan
    const [formData, setFormData] = useState({
        equipment_id: "",
        plant_id: "", // opzionale
        title: "",
        description: "",
        plan_type: "time_based" as "time_based" | "usage_based" | "condition_based" | "predictive",
        priority: "medium" as "critical" | "high" | "medium" | "low",
        frequency_days: 30, // default monthly
        frequency_hours: undefined as number | undefined,
        usage_threshold: undefined as number | undefined,
        usage_unit: "",
        estimated_duration_minutes: undefined as number | undefined,
        required_skills: [] as string[],
        checklist_template: null as any,
        required_parts: null as any,
        required_tools: [] as string[],
        safety_notes: "",
        requires_shutdown: false,
        compliance_tags: [] as string[],
        next_due_date: "",
        assigned_to: "",
        checklist_id: "",
        frequency: "monthly", // per UI
    });

    useEffect(() => {
        loadEquipment();
        loadChecklists();
        loadTechnicians();
    }, []);

    const loadEquipment = async () => {
        try {
            const data = await getAllEquipment();
            setEquipment(data);
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

    const loadTechnicians = async () => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .eq("role", "technician")
                .order("full_name");

            if (error) throw error;
            setTechnicians(data || []);
        } catch (error) {
            console.error("Error loading technicians:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // ✅ Ottieni user e organization dal contesto o supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Ottieni organization_id dal profilo utente o dal contesto
            const { data: profile } = await supabase
                .from("profiles")
                .select("organization_id")
                .eq("id", user.id)
                .single();

            const organizationId = profile?.organization_id;
            if (!organizationId) throw new Error("Organization not found");

            // ✅ Crea il piano di manutenzione
            const result = await maintenanceService.createMaintenancePlan(
                {
                    equipment_id: formData.equipment_id,
                    plant_id: formData.plant_id || undefined,
                    title: formData.title,
                    description: formData.description || undefined,
                    plan_type: formData.plan_type,
                    priority: formData.priority,
                    frequency_days: frequencyToDays[formData.frequency] || formData.frequency_days,
                    frequency_hours: formData.frequency_hours,
                    usage_threshold: formData.usage_threshold,
                    usage_unit: formData.usage_unit || undefined,
                    estimated_duration_minutes: formData.estimated_duration_minutes,
                    required_skills: formData.required_skills.length > 0 ? formData.required_skills : undefined,
                    checklist_template: formData.checklist_id ? { checklist_id: formData.checklist_id } : undefined,
                    required_parts: formData.required_parts,
                    required_tools: formData.required_tools.length > 0 ? formData.required_tools : undefined,
                    safety_notes: formData.safety_notes || undefined,
                    requires_shutdown: formData.requires_shutdown,
                    compliance_tags: formData.compliance_tags.length > 0 ? formData.compliance_tags : undefined,
                },
                user.id,
                organizationId
            );

            toast({
                title: t("common.success"),
                description: t("maintenance.createSuccess"),
            });

            router.push("/maintenance");
        } catch (error: any) {
            console.error("Error creating maintenance:", error);
            toast({
                variant: "destructive",
                title: t("common.error"),
                description: error.message || t("maintenance.createError"),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <MainLayout userRole="admin">
            <SEO title={`${t("maintenance.newMaintenance")} - Maint Ops`} />

            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t("common.back")}
                    </Button>
                    <h1 className="text-2xl font-bold text-white">
                        {t("maintenance.newMaintenance")}
                    </h1>
                </div>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">{t("maintenance.details")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="equipment" className="text-white">
                                        {t("equipment.title")} *
                                    </Label>
                                    <Select
                                        value={formData.equipment_id}
                                        onValueChange={(value) => handleChange("equipment_id", value)}
                                        required
                                    >
                                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                            <SelectValue placeholder={t("maintenance.selectEquipment")} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            {equipment.map((eq) => (
                                                <SelectItem key={eq.id} value={eq.id} className="text-white">
                                                    {eq.name} ({eq.equipment_code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="frequency" className="text-white">
                                        {t("maintenance.frequency")} *
                                    </Label>
                                    <Select
                                        value={formData.frequency}
                                        onValueChange={(value) => handleChange("frequency", value)}
                                        required
                                    >
                                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            <SelectItem value="daily" className="text-white">
                                                {t("maintenance.daily")}
                                            </SelectItem>
                                            <SelectItem value="weekly" className="text-white">
                                                {t("maintenance.weekly")}
                                            </SelectItem>
                                            <SelectItem value="monthly" className="text-white">
                                                {t("maintenance.monthly")}
                                            </SelectItem>
                                            <SelectItem value="quarterly" className="text-white">
                                                {t("maintenance.quarterly")}
                                            </SelectItem>
                                            <SelectItem value="yearly" className="text-white">
                                                {t("maintenance.yearly")}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="title" className="text-white">
                                        {t("common.title")} *
                                    </Label>
                                    <Input
                                        id="title"
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => handleChange("title", e.target.value)}
                                        placeholder={t("maintenance.titlePlaceholder")}
                                        required
                                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="next_due_date" className="text-white">
                                        {t("maintenance.nextDue")} *
                                    </Label>
                                    <Input
                                        id="next_due_date"
                                        type="date"
                                        value={formData.next_due_date}
                                        onChange={(e) => handleChange("next_due_date", e.target.value)}
                                        required
                                        className="bg-slate-700 border-slate-600 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="technician" className="text-white">
                                        {t("maintenance.assignTo")}
                                    </Label>
                                    <Select
                                        value={formData.assigned_to}
                                        onValueChange={(value) => handleChange("assigned_to", value)}
                                    >
                                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                            <SelectValue placeholder={t("maintenance.selectTechnician")} />
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

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="checklist" className="text-white">
                                        {t("checklists.associatedChecklist")}
                                    </Label>
                                    <Select
                                        value={formData.checklist_id}
                                        onValueChange={(value) => handleChange("checklist_id", value)}
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
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-white">
                                    {t("common.description")}
                                </Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                    rows={4}
                                    placeholder={t("maintenance.descriptionPlaceholder")}
                                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    {t("common.cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t("common.saving")}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            {t("common.create")}
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