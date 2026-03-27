import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardCheck, Plus, Wrench } from "lucide-react";
import { getMachineMaintenanceContext } from "@/lib/machineWorkspaceApi";

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
    const [ctx, setCtx] = useState < any > (null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!machineId) return;
            try {
                setLoading(true);
                const data = await getMachineMaintenanceContext(machineId);
                if (!active) return;
                setCtx(data);
            } catch (e: any) {
                console.error(e);
                toast({ title: t("common.error") || "Errore", description: e?.message || "Error", variant: "destructive" });
                void router.push("/equipment");
            } finally { if (active) setLoading(false); }
        };
        void load();
        return () => { active = false; };
    }, [machineId, router, toast, t]);

    if (loading || !ctx?.machine) return null;

    return (
        <MainLayout userRole={ctx.role as any}>
            <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
                <Button variant="ghost" onClick={() => router.push(`/equipment/${ctx.machine.id}`)}><ArrowLeft className="mr-2 h-4 w-4" />{t("equipment.backToMachine") || "Indietro alla macchina"}</Button>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div><h1 className="flex items-center gap-2 text-3xl font-bold"><Wrench className="h-8 w-8" />{t("equipment.maintenanceTitle") || "Manutenzione macchina"}</h1><p className="mt-1 text-muted-foreground">{ctx.machine.name}</p></div>
                    <div className="flex gap-2">{ctx.canCreate && <Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${ctx.machine.id}`)}><ClipboardCheck className="mr-2 h-4 w-4" />{t("nav.checklists")}</Button>}{ctx.canCreate && <Button onClick={() => router.push(`/work-orders/create?machine_id=${ctx.machine.id}`)} className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]"><Plus className="mr-2 h-4 w-4" />{t("workOrders.new")}</Button>}</div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("workOrders.title")}</CardDescription><CardTitle>{ctx.workOrders.length}</CardTitle></CardHeader></Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("equipment.activeChecklists") || "Checklist attive"}</CardDescription><CardTitle>{ctx.checklistAssignments.length}</CardTitle></CardHeader></Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("equipment.ownerContext") || "Contesto owner"}</CardDescription><CardTitle className="text-base">{ctx.activeOrgId ?? "—"}</CardTitle></CardHeader></Card>
                </div>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader><CardTitle>{t("equipment.latestWorkOrders") || "Ultimi work order"}</CardTitle></CardHeader><CardContent className="space-y-3">{ctx.workOrders.length === 0 ? <p className="text-sm text-muted-foreground">{t("equipment.noWorkOrders") || "Nessun work order presente."}</p> : ctx.workOrders.slice(0, 8).map((wo: any) => <button key={wo.id} type="button" onClick={() => router.push(`/work-orders/${wo.id}`)} className="w-full rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/50"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">{wo.title}</div><div className="mt-1 text-xs text-muted-foreground">{formatDateTime(wo.created_at, language)}</div></div><div className="flex flex-col items-end gap-2"><Badge variant="outline">{wo.status}</Badge><span className="text-xs text-muted-foreground">{formatDateTime(wo.due_date, language)}</span></div></div></button>)}</CardContent></Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader><CardTitle>{t("equipment.activeChecklists") || "Checklist attive"}</CardTitle></CardHeader><CardContent className="space-y-3">{ctx.checklistAssignments.length === 0 ? <p className="text-sm text-muted-foreground">{t("equipment.noChecklists") || "Nessuna checklist attiva."}</p> : ctx.checklistAssignments.map((a: any) => <div key={a.id} className="rounded-xl border border-border p-4"><div className="font-medium">{a.template?.name ?? "Template"}</div><div className="mt-1 text-xs text-muted-foreground">{t("documents.version")}: {a.template?.version ?? "—"}</div></div>)}<div className="pt-2"><Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${ctx.machine.id}`)}><ClipboardCheck className="mr-2 h-4 w-4" />{t("nav.checklists")}</Button></div></CardContent></Card>
                </div>
            </div>
        </MainLayout>
    );
}
