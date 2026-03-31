import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardCheck, Loader2, Play, Save, User, Wrench } from "lucide-react";

type WorkOrderRow = {
    id: string;
    organization_id: string;
    machine_id: string;
    plant_id: string | null;
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
    created_at?: string | null;
    updated_at?: string | null;
};

type MachineRow = { id: string; name: string | null; internal_code: string | null; area: string | null; plant_id?: string | null };
type PlantRow = { id: string; name: string | null };
type ProfileRow = { id: string; display_name: string | null; first_name: string | null; last_name: string | null; email: string | null };
type ChecklistRow = { id: string; title: string | null; checklist_type: string | null; machine_id: string | null };
type ExecutionRow = { id: string; checklist_id: string; executed_at: string | null; completed_at: string | null; overall_status: string | null; notes: string | null };

const statusOptions = [
    { value: "draft", label: "Bozza" },
    { value: "scheduled", label: "Pianificato" },
    { value: "in_progress", label: "In corso" },
    { value: "pending_review", label: "In revisione" },
    { value: "completed", label: "Completato" },
    { value: "cancelled", label: "Annullato" },
];

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

function formatDateOnly(value: string | null | undefined) {
    if (!value) return "—";
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function profileLabel(profile: ProfileRow | null) {
    if (!profile) return "Non assegnato";
    const display = profile.display_name?.trim();
    if (display) return display;
    const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    return name || profile.email || "Utente";
}

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { loading: authLoading, organization, membership } = useAuth();
    const { canExecuteChecklist, plantLabel } = useOrgType();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [row, setRow] = useState < WorkOrderRow | null > (null);
    const [machine, setMachine] = useState < MachineRow | null > (null);
    const [plant, setPlant] = useState < PlantRow | null > (null);
    const [assignee, setAssignee] = useState < ProfileRow | null > (null);
    const [checklists, setChecklists] = useState < ChecklistRow[] > ([]);
    const [executions, setExecutions] = useState < ExecutionRow[] > ([]);

    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);
    const userRole = membership?.role ?? "viewer";
    const canEdit = ["admin", "supervisor", "technician", "owner"].includes(userRole);

    useEffect(() => {
        if (authLoading || !organization?.id || !resolvedId) return;
        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const { data: orderRow, error: orderError } = await supabase
                    .from("work_orders")
                    .select(`
            id,
            organization_id,
            machine_id,
            plant_id,
            maintenance_plan_id,
            title,
            description,
            work_type,
            priority,
            status,
            scheduled_date,
            scheduled_start_time,
            due_date,
            assigned_to,
            started_at,
            completed_at,
            actual_duration_minutes,
            work_performed,
            root_cause,
            parts_used,
            cost_labor,
            cost_parts,
            notes,
            created_at,
            updated_at
          `)
                    .eq("organization_id", organization.id)
                    .eq("id", resolvedId)
                    .single();

                if (orderError) throw orderError;
                const workOrder = orderRow as WorkOrderRow;

                const tasks = [
                    supabase.from("machines").select("id, name, internal_code, area, plant_id").eq("id", workOrder.machine_id).maybeSingle(),
                    workOrder.plant_id ? supabase.from("plants").select("id, name").eq("id", workOrder.plant_id).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
                    workOrder.assigned_to ? supabase.from("profiles").select("id, display_name, first_name, last_name, email").eq("id", workOrder.assigned_to).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
                    supabase.from("checklists").select("id, title, checklist_type, machine_id").eq("organization_id", organization.id).eq("is_active", true).or(`machine_id.eq.${workOrder.machine_id},machine_id.is.null`).order("title", { ascending: true }),
                    supabase.from("checklist_executions").select("id, checklist_id, executed_at, completed_at, overall_status, notes").eq("work_order_id", resolvedId).order("executed_at", { ascending: false }),
                ];

                const [machineRes, plantRes, assigneeRes, checklistRes, executionRes] = await Promise.all(tasks as any);
                if (machineRes.error) throw machineRes.error;
                if (plantRes?.error) throw plantRes.error;
                if (assigneeRes?.error) throw assigneeRes.error;
                if (checklistRes.error) throw checklistRes.error;
                if (executionRes.error) throw executionRes.error;

                if (!active) return;
                setRow(workOrder);
                setMachine((machineRes.data ?? null) as MachineRow | null);
                setPlant((plantRes?.data ?? null) as PlantRow | null);
                setAssignee((assigneeRes?.data ?? null) as ProfileRow | null);
                setChecklists((checklistRes.data ?? []) as ChecklistRow[]);
                setExecutions((executionRes.data ?? []) as ExecutionRow[]);
            } catch (error: any) {
                console.error("work order detail load error", error);
                toast({ title: "Errore caricamento ordine", description: error?.message || "Impossibile aprire il dettaglio ordine.", variant: "destructive" });
                if (active) setRow(null);
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [authLoading, organization?.id, resolvedId, toast]);

    const handlePatch = async (patch: Partial<WorkOrderRow>) => {
        if (!row || !resolvedId) return;
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from("work_orders")
                .update({ ...patch, updated_at: new Date().toISOString() })
                .eq("id", resolvedId)
                .select(`
          id, organization_id, machine_id, plant_id, maintenance_plan_id, title, description,
          work_type, priority, status, scheduled_date, scheduled_start_time, due_date, assigned_to,
          started_at, completed_at, actual_duration_minutes, work_performed, root_cause, parts_used,
          cost_labor, cost_parts, notes, created_at, updated_at
        `)
                .single();
            if (error) throw error;
            setRow(data as WorkOrderRow);
            toast({ title: "Ordine aggiornato", description: "Le modifiche sono state salvate." });
        } catch (error: any) {
            console.error("work order update error", error);
            toast({ title: "Errore salvataggio", description: error?.message || "Impossibile salvare l'ordine.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return <MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">Caricamento ordine di lavoro...</div></MainLayout>;
    }

    if (!row) {
        return <MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">Ordine di lavoro non trovato.</div></MainLayout>;
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${row.title || "Ordine di lavoro"} - MACHINA`} />
                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link href="/work-orders"><Button variant="outline" className="rounded-2xl"><ArrowLeft className="mr-2 h-4 w-4" /> Ordini di lavoro</Button></Link>
                        {canEdit && <Button onClick={() => handlePatch({})} disabled={saving} className="rounded-2xl">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salva</Button>}
                    </div>

                    <Card className="rounded-3xl border-border/70 shadow-sm">
                        <CardContent className="space-y-6 p-6">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="rounded-full">{row.status || "draft"}</Badge>
                                <Badge variant="outline" className="rounded-full">{row.priority || "medium"}</Badge>
                                <Badge variant="outline" className="rounded-full">{row.work_type}</Badge>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
                                <div className="space-y-4">
                                    <div>
                                        <Label>Titolo</Label>
                                        <Input value={row.title ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, title: e.target.value } : prev)} className="mt-2 rounded-2xl" disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <Label>Descrizione</Label>
                                        <Textarea value={row.description ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, description: e.target.value } : prev)} className="mt-2 min-h-[120px] rounded-2xl" disabled={!canEdit} />
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                    <InfoBox label="Macchina" value={machine?.name || machine?.internal_code || row.machine_id} icon={<Wrench className="h-4 w-4" />} />
                                    <InfoBox label={plantLabel} value={plant?.name || "—"} icon={<CalendarDays className="h-4 w-4" />} />
                                    <InfoBox label="Area / linea" value={machine?.area?.trim() || "—"} icon={<ClipboardCheck className="h-4 w-4" />} />
                                    <InfoBox label="Assegnatario" value={profileLabel(assignee)} icon={<User className="h-4 w-4" />} />
                                    <InfoBox label="Data programmata" value={formatDateOnly(row.scheduled_date)} icon={<CalendarDays className="h-4 w-4" />} />
                                    <InfoBox label="Scadenza" value={formatDateOnly(row.due_date)} icon={<CalendarDays className="h-4 w-4" />} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <Card className="rounded-3xl border-border/70 shadow-sm">
                            <CardHeader>
                                <CardTitle>Avanzamento lavoro</CardTitle>
                                <CardDescription>Stato operativo, note e consuntivo.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <Label>Stato</Label>
                                        <Select value={row.status || "draft"} onValueChange={(value) => setRow((prev) => prev ? { ...prev, status: value } : prev)} disabled={!canEdit}>
                                            <SelectTrigger className="mt-2 rounded-2xl"><SelectValue /></SelectTrigger>
                                            <SelectContent>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Durata effettiva (min)</Label>
                                        <Input type="number" value={row.actual_duration_minutes ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, actual_duration_minutes: e.target.value ? Number(e.target.value) : null } : prev)} className="mt-2 rounded-2xl" disabled={!canEdit} />
                                    </div>
                                </div>
                                <div>
                                    <Label>Lavoro eseguito</Label>
                                    <Textarea value={row.work_performed ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, work_performed: e.target.value } : prev)} className="mt-2 min-h-[120px] rounded-2xl" disabled={!canEdit} />
                                </div>
                                <div>
                                    <Label>Causa radice</Label>
                                    <Textarea value={row.root_cause ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, root_cause: e.target.value } : prev)} className="mt-2 min-h-[90px] rounded-2xl" disabled={!canEdit} />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <Label>Costo manodopera</Label>
                                        <Input type="number" step="0.01" value={row.cost_labor ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, cost_labor: e.target.value ? Number(e.target.value) : null } : prev)} className="mt-2 rounded-2xl" disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <Label>Costo ricambi</Label>
                                        <Input type="number" step="0.01" value={row.cost_parts ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, cost_parts: e.target.value ? Number(e.target.value) : null } : prev)} className="mt-2 rounded-2xl" disabled={!canEdit} />
                                    </div>
                                </div>
                                <div>
                                    <Label>Note</Label>
                                    <Textarea value={row.notes ?? ""} onChange={(e) => setRow((prev) => prev ? { ...prev, notes: e.target.value } : prev)} className="mt-2 min-h-[100px] rounded-2xl" disabled={!canEdit} />
                                </div>
                                {canEdit && (
                                    <div className="flex flex-wrap gap-3">
                                        <Button type="button" variant="outline" className="rounded-2xl" onClick={() => handlePatch({ status: "in_progress", started_at: row.started_at || new Date().toISOString() })}><Play className="mr-2 h-4 w-4" /> Inizia lavoro</Button>
                                        <Button type="button" className="rounded-2xl" onClick={() => handlePatch({ status: "completed", completed_at: new Date().toISOString() })}><CheckCircle2 className="mr-2 h-4 w-4" /> Completa ordine</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="rounded-3xl border-border/70 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Checklist compatibili</CardTitle>
                                    <CardDescription>Template attivi per la macchina selezionata o generici.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {checklists.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">Nessuna checklist disponibile per questa macchina.</div> : checklists.map((item) => (
                                        <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="font-medium text-foreground">{item.title || "Checklist"}</div>
                                                <div className="text-sm text-muted-foreground">Tipo: {item.checklist_type || "inspection"}</div>
                                            </div>
                                            {canExecuteChecklist ? <Link href={`/checklists/execute/${item.id}?work_order_id=${row.id}`}><Button size="sm" className="rounded-2xl">Esegui checklist</Button></Link> : <Badge variant="outline" className="rounded-full">Read-only</Badge>}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-border/70 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Storico esecuzioni</CardTitle>
                                    <CardDescription>Checklist già compilate dentro questo ordine di lavoro.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {executions.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">Nessuna esecuzione checklist collegata a questo ordine.</div> : executions.map((execution) => (
                                        <div key={execution.id} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="font-medium text-foreground">Esecuzione {execution.id.slice(0, 8)}</div>
                                                <Badge variant="outline" className="rounded-full">{execution.overall_status || "pending"}</Badge>
                                            </div>
                                            <div className="mt-2 text-sm text-muted-foreground">Eseguita: {formatDate(execution.executed_at)} · Completata: {formatDate(execution.completed_at)}</div>
                                            {execution.notes ? <p className="mt-3 text-sm text-foreground">{execution.notes}</p> : null}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function InfoBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}<span>{label}</span></div>
            <div className="mt-2 text-base font-semibold text-foreground break-words">{value}</div>
        </div>
    );
}
