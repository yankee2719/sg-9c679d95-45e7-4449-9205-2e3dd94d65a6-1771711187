import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NewMaintenancePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [machines, setMachines] = useState < any[] > ([]);
    const [checklists, setChecklists] = useState < any[] > ([]);
    const [technicians, setTechnicians] = useState < any[] > ([]);
    const [formData, setFormData] = useState({
        machine_id: "",
        title: "",
        description: "",
        instructions: "",
        frequency_type: "monthly",
        next_due_date: "",
        default_assignee_id: "",
        priority: "medium",
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const ctx = await getUserContext();
            if (!ctx) return;

            // Load machines
            const { data: machineData } = await supabase
                .from("machines").select("id, name, internal_code").order("name");
            if (machineData) setMachines(machineData);

            // Load checklists
            const { data: checklistData } = await supabase
                .from("checklists").select("id, title").eq("is_active", true).order("title");
            if (checklistData) setChecklists(checklistData);

            // Load technicians from organization_memberships + profiles
            if (ctx.orgId) {
                const { data: members } = await supabase
                    .from("organization_memberships")
                    .select("user_id, role")
                    .eq("organization_id", ctx.orgId)
                    .eq("is_active", true);

                if (members) {
                    const userIds = members.map(m => m.user_id);
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .in("id", userIds);

                    if (profiles) {
                        setTechnicians(profiles.map(p => ({
                            id: p.id,
                            name: p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email,
                        })));
                    }
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const ctx = await getUserContext();
            if (!ctx) throw new Error("Not authenticated");

            const { error } = await supabase.from("maintenance_plans").insert({
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                instructions: formData.instructions.trim() || null,
                machine_id: formData.machine_id || null,
                frequency_type: formData.frequency_type,
                frequency_value: 1,
                next_due_date: formData.next_due_date || null,
                default_assignee_id: formData.default_assignee_id || null,
                priority: formData.priority,
                organization_id: ctx.orgId,
                created_by: ctx.userId,
                is_active: true,
            });

            if (error) throw error;

            toast({ title: t("common.success"), description: t("maintenance.createSuccess") });
            router.push("/maintenance");
        } catch (error: any) {
            console.error("Error creating maintenance:", error);
            toast({ variant: "destructive", title: t("common.error"), description: error?.message || t("maintenance.createError") });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <MainLayout userRole="admin">
            <SEO title={`${t("maintenance.newMaintenance")} - MACHINA`} />

            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t("common.back")}
                    </Button>
                    <h1 className="text-2xl font-bold text-foreground">{t("maintenance.newMaintenance")}</h1>
                </div>

                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-foreground">{t("maintenance.details")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.title")} *</Label>
                                    <Select value={formData.machine_id} onValueChange={(v) => handleChange("machine_id", v)} required>
                                        <SelectTrigger className="bg-muted border-border text-foreground">
                                            <SelectValue placeholder={t("maintenance.selectEquipment")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {machines.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name} ({m.internal_code})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("maintenance.frequency")} *</Label>
                                    <Select value={formData.frequency_type} onValueChange={(v) => handleChange("frequency_type", v)} required>
                                        <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">{t("maintenance.daily")}</SelectItem>
                                            <SelectItem value="weekly">{t("maintenance.weekly")}</SelectItem>
                                            <SelectItem value="monthly">{t("maintenance.monthly")}</SelectItem>
                                            <SelectItem value="quarterly">{t("maintenance.quarterly")}</SelectItem>
                                            <SelectItem value="yearly">{t("maintenance.yearly")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-foreground">{t("maintenance.titleLabel")} *</Label>
                                    <Input value={formData.title} onChange={(e) => handleChange("title", e.target.value)}
                                        placeholder={t("maintenance.titlePlaceholder")} required
                                        className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("maintenance.nextDue")} *</Label>
                                    <Input type="date" value={formData.next_due_date} onChange={(e) => handleChange("next_due_date", e.target.value)}
                                        required className="bg-muted border-border text-foreground" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("common.priority")}</Label>
                                    <Select value={formData.priority} onValueChange={(v) => handleChange("priority", v)}>
                                        <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="high">{t("common.high")}</SelectItem>
                                            <SelectItem value="medium">{t("common.medium")}</SelectItem>
                                            <SelectItem value="low">{t("common.low")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("maintenance.assignTo")}</Label>
                                    <Select value={formData.default_assignee_id} onValueChange={(v) => handleChange("default_assignee_id", v)}>
                                        <SelectTrigger className="bg-muted border-border text-foreground">
                                            <SelectValue placeholder={t("maintenance.selectTechnician")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {technicians.map((tech) => (
                                                <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-foreground">{t("common.description")}</Label>
                                <Textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)}
                                    rows={3} placeholder={t("maintenance.descriptionPlaceholder")}
                                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-foreground">Istruzioni</Label>
                                <Textarea value={formData.instructions} onChange={(e) => handleChange("instructions", e.target.value)}
                                    rows={3} placeholder="Istruzioni dettagliate per l'esecuzione..."
                                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    {t("common.cancel")}
                                </Button>
                                <Button type="submit" className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" disabled={loading}>
                                    {loading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio...</>
                                    ) : (
                                        <><Save className="mr-2 h-4 w-4" /> {t("common.create")}</>
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

