import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardCheck, Plus, Wrench, WifiOff } from "lucide-react";
import {
    fetchEquipmentMaintenanceSnapshot,
    loadEquipmentMaintenanceSnapshot,
    saveEquipmentMaintenanceSnapshot,
    type MaintenanceSnapshotData,
} from "@/lib/equipmentMaintenanceSnapshotApi";
import { useAuth } from "@/hooks/useAuth";

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
    const { membership } = useAuth();
    const machineId = useMemo(() => {
        const raw = router.query.id;
        return typeof raw === "string" ? raw : null;
    }, [router.query.id]);

    const [loading, setLoading] = useState(true);
    const [snapshot, setSnapshot] = useState < MaintenanceSnapshotData | null > (null);
    const [cachedAt, setCachedAt] = useState < string | null > (null);
    const [offlineSnapshot, setOfflineSnapshot] = useState(false);

    const role = membership?.role ?? "technician";
    const canCreate = role === "admin" || role === "supervisor" || role === "owner";

    useEffect(() => {
        if (!machineId) return;
        let active = true;

        async function load() {
            setLoading(true);
            try {
                const data = await fetchEquipmentMaintenanceSnapshot(machineId);
                if (!active) return;
                setSnapshot(data);
                setOfflineSnapshot(false);
                setCachedAt(null);
                saveEquipmentMaintenanceSnapshot(machineId, data);
            } catch (e: any) {
                const cached = loadEquipmentMaintenanceSnapshot(machineId);
                if (!active) return;
                if (cached) {
                    setSnapshot(cached.data);
                    setCachedAt(cached.cachedAt);
                    setOfflineSnapshot(true);
                } else {
                    toast({ title: t("common.error") || "Errore", description: e?.message ?? "Error", variant: "destructive" });
                    void router.push("/equipment");
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void load();
        return () => {
            active = false;
        };
    }, [machineId, router, toast, t]);

    if (loading || !snapshot) return null;

    const machine = snapshot.machine;

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
                <Button variant="ghost" onClick={() => router.push(`/equipment/${machine.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("equipment.backToMachine") || "Indietro alla macchina"}
                </Button>

                {offlineSnapshot ? (
                    <Card className="rounded-2xl border-orange-200 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-500/10">
                        <CardContent className="flex items-center gap-3 p-4 text-sm text-orange-700 dark:text-orange-300">
                            <WifiOff className="h-4 w-4" />
                            Snapshot manutenzione offline{cachedAt ? ` • ${formatDateTime(cachedAt, language)}` : ""}
                        </CardContent>
                    </Card>
                ) : null}

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold"><Wrench className="h-8 w-8" />{t("equipment.maintenanceTitle") || "Manutenzione macchina"}</h1>
                        <p className="mt-1 text-muted-foreground">{machine.name}</p>
                    </div>
                    <div className="flex gap-2">
                        {canCreate && (
                            <Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${machine.id}`)}>
                                <ClipboardCheck className="mr-2 h-4 w-4" />{t("nav.checklists")}
                            </Button>
                        )}
                        {canCreate && !offlineSnapshot && (
                            <Button onClick={() => router.push(`/work-orders/create?machine_id=${machine.id}`)} className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]">
                                <Plus className="mr-2 h-4 w-4" />{t("workOrders.new")}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("workOrders.title")}</CardDescription><CardTitle>{snapshot.workOrders.length}</CardTitle></CardHeader></Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("equipment.activeChecklists") || "Checklist attive"}</CardDescription><CardTitle>{snapshot.checklists.length}</CardTitle></CardHeader></Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm"><CardHeader className="pb-2"><CardDescription>{t("equipment.machineCode") || "Codice macchina"}</CardDescription><CardTitle className="text-base">{machine.internal_code || machine.serial_number || "—"}</CardTitle></CardHeader></Card>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader><CardTitle>{t("equipment.latestWorkOrders") || "Ultimi work order"}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {snapshot.workOrders.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t("equipment.noWorkOrders") || "Nessun work order presente."}</p>
                            ) : (
                                snapshot.workOrders.slice(0, 8).map((wo) => (
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
                            {snapshot.checklists.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t("equipment.noChecklists") || "Nessuna checklist attiva."}</p>
                            ) : (
                                snapshot.checklists.map((assignment) => (
                                    <div key={assignment.id} className="rounded-xl border border-border p-4">
                                        <div className="font-medium">{assignment.template?.name ?? "Template"}</div>
                                        <div className="mt-1 text-xs text-muted-foreground">{t("documents.version")}: {assignment.template?.version ?? "—"}</div>
                                    </div>
                                ))
                            )}
                            <div className="pt-2">
                                <Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${machine.id}`)}>
                                    <ClipboardCheck className="mr-2 h-4 w-4" />{t("nav.checklists")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
