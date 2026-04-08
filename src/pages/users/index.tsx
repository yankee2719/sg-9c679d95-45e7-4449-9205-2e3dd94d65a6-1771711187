import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, CalendarDays, ClipboardList, Loader2, MapPin, Route, Save, User, Wrench } from "lucide-react";
import { getWorkOrder, updateWorkOrder } from "@/services/workOrderApi";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { hasMinimumOrgRole } from "@/lib/roles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import WorkOrderStatusBadge from "@/components/work-orders/WorkOrderStatusBadge";
import WorkOrderPriorityBadge from "@/components/work-orders/WorkOrderPriorityBadge";

interface WorkOrderRow {
    id: string;
    title: string | null;
    description: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
    machine_id: string | null;
    plant_id: string | null;
    assigned_to: string | null;
    organization_id: string | null;
    created_at: string | null;
    updated_at: string | null;
    work_type?: string | null;
    scheduled_date?: string | null;
    notes?: string | null;
}

function formatDate(value: string | null | undefined, lang: string) {
    if (!value) return "—";
    try {
        const locale = lang === "it" ? "it-IT" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
        return new Date(value).toLocaleString(locale);
    } catch {
        return value;
    }
}

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { loading: authLoading, membership, organization } = useAuth() as any;
    const { t, language } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [row, setRow] = useState < WorkOrderRow | null > (null);
    const [machineContext, setMachineContext] = useState < { machineName: string | null; internalCode: string | null; customerName: string | null; plantName: string | null; area: string | null } | null > (null);

    const userRole = membership?.role ?? "technician";
    const orgType = organization?.type ?? null;
    const canEdit = hasMinimumOrgRole(userRole, "technician");
    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!resolvedId || authLoading) return;
            try {
                setLoading(true);
                const data = await getWorkOrder(resolvedId);
                if (!active) return;
                setRow(data as WorkOrderRow);
            } catch (error: any) {
                console.error("work order detail load error", error);
                toast({ title: t("common.error") || "Errore", description: error?.message || "Errore caricamento ordine", variant: "destructive" });
                void router.replace("/work-orders");
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [resolvedId, authLoading, router, t, toast]);

    useEffect(() => {
        let active = true;
        const loadContext = async () => {
            if (!row?.machine_id) return;
            try {
                const { data: machine } = await supabase
                    .from("machines")
                    .select("id,name,internal_code,area,plant_id")
                    .eq("id", row.machine_id)
                    .maybeSingle();

                let customerName: string | null = null;
                if (machine?.id) {
                    const { data: assignment } = await supabase
                        .from("machine_assignments")
                        .select("customer_org_id, customer:organizations!machine_assignments_customer_org_id_fkey(name)")
                        .eq("machine_id", machine.id)
                        .eq("is_active", true)
                        .order("assigned_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    customerName = (assignment as any)?.customer?.name ?? null;
                }

                const resolvedPlantId = row.plant_id || machine?.plant_id || null;
                let plantName: string | null = null;
                if (resolvedPlantId) {
                    const { data: plant } = await supabase.from("plants").select("id,name").eq("id", resolvedPlantId).maybeSingle();
                    plantName = plant?.name ?? null;
                }

                if (active) {
                    setMachineContext({
                        machineName: machine?.name ?? null,
                        internalCode: machine?.internal_code ?? null,
                        customerName,
                        plantName,
                        area: machine?.area ?? null,
                    });
                }
            } catch (error) {
                console.error("work order machine context load error", error);
            }
        };
        void loadContext();
        return () => {
            active = false;
        };
    }, [row?.machine_id, row?.plant_id]);

    const handleSave = async () => {
        if (!resolvedId || !row) return;
        setSaving(true);
        try {
            const updated = await updateWorkOrder(resolvedId, {
                title: row.title,
                description: row.description,
                status: row.status,
                priority: row.priority,
                due_date: row.due_date,
                machine_id: row.machine_id,
                assigned_to: row.assigned_to,
                plant_id: row.plant_id,
            });
            setRow(updated);
            toast({ title: t("workOrders.updated") || "Ordine aggiornato", description: row.title || "Work order" });
        } catch (error: any) {
            console.error(error);
            toast({ title: t("common.error") || "Errore", description: error?.message || t("workOrders.errorUpdate") || "Errore aggiornamento", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return <MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">{t("workOrders.loading") || "Caricamento..."}</div></MainLayout>;
    }

    if (!row) {
        return <MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">{t("workOrders.noResults") || "Nessun risultato"}</div></MainLayout>;
    }

    const missingPlant = orgType === "manufacturer" && machineContext?.customerName && !machineContext?.plantName;

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${row.title || "Work Order"} - MACHINA`} />
                <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <div className="flex items-center justify-between gap-4">
                        <Link href="/work-orders">
                            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />{t("workOrders.title") || "Ordini di lavoro"}</Button>
                        </Link>
                        {canEdit && (
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {saving ? (t("common.saving") || "Salvataggio...") : (t("common.save") || "Salva")}
                            </Button>
                        )}
                    </div>

                    <Card className="rounded-[28px]">
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0 flex-1 space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <WorkOrderStatusBadge status={row.status} />
                                        <WorkOrderPriorityBadge priority={row.priority} />
                                    </div>
                                    {canEdit ? (
                                        <>
                                            <Input value={row.title ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, title: e.target.value } : prev)} className="text-2xl font-bold" />
                                            <Textarea value={row.description ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, description: e.target.value } : prev)} rows={5} />
                                        </>
                                    ) : (
                                        <>
                                            <h1 className="text-3xl font-bold tracking-tight text-foreground">{row.title || "Work order"}</h1>
                                            <p className="text-sm text-muted-foreground">{row.description || t("workOrders.noDescription") || "Nessuna descrizione disponibile."}</p>
                                        </>
                                    )}
                                </div>
                                <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[440px]">
                                    <InfoPill icon={<CalendarDays className="h-4 w-4" />} label={t("workOrders.dueDate") || "Scadenza"} value={formatDate(row.due_date, language)} />
                                    <InfoPill icon={<CalendarDays className="h-4 w-4" />} label={t("workOrders.updatedAt") || "Aggiornato"} value={formatDate(row.updated_at, language)} />
                                    <InfoPill icon={<User className="h-4 w-4" />} label={t("workOrders.assignedTo") || "Assegnato a"} value={row.assigned_to || t("workOrders.unassigned") || "Non assegnato"} />
                                    <InfoPill icon={<ClipboardList className="h-4 w-4" />} label={t("workOrders.createdAt") || "Creato il"} value={formatDate(row.created_at, language)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Contesto operativo</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                            <InfoPill icon={<Wrench className="h-4 w-4" />} label="Macchina" value={machineContext?.machineName || row.machine_id || "—"} />
                            <InfoPill icon={<MapPin className="h-4 w-4" />} label={orgType === "manufacturer" ? "Cliente" : "Stabilimento"} value={machineContext?.customerName || machineContext?.plantName || "—"} />
                            <InfoPill icon={<Route className="h-4 w-4" />} label="Area / linea" value={machineContext?.area || "—"} />
                        </CardContent>
                    </Card>

                    {missingPlant && (
                        <Card className="rounded-2xl border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/20">
                            <CardHeader>
                                <CardTitle className="text-base">Stabilimento cliente non ancora associato</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                Per il costruttore questo ordine può esistere anche senza stabilimento cliente impostato. Se vuoi completare il contesto, crea prima uno stabilimento nel dettaglio cliente e poi aggiorna l'assegnazione macchina.
                            </CardContent>
                        </Card>
                    )}

                    <Card className="rounded-2xl">
                        <CardHeader><CardTitle>{t("workOrders.detail") || "Dettaglio ordine"}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <DetailRow label="Status" value={row.status || "—"} />
                            <DetailRow label={t("workOrders.priorityLabel") || "Priorità"} value={row.priority || "—"} />
                            <DetailRow label={t("workOrders.machineId") || "Machine ID"} value={row.machine_id || "—"} />
                            <DetailRow label={t("workOrders.assignedTo") || "Assigned to"} value={row.assigned_to || "—"} />
                            <DetailRow label={t("workOrders.updatedAt") || "Updated at"} value={formatDate(row.updated_at, language)} />
                            <DetailRow label="Tipo lavoro" value={row.work_type || "—"} />
                            <DetailRow label="Data pianificata" value={formatDate(row.scheduled_date, language)} />
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">{icon}<span>{label}</span></div>
            <div className="text-sm font-medium text-foreground break-words">{value || "—"}</div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="max-w-[60%] text-right text-sm font-medium text-foreground break-words">{value || "—"}</div>
        </div>
    );
}
