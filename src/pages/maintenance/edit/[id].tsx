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
import { maintenancePlanService } from "@/services/maintenanceService";
import { ArrowLeft, Save } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EditMaintenancePlan() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        frequency_type: "months",
        frequency_value: 1,
        next_due_date: "",
        priority: "medium",
    });

    useEffect(() => {
        if (id && typeof id === "string") {
            loadPlan(id);
        }
    }, [id]);

    const loadPlan = async (planId: string) => {
        try {
            const plan = await maintenancePlanService.getPlanById(planId);
            if (plan) {
                setFormData({
                    title: plan.title || "",
                    description: plan.description || "",
                    frequency_type: plan.frequency_type || "months",
                    frequency_value: plan.frequency_value || 1,
                    next_due_date: plan.next_due_date
                        ? new Date(plan.next_due_date).toISOString().split("T")[0]
                        : "",
                    priority: plan.priority || "medium",
                });
            }
        } catch (error) {
            console.error("Error loading plan:", error);
            toast({ title: t("common.error"), description: t("maintenance.loadError"), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await maintenancePlanService.updatePlan(id as string, {
                ...formData,
                frequency_value: Number(formData.frequency_value),
                next_due_date: formData.next_due_date || null,
            } as any);
            toast({ title: t("common.success"), description: t("maintenance.updateSuccess") });
            router.push("/maintenance");
        } catch (error) {
            console.error(error);
            toast({ title: t("common.error"), description: t("maintenance.updateError"), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <MainLayout><div className="text-foreground">{t("common.loading")}</div></MainLayout>;

    return (
        <MainLayout>
            <SEO title={`${t("maintenance.editMaintenance")} - Machina`} />
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-foreground hover:bg-muted">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-foreground">{t("maintenance.editMaintenance")}</h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground">{t("maintenance.details")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-foreground">{t("common.title")}</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="bg-background border-border text-foreground"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-foreground">{t("common.description")}</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="bg-background border-border text-foreground"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-foreground">{t("maintenance.frequency")}</Label>
                                    <Select
                                        value={formData.frequency_type}
                                        onValueChange={(v) => setFormData({ ...formData, frequency_type: v })}
                                    >
                                        <SelectTrigger className="bg-background border-border text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="days">Giorni</SelectItem>
                                            <SelectItem value="weeks">Settimane</SelectItem>
                                            <SelectItem value="months">Mesi</SelectItem>
                                            <SelectItem value="hours">Ore</SelectItem>
                                            <SelectItem value="cycles">Cicli</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-foreground">Valore</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.frequency_value}
                                        onChange={(e) => setFormData({ ...formData, frequency_value: Number(e.target.value) })}
                                        className="bg-background border-border text-foreground"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-foreground">{t("maintenance.nextDue")}</Label>
                                <Input
                                    type="date"
                                    value={formData.next_due_date}
                                    onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                                    className="bg-background border-border text-foreground"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-foreground">Priorità</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                                >
                                    <SelectTrigger className="bg-background border-border text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Bassa</SelectItem>
                                        <SelectItem value="medium">Media</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="critical">Critica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4 mt-6">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            {t("common.cancel")}
                        </Button>
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
