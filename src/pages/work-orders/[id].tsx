import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
    ArrowLeft,
    CalendarDays,
    ClipboardList,
    Loader2,
    User,
    Wrench,
} from "lucide-react";
import { getWorkOrder, updateWorkOrder } from "@/services/workOrderApi";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    assigned_to: string | null;
    organization_id: string | null;
    created_at: string | null;
    updated_at: string | null;
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
    const { loading: authLoading, membership } = useAuth();
    const { t, language } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [row, setRow] = useState < WorkOrderRow | null > (null);

    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor", "technician"].includes(userRole);
    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!resolvedId || authLoading) return;

            try {
                const data = await getWorkOrder(resolvedId);
                if (!active) return;
                setRow(data as WorkOrderRow);
            } catch (error) {
                console.error(error);
                void router.replace("/work-orders");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [resolvedId, authLoading, router]);

    const handleQuickStatus = async (status: string) => {
        if (!resolvedId || !row) return;

        setSaving(true);
        try {
            const updated = await updateWorkOrder(resolvedId, {
                ...row,
                status,
            });
            setRow(updated);
            toast({
                title: t("workOrders.updated"),
                description: `${t("workOrders.status") || "Status"}: ${status}`,
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: t("common.error") || "Errore",
                description: error?.message || t("workOrders.errorUpdate") || "Errore aggiornamento",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">{t("workOrders.loading")}</div>
            </MainLayout>
        );
    }

    if (!row) {
        return (
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">{t("workOrders.noResults")}</div>
            </MainLayout>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${row.title || "Work Order"} - MACHINA`} />

                <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <div className="flex items-center justify-between gap-4">
                        <Link href="/work-orders">
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t("workOrders.title")}
                            </Button>
                        </Link>

                        {canEdit && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => void handleQuickStatus("in_progress")}
                                    disabled={saving}
                                >
                                    {t("workOrders.statusInProgress")}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => void handleQuickStatus("completed")}
                                    disabled={saving}
                                >
                                    {t("workOrders.statusCompleted")}
                                </Button>
                            </div>
                        )}
                    </div>

                    <Card className="rounded-[28px]">
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <WorkOrderStatusBadge status={row.status} />
                                        <WorkOrderPriorityBadge priority={row.priority} />
                                    </div>

                                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                                        {row.title || "Work order"}
                                    </h1>

                                    <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                                        {row.description || t("workOrders.noDescription") || "Nessuna descrizione disponibile."}
                                    </p>
                                </div>

                                <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[440px]">
                                    <InfoPill
                                        icon={<CalendarDays className="h-4 w-4" />}
                                        label={t("workOrders.dueDate") || "Due date"}
                                        value={formatDate(row.due_date, language)}
                                    />
                                    <InfoPill
                                        icon={<CalendarDays className="h-4 w-4" />}
                                        label={t("workOrders.updatedAt") || "Updated"}
                                        value={formatDate(row.updated_at, language)}
                                    />
                                    <InfoPill
                                        icon={<User className="h-4 w-4" />}
                                        label={t("workOrders.assignedTo") || "Assigned to"}
                                        value={row.assigned_to || t("workOrders.unassigned") || "Non assegnato"}
                                    />
                                    <InfoPill
                                        icon={<ClipboardList className="h-4 w-4" />}
                                        label={t("workOrders.createdAt") || "Creato il"}
                                        value={formatDate(row.created_at, language)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>{t("workOrders.detail")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DetailRow label="Status" value={row.status || "—"} />
                            <DetailRow label={t("workOrders.priorityLabel")} value={row.priority || "—"} />
                            <DetailRow label={t("workOrders.machineId") || "Machine ID"} value={row.machine_id || "—"} />
                            <DetailRow label={t("workOrders.assignedTo") || "Assigned to"} value={row.assigned_to || "—"} />
                            <DetailRow label={t("workOrders.updatedAt") || "Updated at"} value={formatDate(row.updated_at, language)} />
                        </CardContent>
                    </Card>

                    {row.machine_id && (
                        <Link href={`/equipment/${row.machine_id}`}>
                            <Button variant="outline">
                                <Wrench className="mr-2 h-4 w-4" />
                                {t("nav.equipment")}
                            </Button>
                        </Link>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function InfoPill({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                {icon}
                <span>{label}</span>
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-foreground">
                {value}
            </div>
        </div>
    );
}

function DetailRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="max-w-[60%] text-right text-sm font-medium text-foreground">
                {value}
            </div>
        </div>
    );
}
