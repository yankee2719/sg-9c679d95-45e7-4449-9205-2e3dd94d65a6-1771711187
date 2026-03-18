import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    ArrowLeft,
    CalendarDays,
    ClipboardList,
    Factory,
    FileText,
    Loader2,
    User,
    Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
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

interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    lifecycle_state: string | null;
}

interface ProfileRow {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString("it-IT", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
}

function isOverdue(status: string | null | undefined, dueDate: string | null | undefined) {
    if (!dueDate) return false;
    const key = String(status || "").toLowerCase();
    if (["completed", "closed", "cancelled"].includes(key)) return false;
    return new Date(dueDate).getTime() < Date.now();
}

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { loading: authLoading, membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [row, setRow] = useState < WorkOrderRow | null > (null);
    const [machine, setMachine] = useState < MachineRow | null > (null);
    const [assignee, setAssignee] = useState < ProfileRow | null > (null);

    const userRole = membership?.role ?? "technician";

    const resolvedId = useMemo(() => {
        return typeof id === "string" ? id : null;
    }, [id]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;
            if (!resolvedId) {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const { data, error } = await supabase
                    .from("work_orders")
                    .select(
                        "id, title, description, status, priority, due_date, machine_id, assigned_to, organization_id, created_at, updated_at"
                    )
                    .eq("id", resolvedId)
                    .maybeSingle();

                if (error) throw error;

                if (!data) {
                    void router.replace("/work-orders");
                    return;
                }

                const workOrder = data as WorkOrderRow;
                if (!active) return;

                setRow(workOrder);

                const asyncCalls: Promise<any>[] = [];

                if (workOrder.machine_id) {
                    asyncCalls.push(
                        supabase
                            .from("machines")
                            .select("id, name, internal_code, serial_number, lifecycle_state")
                            .eq("id", workOrder.machine_id)
                            .maybeSingle()
                            .then(({ data: machineData }) => {
                                if (!active) return;
                                setMachine((machineData as MachineRow) ?? null);
                            })
                    );
                } else {
                    setMachine(null);
                }

                if (workOrder.assigned_to) {
                    asyncCalls.push(
                        supabase
                            .from("profiles")
                            .select("id, display_name, first_name, last_name, email")
                            .eq("id", workOrder.assigned_to)
                            .maybeSingle()
                            .then(({ data: profileData }) => {
                                if (!active) return;
                                setAssignee((profileData as ProfileRow) ?? null);
                            })
                    );
                } else {
                    setAssignee(null);
                }

                await Promise.all(asyncCalls);
            } catch (error) {
                console.error("Work order detail load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [authLoading, resolvedId, router]);

    const assigneeLabel = useMemo(() => {
        if (!assignee) return "Non assegnato";
        return (
            assignee.display_name?.trim() ||
            `${assignee.first_name ?? ""} ${assignee.last_name ?? ""}`.trim() ||
            assignee.email ||
            assignee.id
        );
    }, [assignee]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Work Order - MACHINA" />
                    <div className="mx-auto max-w-6xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Caricamento work order...
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!row) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title="Work Order - MACHINA" />
                    <div className="mx-auto max-w-6xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-muted-foreground">
                                Work order non trovato.
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${row.title || "Work Order"} - MACHINA`} />

                <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <div className="flex items-center justify-between gap-4">
                        <Button variant="outline" onClick={() => router.push("/work-orders")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Torna a Work Orders
                        </Button>

                        {row.machine_id && (
                            <Link href={`/equipment/${row.machine_id}`}>
                                <Button variant="outline">
                                    <Factory className="mr-2 h-4 w-4" />
                                    Apri macchina
                                </Button>
                            </Link>
                        )}
                    </div>

                    <Card className="rounded-[28px]">
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <WorkOrderStatusBadge status={row.status} />
                                        <WorkOrderPriorityBadge priority={row.priority} />
                                        {isOverdue(row.status, row.due_date) && (
                                            <span className="rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300">
                                                Overdue
                                            </span>
                                        )}
                                    </div>

                                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                                        {row.title || "Work order"}
                                    </h1>

                                    <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
                                        {row.description || "Nessuna descrizione disponibile."}
                                    </p>
                                </div>

                                <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[440px]">
                                    <InfoPill
                                        icon={<CalendarDays className="h-4 w-4" />}
                                        label="Due date"
                                        value={formatDate(row.due_date)}
                                    />
                                    <InfoPill
                                        icon={<CalendarDays className="h-4 w-4" />}
                                        label="Updated"
                                        value={formatDate(row.updated_at)}
                                    />
                                    <InfoPill
                                        icon={<User className="h-4 w-4" />}
                                        label="Assegnato a"
                                        value={assigneeLabel}
                                    />
                                    <InfoPill
                                        icon={<ClipboardList className="h-4 w-4" />}
                                        label="Creato il"
                                        value={formatDate(row.created_at)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Dettaglio operativo</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <DetailRow label="Status" value={row.status || "—"} />
                                    <DetailRow label="Priority" value={row.priority || "—"} />
                                    <DetailRow label="Due date" value={formatDate(row.due_date)} />
                                    <DetailRow label="Assigned to" value={assigneeLabel} />
                                    <DetailRow label="Machine ID" value={row.machine_id || "—"} />
                                    <DetailRow
                                        label="Updated at"
                                        value={formatDate(row.updated_at)}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Descrizione</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-foreground">
                                        {row.description || "Nessuna descrizione disponibile."}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Macchina collegata</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {machine ? (
                                        <div className="space-y-3">
                                            <div className="text-lg font-semibold text-foreground">
                                                {machine.name || "Macchina"}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {machine.internal_code || "—"}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {machine.serial_number || "—"}
                                            </div>

                                            {machine.lifecycle_state && (
                                                <div className="pt-2">
                                                    <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                                        {machine.lifecycle_state}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="pt-3">
                                                <Link href={`/equipment/${machine.id}`}>
                                                    <Button className="w-full">
                                                        <Wrench className="mr-2 h-4 w-4" />
                                                        Apri scheda macchina
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            Nessuna macchina collegata.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>Azioni rapide</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Link href="/work-orders">
                                        <Button variant="outline" className="w-full justify-start">
                                            <ClipboardList className="mr-2 h-4 w-4" />
                                            Torna al registro work orders
                                        </Button>
                                    </Link>

                                    <Link href="/documents">
                                        <Button variant="outline" className="w-full justify-start">
                                            <FileText className="mr-2 h-4 w-4" />
                                            Apri archivio documentale
                                        </Button>
                                    </Link>

                                    <Link href="/maintenance">
                                        <Button variant="outline" className="w-full justify-start">
                                            <Wrench className="mr-2 h-4 w-4" />
                                            Vai a maintenance
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
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