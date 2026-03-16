import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Save,
    User,
    Wrench,
    CalendarClock,
    ClipboardCheck,
    Loader2,
} from "lucide-react";
import { PageLoader } from "@/components/feedback/PageLoader";

type WorkType = "preventive" | "corrective" | "predictive" | "inspection" | "emergency";
type WorkStatus =
    | "draft"
    | "scheduled"
    | "in_progress"
    | "pending_review"
    | "completed"
    | "cancelled";
type WorkPriority = "low" | "medium" | "high" | "critical";

type WorkOrder = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    plant_id: string | null;
    title: string;
    description: string | null;
    work_type: WorkType;
    status: WorkStatus;
    priority: WorkPriority;
    due_date: string | null;
    scheduled_date: string | null;
    scheduled_start_time: string | null;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
};

type Profile = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
};

function formatName(p: Profile) {
    const dn = p.display_name?.trim();
    if (dn) return dn;
    const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
    return full || p.id;
}

function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("it-IT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function statusLabel(status: WorkStatus) {
    switch (status) {
        case "draft":
            return "Bozza";
        case "scheduled":
            return "Pianificato";
        case "in_progress":
            return "In corso";
        case "pending_review":
            return "In revisione";
        case "completed":
            return "Completato";
        case "cancelled":
            return "Annullato";
        default:
            return status;
    }
}

