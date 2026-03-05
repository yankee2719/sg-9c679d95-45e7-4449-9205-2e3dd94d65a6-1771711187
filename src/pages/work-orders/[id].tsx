// src/pages/work-orders/[id].tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
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
import { ArrowLeft, Save, User, Wrench, CalendarClock, XCircle } from "lucide-react";

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
    due_date: string | null; // timestamptz / date -> ISO string
    scheduled_date: string | null; // date
    scheduled_start_time: string | null; // timestamptz
    assigned_to: string | null; // auth.users id
    created_at: string;
    updated_at: string;
};

type Profile = {
    id: string; // auth.users id
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
};

function formatName(p: Profile) {
    const dn = p.display_name?.trim();
    if (dn) return dn;
    const fn = p.first_name?.trim() ?? "";
    const ln = p.last_name?.trim() ?? "";
    const full = `${fn} ${ln}`.trim();
    return full || p.id;
}

function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [role, setRole] = useState < string > ("technician");
    const canEdit = role === "admin" || role === "supervisor";

    const id = useMemo(() => {
        const q = router.query.id;
        return typeof q === "string" ? q : null;
    }, [router.query.id]);

    const [loading, setLoading] = useState < boolean > (true);
    const [saving, setSaving] = useState < boolean > (false);

    const [wo, setWo] = useState < WorkOrder | null > (null);
    const [machineName, setMachineName] = useState < string | null > (null);

    // editable fields
    const [title, setTitle] = useState < string > ("");
    const [description, setDescription] = useState < string > ("");
    const [workType, setWorkType] = useState < WorkType > ("preventive");
    const [status, setStatus] = useState < WorkStatus > ("draft");
    const [priority, setPriority] = useState < WorkPriority > ("medium");
    const [dueDate, setDueDate] = useState < string > (""); // datetime-local
    const [assignedTo, setAssignedTo] = useState < string > ("none");

    // assignees
    const [assignees, setAssignees] = useState < Profile[] > ([]);

    useEffect(() => {
        const init = async () => {
            try {
                const ctx: any = await getUserContext();
                setRole(ctx?.role ?? "technician");
            } catch {
                // ignore
            }
        };
        init();
    }, []);

    // Guard: if someone hits /work-orders/new by mistake, avoid id=eq.new queries
    useEffect(() => {
        if (!id) return;
        if (id === "new") {
            router.replace("/work-orders/create");
        }
    }, [id, router]);

    const loadAssignees = async (organizationId: string) => {
        // Load members from organization_memberships, then profiles in second step
        const { data: members, error: mErr } = await supabase
            .from("organization_memberships")
            .select("user_id")
            .eq("organization_id", organizationId)
            .eq("is_active", true)
            .limit(500);

        if (mErr) throw mErr;

        const userIds = (members ?? [])
            .map((m: any) => m.user_id)
            .filter(Boolean);

        if (userIds.length === 0) {
            setAssignees([]);
            return;
        }

        const { data: profs, error: pErr } = await supabase
            .from("profiles")
            .select("id,display_name,first_name,last_name,email")
            .in("id", userIds)
            .order("display_name", { ascending: true });

        if (pErr) throw pErr;
        setAssignees((profs ?? []) as any);
    };

    const load = async () => {
        if (!id || id === "new") return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("work_orders")
                .select(
                    "id,organization_id,machine_id,plant_id,title,description,work_type,status,priority,due_date,scheduled_date,scheduled_start_time,assigned_to,created_at,updated_at"
                )
                .eq("id", id)
                .single();

            if (error) throw error;

            const row = data as unknown as WorkOrder;
            setWo(row);

            // populate fields
            setTitle(row.title ?? "");
            setDescription(row.description ?? "");
            setWorkType(row.work_type);
            setStatus(row.status);
            setPriority(row.priority);
            setDueDate(toDatetimeLocalValue(row.due_date));
            setAssignedTo(row.assigned_to ? row.assigned_to : "none");

            // machine name
            if (row.machine_id) {
                const { data: m, error: me } = await supabase
                    .from("machines")
                    .select("name")
                    .eq("id", row.machine_id)
                    .single();

                if (!me) setMachineName((m as any)?.name ?? null);
            } else {
                setMachineName(null);
            }

            await loadAssignees(row.organization_id);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore caricamento work order",
                variant: "destructive",
            });
            router.push("/work-orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSave = async () => {
        if (!wo) return;

        if (!canEdit) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin/Supervisor possono modificare un work order.",
                variant: "destructive",
            });
            return;
        }

        if (!title.trim()) {
            toast({
                title: "Errore",
                description: "Titolo obbligatorio",
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

            const { error } = await supabase.from("work_orders").update(payload).eq("id", wo.id);
            if (error) throw error;

            toast({ title: "OK", description: "Work order aggiornato" });
            await load();
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore salvataggio",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const quickSetStatus = async (next: WorkStatus) => {
        if (!wo) return;
        if (!canEdit) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("work_orders")
                .update({ status: next, updated_at: new Date().toISOString() })
                .eq("id", wo.id);

            if (error) throw error;
            toast({ title: "OK", description: `Stato aggiornato: ${next}` });
            await load();
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore cambio stato",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !wo) return null;

    return (
        <MainLayout userRole={role as any}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Button variant="ghost" onClick={() => router.push("/work-orders")}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Work Orders
                    </Button>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{wo.work_type}</Badge>
                        <Badge variant="outline">{wo.status}</Badge>
                        <Badge variant="outline">{wo.priority}</Badge>

                        <Button
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={() => router.push(`/work-orders/${wo.id}/execute-checklist`)}
                            disabled={!wo.machine_id}
                            title={!wo.machine_id ? "Questo work order non ha una macchina associata" : ""}
                        >
                            Esegui checklist
                        </Button>
                    </div>
                </div>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-xl">Dettaglio Work Order</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Card className="rounded-2xl">
                                <CardContent className="p-4 space-y-1">
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Wrench className="w-4 h-4" /> Macchina
                                    </div>
                                    <div className="font-semibold text-sm">
                                        {machineName ?? "Generico (senza macchina)"}
                                    </div>
                                    <div className="text-xs text-muted-foreground break-all">
                                        {wo.machine_id ?? "—"}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardContent className="p-4 space-y-1">
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <User className="w-4 h-4" /> Assegnato a
                                    </div>
                                    <div className="font-semibold text-sm">
                                        {wo.assigned_to
                                            ? formatName(
                                                assignees.find((a) => a.id === wo.assigned_to) ??
                                                ({ id: wo.assigned_to } as any)
                                            )
                                            : "Non assegnato"}
                                    </div>
                                    <div className="text-xs text-muted-foreground break-all">
                                        {wo.assigned_to ?? "—"}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardContent className="p-4 space-y-1">
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <CalendarClock className="w-4 h-4" /> Scadenza
                                    </div>
                                    <div className="font-semibold text-sm">
                                        {wo.due_date ? new Date(wo.due_date).toLocaleString() : "—"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Creato: {new Date(wo.created_at).toLocaleString()}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Edit form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Titolo</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={!canEdit}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>work_type</Label>
                                <Select
                                    value={workType}
                                    onValueChange={(v) => setWorkType(v as WorkType)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="preventive">preventive</SelectItem>
                                        <SelectItem value="corrective">corrective</SelectItem>
                                        <SelectItem value="predictive">predictive</SelectItem>
                                        <SelectItem value="inspection">inspection</SelectItem>
                                        <SelectItem value="emergency">emergency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>priority</Label>
                                <Select
                                    value={priority}
                                    onValueChange={(v) => setPriority(v as WorkPriority)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">low</SelectItem>
                                        <SelectItem value="medium">medium</SelectItem>
                                        <SelectItem value="high">high</SelectItem>
                                        <SelectItem value="critical">critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>status</Label>
                                <Select
                                    value={status}
                                    onValueChange={(v) => setStatus(v as WorkStatus)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">draft</SelectItem>
                                        <SelectItem value="scheduled">scheduled</SelectItem>
                                        <SelectItem value="in_progress">in_progress</SelectItem>
                                        <SelectItem value="pending_review">pending_review</SelectItem>
                                        <SelectItem value="completed">completed</SelectItem>
                                        <SelectItem value="cancelled">cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>assigned_to</Label>
                                <Select value={assignedTo} onValueChange={setAssignedTo} disabled={!canEdit}>
                                    <SelectTrigger className="bg-muted border-border text-foreground">
                                        <SelectValue placeholder="Non assegnato" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Non assegnato</SelectItem>
                                        {assignees.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {formatName(p)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="text-xs text-muted-foreground">
                                    (lista utenti da organization_memberships → profiles)
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>due_date</Label>
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
                                    rows={5}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex gap-2 flex-wrap">
                                {canEdit && (
                                    <>
                                        <Button
                                            variant="secondary"
                                            onClick={() => quickSetStatus("in_progress")}
                                            disabled={
                                                saving ||
                                                wo.status === "in_progress" ||
                                                wo.status === "completed" ||
                                                wo.status === "cancelled"
                                            }
                                        >
                                            Start
                                        </Button>

                                        <Button
                                            variant="secondary"
                                            onClick={() => quickSetStatus("pending_review")}
                                            disabled={
                                                saving ||
                                                wo.status === "pending_review" ||
                                                wo.status === "completed" ||
                                                wo.status === "cancelled"
                                            }
                                        >
                                            Send to review
                                        </Button>

                                        <Button
                                            variant="secondary"
                                            onClick={() => quickSetStatus("completed")}
                                            disabled={saving || wo.status === "completed" || wo.status === "cancelled"}
                                        >
                                            Complete
                                        </Button>

                                        <Button
                                            variant="destructive"
                                            onClick={() => quickSetStatus("cancelled")}
                                            disabled={saving || wo.status === "cancelled"}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Cancel
                                        </Button>
                                    </>
                                )}
                            </div>

                            {canEdit && (
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saving ? "Salvataggio..." : "Salva modifiche"}
                                </Button>
                            )}
                        </div>

                        {!canEdit && (
                            <div className="text-xs text-muted-foreground">
                                Sei loggato come <span className="font-mono">{role}</span>: puoi vedere ma non modificare.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}