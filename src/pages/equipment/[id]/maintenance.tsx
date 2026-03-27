import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardCheck, Plus, Wrench, WifiOff, Database } from "lucide-react";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
    fetchEquipmentMaintenanceSnapshot,
    loadEquipmentMaintenanceSnapshot,
    saveEquipmentMaintenanceSnapshot,
    type MaintenanceSnapshotChecklist,
    type MaintenanceSnapshotMachine,
    type MaintenanceSnapshotWorkOrder,
} from "@/lib/equipmentMaintenanceSnapshotApi";

function formatDateTime(value: string | null, lang: string) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
    return d.toLocaleString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function EquipmentMaintenancePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t, language } = useLanguage();
    const machineId = useMemo(() => {
        const raw = router.query.id;
        return typeof raw === "string" ? raw : null;
    }, [router.query.id]);

    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [machine, setMachine] = useState < MaintenanceSnapshotMachine | null > (null);
    const [workOrders, setWorkOrders] = useState < MaintenanceSnapshotWorkOrder[] > ([]);
    const [checklists, setChecklists] = useState < MaintenanceSnapshotChecklist[] > ([]);
    const [snapshotCachedAt, setSnapshotCachedAt] = useState < string | null > (null);
    const [usingCachedSnapshot, setUsingCachedSnapshot] = useState(false);
    const canCreate = role === "admin" || role === "supervisor";

    useEffect(() => {
        const load = async () => {
            if (!machineId) return;
            setLoading(true);
            try {
                const ctx = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }
                setRole(ctx.role ?? "technician");
                setOrgId(ctx.orgId ?? null);

                const liveSnapshot = await fetchEquipmentMaintenanceSnapshot(machineId);
                setMachine(liveSnapshot.machine);
                setWorkOrders(liveSnapshot.workOrders);
                setChecklists(liveSnapshot.checklists);
                saveEquipmentMaintenanceSnapshot(machineId, liveSnapshot);
                setSnapshotCachedAt(new Date().toISOString());
                setUsingCachedSnapshot(false);
            } catch (error: any) {
                const cached = machineId ? loadEquipmentMaintenanceSnapshot(machineId) : null;
                if (cached) {
                    setMachine(cached.data.machine);
                    setWorkOrders(cached.data.workOrders);
                    setChecklists(cached.data.checklists);
                    setSnapshotCachedAt(cached.cachedAt);
                    setUsingCachedSnapshot(true);
                    toast({
                        title: t("common.warning") || "Modalità snapshot",
                        description: t("equipment.offlineSnapshot") || "Sto mostrando l'ultima istantanea locale disponibile.",
                    });
                } else {
                    console.error(error);
                    toast({
                        title: t("common.error") || "Errore",
                        description: error?.message || "Errore caricamento manutenzione macchina",
                        variant: "destructive",
                    });
                    router.push("/equipment");
                }
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [machineId, router, toast, t]);

    if (loading || !machine) return null;

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
                <Button variant="ghost" onClick={() => router.push(`/equipment/${machine.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("equipment.backToMachine") || "Indietro alla macchina"}
                </Button>

                {usingCachedSnapshot ? (
                    <Card className="rounded-2xl border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                <WifiOff className="h-5 w-5" />
                                {t("equipment.offlineSnapshotTitle") || "Snapshot locale"}
                            </CardTitle>
                            <CardDescription>
                                {(t("equipment.offlineSnapshotDesc") || "I dati potrebbero non essere aggiornati.") +
                                    (snapshotCachedAt ? ` • ${formatDateTime(snapshotCachedAt, language)}` : "")}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ) : (
                    <Card className="rounded-2xl border-dashed">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Database className="h-5 w-5" />
                                {t("equipment.liveSnapshot") || "Snapshot manutenzione disponibile offline"}
                            </CardTitle>
                            <CardDescription>
                                {(t("equipment.liveSnapshotDesc") || "Questa pagina viene salvata in locale per uso sul campo.") +
                                    (snapshotCachedAt ? ` • ${formatDateTime(snapshotCachedAt, language)}` : "")}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <Wrench className="h-8 w-8" />
                            {t("equipment.maintenanceTitle") || "Manutenzione macchina"}
                        </h1>
                        <p className="mt-1 text-muted-foreground">{machine.name}</p>
                    </div>
                    <div className="flex gap-2">
                        {canCreate && (
                            <Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${machine.id}`)}>
                                <ClipboardCheck className="mr-2 h-4 w-4" />
                                {t("nav.checklists")}
                            </Button>
                        )}
                        {canCreate && (
                            <Button onClick={() => router.push(`/work-orders/create?machine_id=${machine.id}`)} className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]">
                                <Plus className="mr-2 h-4 w-4" />
                                {t("workOrders.new")}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("workOrders.title")}</CardDescription><CardTitle>{workOrders.length}</CardTitle></CardHeader></Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("equipment.activeChecklists") || "Checklist attive"}</CardDescription><CardTitle>{checklists.length}</CardTitle></CardHeader></Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("equipment.ownerContext") || "Contesto owner"}</CardDescription><CardTitle className="text-base">{orgId ?? "—"}</CardTitle></CardHeader></Card>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader><CardTitle>{t("equipment.latestWorkOrders") || "Ultimi work order"}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {workOrders.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t("equipment.noWorkOrders") || "Nessun work order presente."}</p>
                            ) : (
                                workOrders.slice(0, 8).map((wo) => (
                                    <button key={wo.id} type="button" onClick={() => router.push(`/work-orders/${wo.id}`)} className="w-full rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/50">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="font-medium">{wo.title}</div>
                                                <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(wo.created_at, language)}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant="outline">{wo.status}</Badge>
                                                <span className="text-xs text-muted-foreground">{formatDateTime(wo.due_date, language)}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader><CardTitle>{t("equipment.activeChecklists") || "Checklist attive"}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {checklists.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t("equipment.noChecklists") || "Nessuna checklist attiva."}</p>
                            ) : (
                                checklists.map((assignment) => (
                                    <div key={assignment.id} className="rounded-xl border border-border p-4">
                                        <div className="font-medium">{assignment.template?.name ?? "Template"}</div>
                                        <div className="mt-1 text-xs text-muted-foreground">{t("documents.version")}: {assignment.template?.version ?? "—"}</div>
                                    </div>
                                ))
                            )}
                            <div className="pt-2">
                                <Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${machine.id}`)}>
                                    <ClipboardCheck className="mr-2 h-4 w-4" />
                                    {t("nav.checklists")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}