function priorityLabel(priority: WorkPriority) {
    switch (priority) {
        case "low":
            return "Bassa";
        case "medium":
            return "Media";
        case "high":
            return "Alta";
        case "critical":
            return "Critica";
        default:
            return priority;
    }
}

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { loading: authLoading, organization, membership } = useAuth();

    const id = useMemo(() => {
        const q = router.query.id;
        return typeof q === "string" ? q : null;
    }, [router.query.id]);

    const role = membership?.role ?? "technician";
    const orgId = organization?.id ?? null;
    const canEdit = role === "owner" || role === "admin" || role === "supervisor";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [wo, setWo] = useState < WorkOrder | null > (null);
    const [machineName, setMachineName] = useState < string | null > (null);
    const [assignees, setAssignees] = useState < Profile[] > ([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [workType, setWorkType] = useState < WorkType > ("preventive");
    const [status, setStatus] = useState < WorkStatus > ("draft");
    const [priority, setPriority] = useState < WorkPriority > ("medium");
    const [dueDate, setDueDate] = useState("");
    const [assignedTo, setAssignedTo] = useState("none");

    const loadAssignees = async (organizationId: string) => {
        const { data: members, error: memberErr } = await supabase
            .from("organization_memberships")
            .select("user_id")
            .eq("organization_id", organizationId)
            .eq("is_active", true);

        if (memberErr) throw memberErr;

        const userIds = Array.from(
            new Set((members ?? []).map((m: any) => m.user_id).filter(Boolean))
        );

        if (userIds.length === 0) {
            setAssignees([]);
            return;
        }

        const { data: profiles, error: profileErr } = await supabase
            .from("profiles")
            .select("id, display_name, first_name, last_name, email")
            .in("id", userIds)
            .order("display_name", { ascending: true });

        if (profileErr) throw profileErr;
        setAssignees((profiles ?? []) as Profile[]);
    };

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!id) return;

            if (id === "new") {
                void router.replace("/work-orders/create");
                return;
            }

            if (authLoading) return;

            if (!orgId) {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const { data, error } = await supabase
                    .from("work_orders")
                    .select(
                        "id, organization_id, machine_id, plant_id, title, description, work_type, status, priority, due_date, scheduled_date, scheduled_start_time, assigned_to, created_at, updated_at"
                    )
                    .eq("id", id)
                    .eq("organization_id", orgId)
                    .single();

                if (error) throw error;

                const row = data as WorkOrder;

                if (!active) return;

                setWo(row);
                setTitle(row.title ?? "");
                setDescription(row.description ?? "");
                setWorkType(row.work_type);
                setStatus(row.status);
                setPriority(row.priority);
                setDueDate(toDatetimeLocalValue(row.due_date));
                setAssignedTo(row.assigned_to ?? "none");

                if (row.machine_id) {
                    const { data: machineRow, error: machineErr } = await supabase
                        .from("machines")
                        .select("name")
                        .eq("id", row.machine_id)
                        .single();

                    if (machineErr) throw machineErr;
                    setMachineName((machineRow as any)?.name ?? null);
                } else {
                    setMachineName(null);
                }

                await loadAssignees(orgId);
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento work order",
                    variant: "destructive",
                });
                void router.push("/work-orders");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [id, authLoading, orgId, router, toast]);

    const handleSave = async () => {
        if (!wo) return;

        if (!canEdit) {
            toast({
                title: "Permesso negato",
                description: "Solo Owner, Admin e Supervisor possono modificare un work order.",
                variant: "destructive",
            });
            return;
        }

        if (!title.trim()) {
            toast({
                title: "Errore",
                description: "Titolo obbligatorio.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            const payload: any = {
                title: title.trim(),
                description: description.trim() || null,
                work_type: workType,
                status,
                priority,
                assigned_to: assignedTo === "none" ? null : assignedTo,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from("work_orders")
                .update(payload)
                .eq("id", wo.id)
                .eq("organization_id", orgId);

            if (error) throw error;

            setWo((prev) =>
                prev
                    ? {
                        ...prev,
                        ...payload,
                    }
                    : prev
            );

            toast({
                title: "OK",
                description: "Work order aggiornato correttamente.",
            });
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore aggiornamento work order",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={role as any}>
                    <SEO title="Work Order - MACHINA" />
                    <PageLoader
                        title="Work Order"
                        description="Stiamo caricando i dettagli operativi e gli assegnatari disponibili."
                    />
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!wo) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={role as any}>
                    <SEO title="Work Order - MACHINA" />
                    <div className="container mx-auto max-w-6xl px-4 py-8">
                        <div className="text-sm text-muted-foreground">Work order non trovato.</div>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={role as any}>
                <SEO title={`${wo.title ?? "Work Order"} - MACHINA`} />

                <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <Button variant="ghost" onClick={() => router.push("/work-orders")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Torna ai work order
                    </Button>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <div className="space-y-6 xl:col-span-2">
                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle>Dettaglio Work Order</CardTitle>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Titolo *</Label>
                                            <Input
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                disabled={!canEdit}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Macchina</Label>
                                            <Input value={machineName ?? "—"} disabled />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Assegnato a</Label>
                                            <Select
                                                value={assignedTo}
                                                onValueChange={setAssignedTo}
                                                disabled={!canEdit}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Non assegnato" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Non assegnato</SelectItem>
                                                    {assignees.map((profile) => (
                                                        <SelectItem key={profile.id} value={profile.id}>
                                                            {formatName(profile)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Tipo lavoro</Label>
                                            <Select
                                                value={workType}
                                                onValueChange={(v) => setWorkType(v as WorkType)}
                                                disabled={!canEdit}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="preventive">Preventive</SelectItem>
                                                    <SelectItem value="corrective">Corrective</SelectItem>
                                                    <SelectItem value="predictive">Predictive</SelectItem>
                                                    <SelectItem value="inspection">Inspection</SelectItem>
                                                    <SelectItem value="emergency">Emergency</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Stato</Label>
                                            <Select
                                                value={status}
                                                onValueChange={(v) => setStatus(v as WorkStatus)}
                                                disabled={!canEdit}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="draft">Bozza</SelectItem>
                                                    <SelectItem value="scheduled">Pianificato</SelectItem>
                                                    <SelectItem value="in_progress">In corso</SelectItem>
                                                    <SelectItem value="pending_review">In revisione</SelectItem>
                                                    <SelectItem value="completed">Completato</SelectItem>
                                                    <SelectItem value="cancelled">Annullato</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Priorità</Label>
                                            <Select
                                                value={priority}
                                                onValueChange={(v) => setPriority(v as WorkPriority)}
                                                disabled={!canEdit}
                                            >
                                                <SelectTrigger>
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

                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Scadenza</Label>
                                            <Input
                                                type="datetime-local"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                disabled={!canEdit}
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Descrizione</Label>
                                            <Textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={5}
                                                disabled={!canEdit}
                                            />
                                        </div>
                                    </div>

                                    {canEdit && (
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]"
                                            >
                                                {saving ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                {saving ? "Salvataggio..." : "Salva modifiche"}
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle>Riepilogo</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Stato</span>
                                        <Badge variant="secondary">{statusLabel(wo.status)}</Badge>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Priorità</span>
                                        <Badge variant="outline">{priorityLabel(wo.priority)}</Badge>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Creato</span>
                                        <span className="text-right">{formatDateTime(wo.created_at)}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Aggiornato</span>
                                        <span className="text-right">{formatDateTime(wo.updated_at)}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Scadenza</span>
                                        <span className="text-right">{formatDateTime(wo.due_date)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle>Azioni</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {wo.machine_id && (
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                            onClick={() => router.push(`/equipment/${wo.machine_id}`)}
                                        >
                                            <Wrench className="mr-2 h-4 w-4" />
                                            Vai alla macchina
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => router.push(`/work-orders/${wo.id}/execute-checklist`)}
                                    >
                                        <ClipboardCheck className="mr-2 h-4 w-4" />
                                        Esegui checklist
                                    </Button>

                                    <div className="space-y-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <User className="h-3.5 w-3.5" />
                                            Il contesto operativo del work order è sempre l&apos;organizzazione attiva.
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            Le modifiche lato operativo vanno tenute coerenti con macchina, stabilimento e assegnazione.
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}