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
import { ArrowLeft, Save, Plus, Trash2, Play } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";

type PlanChecklistRow = {
    id: string;
    plan_id: string;
    template_id: string;
    is_required: boolean;
    execution_order: number;
    template?: { id: string; name: string; description: string | null };
};

function canManage(role?: string) {
    return role === "admin" || role === "supervisor";
}

export default function EditMaintenancePlan() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [userRole, setUserRole] = useState < string > ("technician");
    const canEdit = canManage(userRole);

    const [templates, setTemplates] = useState < any[] > ([]);
    const [templateSearch, setTemplateSearch] = useState("");

    const [planChecklists, setPlanChecklists] = useState < PlanChecklistRow[] > ([]);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        frequency_type: "months",
        frequency_value: 1,
        next_due_date: "",
        priority: "medium",
    });

    useEffect(() => {
        (async () => {
            const ctx = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }
            setUserRole(ctx.role);
        })();
    }, [router]);

    useEffect(() => {
        if (id && typeof id === "string") {
            loadPlan(id);
            loadTemplates();
            loadPlanChecklists(id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const loadTemplates = async () => {
        const { data, error } = await supabase
            .from("checklist_templates")
            .select("id,name,description,target_type,is_active")
            .eq("is_active", true)
            .order("name");
        if (!error && data) {
            setTemplates(data.filter((x: any) => (x.target_type ?? "machine") === "machine"));
        }
    };

    const loadPlanChecklists = async (planId: string) => {
        const { data, error } = await supabase
            .from("maintenance_plan_checklists")
            .select(`id, plan_id, template_id, is_required, execution_order, template:checklist_templates(id,name,description)`)
            .eq("plan_id", planId)
            .order("execution_order", { ascending: true });

        // If the table isn't deployed yet, don't break the page.
        if (error && error.code === "42P01") {
            setPlanChecklists([]);
            return;
        }

        if (!error && data) {
            setPlanChecklists(data as any);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) {
            toast({ title: t("common.error"), description: "Solo Admin/Supervisor possono modificare.", variant: "destructive" });
            return;
        }

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

    const availableTemplates = templates.filter((tpl: any) => {
        const already = planChecklists.some((pc) => pc.template_id === tpl.id);
        if (already) return false;
        if (!templateSearch.trim()) return true;
        const q = templateSearch.toLowerCase();
        return (
            (tpl.name ?? "").toLowerCase().includes(q) ||
            (tpl.description ?? "").toLowerCase().includes(q)
        );
    });

    const addTemplateToPlan = async (templateId: string) => {
        if (!id || typeof id !== "string") return;
        if (!canEdit) return;

        const nextOrder = (planChecklists[planChecklists.length - 1]?.execution_order ?? 0) + 1;

        const { error } = await supabase
            .from("maintenance_plan_checklists")
            .insert({
                plan_id: id,
                template_id: templateId,
                is_required: true,
                execution_order: nextOrder,
            });

        if (error) {
            toast({ title: t("common.error"), description: error.message, variant: "destructive" });
            return;
        }

        await loadPlanChecklists(id);
    };

    const removeTemplateFromPlan = async (rowId: string) => {
        if (!id || typeof id !== "string") return;
        if (!canEdit) return;

        const { error } = await supabase
            .from("maintenance_plan_checklists")
            .delete()
            .eq("id", rowId);

        if (error) {
            toast({ title: t("common.error"), description: error.message, variant: "destructive" });
            return;
        }

        await loadPlanChecklists(id);
    };

    const startWorkOrderFromPlan = async () => {
        // Lightweight: redirect to work order creation with preselected maintenance plan
        if (!id || typeof id !== "string") return;
        router.push(`/work-orders/new?maintenance_plan_id=${id}`);
    };

    if (loading) return <MainLayout><div className="text-foreground">{t("common.loading")}</div></MainLayout>;

    return (
        <MainLayout>
            <SEO title={`${t("maintenance.editMaintenance")} - Machina`} />
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-foreground hover:bg-muted">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-foreground">{t("maintenance.editMaintenance")}</h1>
                </div>

                {!canEdit && (
                    <Card className="border border-orange-500/30 bg-orange-500/10">
                        <CardContent className="p-4 text-orange-200">
                            Solo <b>Admin</b> e <b>Supervisor</b> possono modificare piani e checklist. Sei in sola lettura.
                        </CardContent>
                    </Card>
                )}

                <form onSubmit={handleSubmit}>
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <CardTitle className="text-foreground">{t("maintenance.details")}</CardTitle>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={startWorkOrderFromPlan}>
                                        <Play className="h-4 w-4 mr-2" />
                                        Crea Work Order
                                    </Button>
                                    <Button type="submit" disabled={!canEdit || saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                        <Save className="h-4 w-4 mr-2" />
                                        {saving ? t("common.saving") : t("common.save")}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-foreground">{t("common.title")}</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    disabled={!canEdit}
                                    className="bg-background border-border text-foreground"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-foreground">{t("common.description")}</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    disabled={!canEdit}
                                    className="bg-background border-border text-foreground"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-foreground">{t("maintenance.frequency")}</Label>
                                    <Select
                                        value={formData.frequency_type}
                                        onValueChange={(v) => setFormData({ ...formData, frequency_type: v })}
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger className="bg-background border-border text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="days">Giorni</SelectItem>
                                            <SelectItem value="weeks">Settimane</SelectItem>
                                            <SelectItem value="months">Mesi</SelectItem>
                                            <SelectItem value="years">Anni</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-foreground">{t("maintenance.every")}</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={String(formData.frequency_value)}
                                        onChange={(e) => setFormData({ ...formData, frequency_value: Number(e.target.value) })}
                                        disabled={!canEdit}
                                        className="bg-background border-border text-foreground"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-foreground">{t("maintenance.nextDue")}</Label>
                                    <Input
                                        type="date"
                                        value={formData.next_due_date}
                                        onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                                        disabled={!canEdit}
                                        className="bg-background border-border text-foreground"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-foreground">{t("common.priority")}</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(v) => setFormData({ ...formData, priority: v })}
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger className="bg-background border-border text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">{t("common.low")}</SelectItem>
                                            <SelectItem value="medium">{t("common.medium")}</SelectItem>
                                            <SelectItem value="high">{t("common.high")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </form>

                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-foreground">Checklist del piano</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            Qui colleghi i template checklist al piano di manutenzione (ordine di esecuzione 1..n).
                        </div>

                        <div className="space-y-2">
                            {planChecklists.length === 0 ? (
                                <div className="text-sm text-muted-foreground">Nessuna checklist collegata.</div>
                            ) : (
                                planChecklists.map((pc) => (
                                    <div key={pc.id} className="flex items-start justify-between gap-3 p-3 rounded-md border border-border bg-background">
                                        <div>
                                            <div className="text-sm font-medium text-foreground">
                                                {pc.execution_order}. {pc.template?.name ?? "Template"}
                                            </div>
                                            {pc.template?.description ? (
                                                <div className="text-xs text-muted-foreground">{pc.template.description}</div>
                                            ) : null}
                                        </div>
                                        {canEdit && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                                onClick={() => removeTemplateFromPlan(pc.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {canEdit && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={templateSearch}
                                        onChange={(e) => setTemplateSearch(e.target.value)}
                                        placeholder="Cerca template..."
                                        className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div className="max-h-56 overflow-auto space-y-2">
                                    {availableTemplates.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">Nessun template disponibile</div>
                                    ) : (
                                        availableTemplates.map((tpl: any) => (
                                            <div key={tpl.id} className="flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-background">
                                                <div>
                                                    <div className="text-sm font-medium text-foreground">{tpl.name}</div>
                                                    {tpl.description ? (
                                                        <div className="text-xs text-muted-foreground">{tpl.description}</div>
                                                    ) : null}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => addTemplateToPlan(tpl.id)}
                                                >
                                                    <Plus className="h-4 w-4 mr-2" /> Aggiungi
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {!canEdit && (
                            <div className="text-xs text-muted-foreground">
                                Permessi insufficienti per modificare le checklist collegate.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}

