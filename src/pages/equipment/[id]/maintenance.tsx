import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardCheck, Plus, Wrench, CalendarClock } from "lucide-react";

type MachineRow = { id: string; organization_id: string; name: string; internal_code: string | null; serial_number: string | null; plant_id: string | null; production_line_id: string | null; };
type WorkOrderRow = { id: string; title: string; status: string; priority: string; due_date: string | null; created_at: string; };
type ChecklistAssignmentRow = { id: string; template_id: string; is_active: boolean | null; };
type ChecklistTemplateRow = { id: string; name: string; version: number | null; };

function formatDateTime(value: string | null, lang: string) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
    return d.toLocaleString(locale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function EquipmentMaintenancePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t, language } = useLanguage();
    const machineId = useMemo(() => { const raw = router.query.id; return typeof raw === "string" ? raw : null; }, [router.query.id]);

    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [machine, setMachine] = useState < MachineRow | null > (null);
    const [workOrders, setWorkOrders] = useState < WorkOrderRow[] > ([]);
    const [checklists, setChecklists] = useState < (ChecklistAssignmentRow & { template?: ChecklistTemplateRow | null })[] > ([]);
    const canCreate = role === "admin" || role === "supervisor";

    useEffect(() => {
        const load = async () => {
            if (!machineId) return;
            setLoading(true);
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                const activeOrgId = ctx.orgId ?? null;
                if (!activeOrgId) throw new Error("No active organization");
                setRole(ctx.role ?? "technician"); setOrgId(activeOrgId);
                const { data: machineRow, error: machineErr } = await supabase.from("machines").select("id, organization_id, name, internal_code, serial_number, plant_id, production_line_id").eq("id", machineId).eq("organization_id", activeOrgId).single();
                if (machineErr) throw machineErr;
                setMachine(machineRow as MachineRow);
                const [{ data: workRows, error: workErr }, { data: assignmentRows, error: assignmentErr }] = await Promise.all([
                    supabase.from("work_orders").select("id, title, status, priority, due_date, created_at").eq("organization_id", activeOrgId).eq("machine_id", machineId).order("created_at", { ascending: false }),
                    supabase.from("checklist_assignments").select("id, template_id, is_active").eq("organization_id", activeOrgId).eq("machine_id", machineId).eq("is_active", true),
                ]);
                if (workErr) throw workErr; if (assignmentErr) throw assignmentErr;
                setWorkOrders((workRows ?? []) as WorkOrderRow[]);
                const templateIds = Array.from(new Set((assignmentRows ?? []).map((r: any) => r.template_id).filter(Boolean)));
                const templatesMap = new Map < string, ChecklistTemplateRow> ();
                if (templateIds.length > 0) { const { data: tRows, error: tErr } = await supabase.from("checklist_templates").select("id, name, version").in("id", templateIds); if (tErr) throw tErr; for (const row of tRows ?? []) { templatesMap.set((row as any).id, row as ChecklistTemplateRow); } }
                setChecklists(((assignmentRows ?? []) as ChecklistAssignmentRow[]).map((a) => ({ ...a, template: templatesMap.get(a.template_id) ?? null })));
            } catch (e: any) { console.error(e); toast({ title: t("common.error") || "Errore", description: e?.message ?? "Error", variant: "destructive" }); router.push("/equipment"); }
            finally { setLoading(false); }
        };
        load();
    }, [machineId, router, toast, t]);

    if (loading || !machine) return null;

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <Button variant="ghost" onClick={() => router.push(`/equipment/${machine.id}`)}><ArrowLeft className="mr-2 h-4 w-4" />{t("equipment.backToMachine") || "Indietro alla macchina"}</Button>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div><h1 className="text-3xl font-bold flex items-center gap-2"><Wrench className="w-8 h-8" />{t("equipment.maintenanceTitle") || "Manutenzione macchina"}</h1><p className="text-muted-foreground mt-1">{machine.name}</p></div>
                    <div className="flex gap-2">
                        {canCreate && (<Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${machine.id}`)}><ClipboardCheck className="w-4 h-4 mr-2" />{t("nav.checklists")}</Button>)}
                        {canCreate && (<Button onClick={() => router.push(`/work-orders/create?machine_id=${machine.id}`)} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"><Plus className="w-4 h-4 mr-2" />{t("workOrders.new")}</Button>)}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("workOrders.title")}</CardDescription><CardTitle>{workOrders.length}</CardTitle></CardHeader></Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("equipment.activeChecklists") || "Checklist attive"}</CardDescription><CardTitle>{checklists.length}</CardTitle></CardHeader></Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("equipment.ownerContext") || "Contesto owner"}</CardDescription><CardTitle className="text-base">{orgId ?? "—"}</CardTitle></CardHeader></Card>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader><CardTitle>{t("equipment.latestWorkOrders") || "Ultimi work order"}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {workOrders.length === 0 ? (<p className="text-sm text-muted-foreground">{t("equipment.noWorkOrders") || "Nessun work order presente."}</p>) : (
                                workOrders.slice(0, 8).map((wo) => (
                                    <button key={wo.id} type="button" onClick={() => router.push(`/work-orders/${wo.id}`)} className="w-full text-left rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center justify-between gap-3">
                                            <div><div className="font-medium">{wo.title}</div><div className="text-xs text-muted-foreground mt-1">{formatDateTime(wo.created_at, language)}</div></div>
                                            <div className="flex flex-col items-end gap-2"><Badge variant="outline">{wo.status}</Badge><span className="text-xs text-muted-foreground">{formatDateTime(wo.due_date, language)}</span></div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader><CardTitle>{t("equipment.activeChecklists") || "Checklist attive"}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {checklists.length === 0 ? (<p className="text-sm text-muted-foreground">{t("equipment.noChecklists") || "Nessuna checklist attiva."}</p>) : (
                                checklists.map((a) => (<div key={a.id} className="rounded-xl border border-border p-4"><div className="font-medium">{a.template?.name ?? "Template"}</div><div className="text-xs text-muted-foreground mt-1">{t("documents.version")}: {a.template?.version ?? "—"}</div></div>))
                            )}
                            <div className="pt-2"><Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${machine.id}`)}><ClipboardCheck className="w-4 h-4 mr-2" />{t("nav.checklists")}</Button></div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
