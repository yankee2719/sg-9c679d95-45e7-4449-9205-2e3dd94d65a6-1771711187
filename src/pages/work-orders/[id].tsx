import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, CheckSquare, ClipboardList, Factory, PlayCircle, Save, Wrench } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { supabase } from "@/integrations/supabase/client";

function formatDateTime(value: string | null | undefined) {
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

type WorkOrderRow = {
    id: string;
    organization_id: string;
    machine_id: string;
    plant_id: string;
    maintenance_plan_id: string | null;
    title: string;
    description: string | null;
    work_type: string;
    priority: string | null;
    status: string | null;
    scheduled_date: string | null;
    scheduled_start_time: string | null;
    due_date: string | null;
    assigned_to: string | null;
    started_at: string | null;
    completed_at: string | null;
    actual_duration_minutes: number | null;
    work_performed: string | null;
    root_cause: string | null;
    parts_used: any;
    cost_labor: number | null;
    cost_parts: number | null;
    notes: string | null;
    machines?: { id: string; name: string | null; internal_code: string | null; plants?: { name: string | null } | null } | null;
    plants?: { id: string; name: string | null } | null;
};

type ChecklistRow = { id: string; title: string; checklist_type: string | null; is_template: boolean | null; machine_id: string | null; is_active: boolean | null };
type ExecutionRow = { id: string; checklist_id: string; completed_at: string | null; overall_status: string | null; checklists?: { id: string; title: string | null } | null };

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { membership } = useAuth();
    const { toast } = useToast();
    const { canExecuteChecklist, isManufacturer, plantLabel } = useOrgType();
    const userRole = membership?.role ?? "viewer";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [order, setOrder] = useState < WorkOrderRow | null > (null);
    const [checklists, setChecklists] = useState < ChecklistRow[] > ([]);
    const [executions, setExecutions] = useState < ExecutionRow[] > ([]);
    const [form, setForm] = useState({
        status: "draft",
        work_performed: "",
        root_cause: "",
        notes: "",
        actual_duration_minutes: "",
        cost_labor: "",
        cost_parts: "",
    });

    useEffect(() => {
        if (!id || typeof id !== "string") return;
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const [{ data: orderData, error: orderError }, { data: executionData, error: executionError }] = await Promise.all([
                    supabase
                        .from("work_orders")
                        .select(`
              id, organization_id, machine_id, plant_id, maintenance_plan_id, title, description, work_type, priority,
              status, scheduled_date, scheduled_start_time, due_date, assigned_to, started_at, completed_at,
              actual_duration_minutes, work_performed, root_cause, parts_used, cost_labor, cost_parts, notes,
              machines(id, name, internal_code, plants(name)),
              plants(id, name)
            `)
                        .eq("id", id)
                        .maybeSingle(),
                    supabase
                        .from("checklist_executions")
                        .select("id, checklist_id, completed_at, overall_status, checklists(id, title)")
                        .eq("work_order_id", id)
                        .order("executed_at", { ascending: false }),
                ]);
                if (orderError) throw orderError;
                if (executionError) throw executionError;

                const machineId = (orderData as any)?.machine_id ?? null;
                const { data: checklistData, error: checklistError } = machineId
                    ? await supabase
                        .from("checklists")
                        .select("id, title, checklist_type, is_template, machine_id, is_active")
                        .eq("organization_id", (orderData as any)?.organization_id)
                        .eq("is_active", true)
                        .or(`machine_id.eq.${machineId},machine_id.is.null`)
                        .order("title")
                    : { data: [], error: null as any };
                if (checklistError) throw checklistError;
                if (!active) return;

                const row = (orderData as any) ?? null;
                setOrder(row);
                setExecutions((executionData as any) ?? []);
                setChecklists((checklistData as any) ?? []);
                setForm({
                    status: row?.status ?? "draft",
                    work_performed: row?.work_performed ?? "",
                    root_cause: row?.root_cause ?? "",
                    notes: row?.notes ?? "",
                    actual_duration_minutes: row?.actual_duration_minutes ? String(row.actual_duration_minutes) : "",
                    cost_labor: row?.cost_labor != null ? String(row.cost_labor) : "",
                    cost_parts: row?.cost_parts != null ? String(row.cost_parts) : "",
                });
            } catch (error: any) {
                console.error("work order detail load error", error);
                if (active) toast({ variant: "destructive", title: "Errore caricamento ordine", description: error?.message ?? "Impossibile aprire l'ordine di lavoro." });
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [id, toast]);

    const statusActions = useMemo(() => {
        const current = form.status;
        if (current === "draft") return ["scheduled", "in_progress"];
        if (current === "scheduled") return ["in_progress", "cancelled"];
        if (current === "in_progress") return ["pending_review", "completed"];
        if (current === "pending_review") return ["completed"];
        return [] as string[];
    }, [form.status]);

    const handleSave = async () => {
        if (!order) return;
        setSaving(true);
        try {
            const nextPayload: Record<string, any> = {
                status: form.status,
                work_performed: form.work_performed.trim() || null,
                root_cause: form.root_cause.trim() || null,
                notes: form.notes.trim() || null,
                actual_duration_minutes: form.actual_duration_minutes ? Number(form.actual_duration_minutes) : null,
                cost_labor: form.cost_labor ? Number(form.cost_labor) : null,
                cost_parts: form.cost_parts ? Number(form.cost_parts) : null,
                updated_at: new Date().toISOString(),
            };
            if (form.status === "in_progress" && !order.started_at) nextPayload.started_at = new Date().toISOString();
            if (form.status === "completed") nextPayload.completed_at = new Date().toISOString();
            const { data, error } = await supabase.from("work_orders").update(nextPayload).eq("id", order.id).select().maybeSingle();
            if (error) throw error;
            setOrder((prev) => (prev ? { ...prev, ...(data as any) } : prev));
            toast({ title: "Ordine aggiornato" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Errore salvataggio", description: error?.message ?? "Impossibile aggiornare l'ordine." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${order?.title ?? "Ordine di lavoro"} - MACHINA`} />
                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="mb-2 flex flex-wrap gap-2">
                                <Badge variant="outline">{form.status}</Badge>
                                <Badge>{order?.priority ?? "medium"}</Badge>
                                <Badge variant="secondary">{order?.work_type ?? "preventive"}</Badge>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">{order?.title ?? "Ordine di lavoro"}</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {plantLabel}: {order?.plants?.name ?? "—"} · Macchina: {order?.machines?.name ?? order?.machines?.internal_code ?? "—"}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="outline"><Link href="/work-orders">Torna alla lista</Link></Button>
                            <Button type="button" onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />Salva</Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-sm text-muted-foreground">Caricamento ordine...</div>
                    ) : !order ? (
                        <Card><CardContent className="p-6 text-sm text-muted-foreground">Ordine non trovato.</CardContent></Card>
                    ) : (
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle>Dettaglio ordine</CardTitle></CardHeader>
                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Stato</Label>
                                            <select className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                                                <option value="draft">draft</option>
                                                <option value="scheduled">scheduled</option>
                                                <option value="in_progress">in_progress</option>
                                                <option value="pending_review">pending_review</option>
                                                <option value="completed">completed</option>
                                                <option value="cancelled">cancelled</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Prossime azioni rapide</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {statusActions.length === 0 ? <span className="text-sm text-muted-foreground">Nessuna</span> : statusActions.map((status) => (
                                                    <Button key={status} type="button" variant="outline" size="sm" onClick={() => setForm((prev) => ({ ...prev, status }))}>{status}</Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Descrizione</Label>
                                            <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-foreground">{order.description || "—"}</div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Lavoro eseguito</Label>
                                            <Textarea rows={5} value={form.work_performed} onChange={(e) => setForm((prev) => ({ ...prev, work_performed: e.target.value }))} placeholder="Descrivi le attività eseguite..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Causa radice</Label>
                                            <Textarea rows={4} value={form.root_cause} onChange={(e) => setForm((prev) => ({ ...prev, root_cause: e.target.value }))} placeholder="Se applicabile" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Note</Label>
                                            <Textarea rows={4} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Durata effettiva (min)</Label>
                                            <Input type="number" min={0} value={form.actual_duration_minutes} onChange={(e) => setForm((prev) => ({ ...prev, actual_duration_minutes: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Costo manodopera</Label>
                                            <Input type="number" step="0.01" min={0} value={form.cost_labor} onChange={(e) => setForm((prev) => ({ ...prev, cost_labor: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Costo ricambi</Label>
                                            <Input type="number" step="0.01" min={0} value={form.cost_parts} onChange={(e) => setForm((prev) => ({ ...prev, cost_parts: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Date</Label>
                                            <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-foreground">
                                                Programmazione: {formatDateTime(order.scheduled_start_time || order.scheduled_date)}<br />
                                                Scadenza: {formatDateTime(order.due_date)}<br />
                                                Avvio: {formatDateTime(order.started_at)}<br />
                                                Completamento: {formatDateTime(order.completed_at)}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle>Checklist compatibili</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        {checklists.length === 0 ? (
                                            <div className="text-sm text-muted-foreground">Nessuna checklist attiva trovata per questa macchina.</div>
                                        ) : (
                                            checklists.map((checklist) => (
                                                <div key={checklist.id} className="rounded-2xl border border-border p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="truncate font-semibold text-foreground">{checklist.title}</div>
                                                            <div className="mt-1 text-sm text-muted-foreground">Tipo: {checklist.checklist_type || "inspection"}</div>
                                                        </div>
                                                        <Badge variant="outline">{checklist.machine_id ? "Macchina" : "Generica"}</Badge>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={`/checklists/${checklist.id}`}>Apri</Link>
                                                        </Button>
                                                        {!isManufacturer && canExecuteChecklist && (
                                                            <Button asChild size="sm">
                                                                <Link href={`/checklists/execute/${checklist.id}?work_order_id=${order.id}`}>
                                                                    <PlayCircle className="mr-2 h-4 w-4" />
                                                                    Esegui checklist
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle>Esecuzioni già registrate</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        {executions.length === 0 ? (
                                            <div className="text-sm text-muted-foreground">Nessuna checklist eseguita su questo ordine.</div>
                                        ) : executions.map((execution) => (
                                            <div key={execution.id} className="rounded-2xl border border-border p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-foreground">{execution.checklists?.title || "Checklist"}</div>
                                                        <div className="mt-1 text-sm text-muted-foreground">Completata: {formatDateTime(execution.completed_at)}</div>
                                                    </div>
                                                    <Badge variant="outline">{execution.overall_status || "pending"}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

