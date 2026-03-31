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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CalendarDays, CheckSquare, ClipboardList, Clock3, Play, Save, ShieldCheck, User, Wrench } from "lucide-react";

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
    parts_used: unknown;
    cost_labor: number | null;
    cost_parts: number | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
    machine: {
        id: string;
        name: string | null;
        internal_code: string | null;
        area: string | null;
    } | { id: string; name: string | null; internal_code: string | null; area: string | null }[] | null;
    plant: {
        id: string;
        name: string | null;
        type: string | null;
    } | { id: string; name: string | null; type: string | null }[] | null;
};

type PlanLite = {
    id: string;
    title: string;
    instructions: string | null;
    safety_notes: string | null;
};

type ChecklistRow = {
    id: string;
    title: string;
    description: string | null;
    checklist_type: string | null;
    machine_id: string | null;
    is_template: boolean | null;
    is_active: boolean | null;
};

type ExecutionRow = {
    id: string;
    checklist_id: string;
    executed_at: string | null;
    completed_at: string | null;
    overall_status: string | null;
    notes: string | null;
    executed_by: string;
};

type ProfileLite = {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function statusMeta(status: string | null | undefined) {
    const key = String(status ?? "draft").toLowerCase();
    const map: Record<string, { label: string; className: string }> = {
        draft: { label: "Bozza", className: "border-border bg-muted text-muted-foreground" },
        scheduled: { label: "Pianificato", className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
        in_progress: { label: "In corso", className: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
        pending_review: { label: "In revisione", className: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
        completed: { label: "Completato", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
        cancelled: { label: "Annullato", className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
    };
    return map[key] ?? map.draft;
}

function priorityMeta(priority: string | null | undefined) {
    const key = String(priority ?? "medium").toLowerCase();
    const map: Record<string, { label: string; className: string }> = {
        low: { label: "Bassa", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
        medium: { label: "Media", className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
        high: { label: "Alta", className: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300" },
        critical: { label: "Critica", className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
    };
    return map[key] ?? map.medium;
}

function formatUser(profile: ProfileLite | null | undefined) {
    if (!profile) return "Non assegnato";
    const display = profile.display_name?.trim();
    if (display) return display;
    const fallback = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    return fallback || profile.email || "Utente";
}

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const id = typeof router.query.id === "string" ? router.query.id : "";

    const { organization, membership, loading: authLoading } = useAuth();
    const { plantLabel, isManufacturer, canExecuteChecklist } = useOrgType();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [row, setRow] = useState < WorkOrderRow | null > (null);
    const [plan, setPlan] = useState < PlanLite | null > (null);
    const [checklists, setChecklists] = useState < ChecklistRow[] > ([]);
    const [executions, setExecutions] = useState < ExecutionRow[] > ([]);
    const [profiles, setProfiles] = useState < Record < string, ProfileLite>> ({});
    const [draft, setDraft] = useState({
        work_performed: "",
        root_cause: "",
        notes: "",
        actual_duration_minutes: "",
        cost_labor: "",
        cost_parts: "",
        status: "draft",
    });

    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor"].includes(userRole) || (!isManufacturer && userRole === "technician");
    const canReview = ["owner", "admin", "supervisor"].includes(userRole);

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id || !id) {
            setLoading(false);
            return;
        }

        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
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
                        updated_at,
                        machine:machines(id, name, internal_code, area),
                        plant:plants(id, name, type)
                    `)
                    .eq("organization_id", organization.id)
                    .eq("id", id)
                    .single();

                if (error) throw error;
                const workOrder = data as WorkOrderRow;

                const profileIds = new Set < string > ();
                if (workOrder.assigned_to) profileIds.add(workOrder.assigned_to);

                const promises: Promise<any>[] = [];
                if (workOrder.maintenance_plan_id) {
                    promises.push(
                        supabase
                            .from("maintenance_plans")
                            .select("id, title, instructions, safety_notes")
                            .eq("organization_id", organization.id)
                            .eq("id", workOrder.maintenance_plan_id)
                            .maybeSingle()
                    );
                } else {
                    promises.push(Promise.resolve({ data: null, error: null }));
                }

                promises.push(
                    supabase
                        .from("checklists")
                        .select("id, title, description, checklist_type, machine_id, is_template, is_active")
                        .eq("organization_id", organization.id)
                        .eq("is_active", true)
                        .or(`machine_id.eq.${workOrder.machine_id},machine_id.is.null`)
                        .order("title", { ascending: true })
                );

                promises.push(
                    supabase
                        .from("checklist_executions")
                        .select("id, checklist_id, executed_at, completed_at, overall_status, notes, executed_by")
                        .eq("work_order_id", workOrder.id)
                        .order("executed_at", { ascending: false })
                );

                const [planRes, checklistRes, executionRes] = await Promise.all(promises);
                if (planRes.error) throw planRes.error;
                if (checklistRes.error) throw checklistRes.error;
                if (executionRes.error) throw executionRes.error;

                ((executionRes.data ?? []) as ExecutionRow[]).forEach((execution) => profileIds.add(execution.executed_by));

                let profileMap: Record<string, ProfileLite> = {};
                if (profileIds.size > 0) {
                    const { data: profileRows, error: profileError } = await supabase
                        .from("profiles")
                        .select("id, display_name, first_name, last_name, email")
                        .in("id", Array.from(profileIds));
                    if (profileError) throw profileError;
                    profileMap = Object.fromEntries(((profileRows ?? []) as ProfileLite[]).map((profile) => [profile.id, profile]));
                }

                if (!active) return;
                setRow(workOrder);
                setPlan((planRes.data ?? null) as PlanLite | null);
                setChecklists((checklistRes.data ?? []) as ChecklistRow[]);
                setExecutions((executionRes.data ?? []) as ExecutionRow[]);
                setProfiles(profileMap);
                setDraft({
                    work_performed: workOrder.work_performed ?? "",
                    root_cause: workOrder.root_cause ?? "",
                    notes: workOrder.notes ?? "",
                    actual_duration_minutes: workOrder.actual_duration_minutes != null ? String(workOrder.actual_duration_minutes) : "",
                    cost_labor: workOrder.cost_labor != null ? String(workOrder.cost_labor) : "",
                    cost_parts: workOrder.cost_parts != null ? String(workOrder.cost_parts) : "",
                    status: workOrder.status ?? "draft",
                });
            } catch (error: any) {
                console.error("work order detail load error:", error);
                toast({
                    title: "Errore caricamento ordine",
                    description: error?.message || "Impossibile caricare il dettaglio ordine.",
                    variant: "destructive",
                });
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, id, organization?.id, toast]);

    const machine = useMemo(() => unwrapRelation(row?.machine ?? null), [row]);
    const plant = useMemo(() => unwrapRelation(row?.plant ?? null), [row]);
    const checklistTitleMap = useMemo(() => Object.fromEntries(checklists.map((checklist) => [checklist.id, checklist.title])), [checklists]);

    const handleSave = async () => {
        if (!organization?.id || !row) return;
        setSaving(true);
        try {
            const payload = {
                work_performed: draft.work_performed.trim() || null,
                root_cause: draft.root_cause.trim() || null,
                notes: draft.notes.trim() || null,
                actual_duration_minutes: draft.actual_duration_minutes ? Number(draft.actual_duration_minutes) : null,
                cost_labor: draft.cost_labor ? Number(draft.cost_labor) : null,
                cost_parts: draft.cost_parts ? Number(draft.cost_parts) : null,
                status: draft.status,
            };

            const { data, error } = await supabase
                .from("work_orders")
                .update(payload)
                .eq("organization_id", organization.id)
                .eq("id", row.id)
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
                    updated_at,
                    machine:machines(id, name, internal_code, area),
                    plant:plants(id, name, type)
                `)
                .single();

            if (error) throw error;
            setRow(data as WorkOrderRow);
            toast({ title: "Ordine aggiornato", description: "Le informazioni operative sono state salvate." });
        } catch (error: any) {
            console.error("work order update error:", error);
            toast({ title: "Errore aggiornamento ordine", description: error?.message || "Impossibile salvare le modifiche.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleTransition = async (nextStatus: string) => {
        if (!organization?.id || !row) return;
        setSaving(true);
        try {
            const patch: Record<string, any> = { status: nextStatus };
            if (nextStatus === "in_progress" && !row.started_at) patch.started_at = new Date().toISOString();
            if (nextStatus === "completed") patch.completed_at = new Date().toISOString();

            const { data, error } = await supabase
                .from("work_orders")
                .update(patch)
                .eq("organization_id", organization.id)
                .eq("id", row.id)
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
                    updated_at,
                    machine:machines(id, name, internal_code, area),
                    plant:plants(id, name, type)
                `)
                .single();

            if (error) throw error;
            setRow(data as WorkOrderRow);
            setDraft((current) => ({ ...current, status: nextStatus }));
            toast({ title: "Stato aggiornato", description: `Ordine portato a ${statusMeta(nextStatus).label.toLowerCase()}.` });
        } catch (error: any) {
            console.error("work order transition error:", error);
            toast({ title: "Errore cambio stato", description: error?.message || "Impossibile aggiornare lo stato.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <MainLayout userRole={userRole}>
                <div className="p-8 text-sm text-muted-foreground">Caricamento ordine di lavoro...</div>
            </MainLayout>
        );
    }

    if (!row) {
        return (
            <MainLayout userRole={userRole}>
                <div className="mx-auto max-w-4xl p-8">
                    <Card className="rounded-2xl">
                        <CardContent className="p-6 text-sm text-muted-foreground">Ordine di lavoro non trovato.</CardContent>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    const currentStatus = String(row.status ?? "draft").toLowerCase();
    const statusBadge = statusMeta(currentStatus);
    const priorityBadge = priorityMeta(row.priority);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${row.title} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Link href="/work-orders">
                                <Button variant="outline">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Ordini di lavoro
                                </Button>
                            </Link>
                            <Badge variant="outline" className={statusBadge.className}>{statusBadge.label}</Badge>
                            <Badge variant="outline" className={priorityBadge.className}>{priorityBadge.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {canEdit && (currentStatus === "draft" || currentStatus === "scheduled") && !isManufacturer && (
                                <Button variant="outline" onClick={() => handleTransition("in_progress")} disabled={saving}>
                                    <Play className="mr-2 h-4 w-4" />
                                    Inizia lavoro
                                </Button>
                            )}
                            {canEdit && currentStatus === "in_progress" && !isManufacturer && (
                                <Button variant="outline" onClick={() => handleTransition("pending_review")} disabled={saving}>
                                    <CheckSquare className="mr-2 h-4 w-4" />
                                    Invia in revisione
                                </Button>
                            )}
                            {canReview && currentStatus === "pending_review" && (
                                <Button variant="outline" onClick={() => handleTransition("completed")} disabled={saving}>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Approva e completa
                                </Button>
                            )}
                            {canEdit && (
                                <Button onClick={handleSave} disabled={saving}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {saving ? "Salvataggio..." : "Salva note"}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>{row.title}</CardTitle>
                                <CardDescription>
                                    {isManufacturer
                                        ? "Ordine da monitorare sul cliente finale."
                                        : "Ordine operativo assegnabile al team manutenzione."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <InfoRow icon={Wrench} label="Macchina" value={machine?.internal_code?.trim() ? `${machine.internal_code} · ${machine.name ?? "Macchina"}` : machine?.name ?? "—"} />
                                    <InfoRow icon={CalendarDays} label={plantLabel} value={plant?.name ?? "—"} />
                                    <InfoRow icon={Clock3} label="Tipo lavoro" value={row.work_type || "preventive"} />
                                    <InfoRow icon={User} label="Assegnatario" value={row.assigned_to ? formatUser(profiles[row.assigned_to]) : "Non assegnato"} />
                                    <InfoRow icon={CalendarDays} label="Data programmata" value={formatDate(row.scheduled_date)} />
                                    <InfoRow icon={CalendarDays} label="Scadenza" value={formatDate(row.due_date)} />
                                </div>
                                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-foreground">
                                    {row.description?.trim() || "Nessuna descrizione operativa inserita."}
                                </div>
                                {plan && (
                                    <div className="rounded-2xl border border-border p-4 text-sm">
                                        <div className="font-medium text-foreground">Origine piano: {plan.title}</div>
                                        {plan.instructions && <div className="mt-2 text-muted-foreground">Istruzioni: {plan.instructions}</div>}
                                        {plan.safety_notes && <div className="mt-2 text-muted-foreground">Sicurezza: {plan.safety_notes}</div>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Stato e costi</CardTitle>
                                <CardDescription>Compila note di esecuzione, durata e costi consuntivi.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Stato</Label>
                                        <Input value={statusBadge.label} readOnly />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Durata effettiva (min)</Label>
                                        <Input value={draft.actual_duration_minutes} onChange={(event) => setDraft((current) => ({ ...current, actual_duration_minutes: event.target.value }))} inputMode="numeric" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Costo manodopera</Label>
                                        <Input value={draft.cost_labor} onChange={(event) => setDraft((current) => ({ ...current, cost_labor: event.target.value }))} inputMode="decimal" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Costo ricambi</Label>
                                        <Input value={draft.cost_parts} onChange={(event) => setDraft((current) => ({ ...current, cost_parts: event.target.value }))} inputMode="decimal" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wo-work-performed">Lavoro eseguito</Label>
                                    <Textarea id="wo-work-performed" rows={4} value={draft.work_performed} onChange={(event) => setDraft((current) => ({ ...current, work_performed: event.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wo-root-cause">Causa radice</Label>
                                    <Textarea id="wo-root-cause" rows={3} value={draft.root_cause} onChange={(event) => setDraft((current) => ({ ...current, root_cause: event.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wo-notes">Note finali</Label>
                                    <Textarea id="wo-notes" rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Checklist associate alla macchina</CardTitle>
                                <CardDescription>
                                    In assenza di tabella ponte ordine↔checklist, qui mostriamo le checklist attive compatibili con la macchina dell'ordine.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {checklists.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                        Nessuna checklist disponibile per questa macchina.
                                    </div>
                                ) : (
                                    checklists.map((checklist) => {
                                        const execution = executions.find((item) => item.checklist_id === checklist.id);
                                        return (
                                            <div key={checklist.id} className="rounded-2xl border border-border p-4">
                                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-medium text-foreground">{checklist.title}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Tipo: {checklist.checklist_type || "inspection"}
                                                            {checklist.machine_id ? " · specifica macchina" : " · template generico"}
                                                        </div>
                                                        {execution && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Ultima esecuzione collegata: {formatDate(execution.completed_at || execution.executed_at)} · stato {execution.overall_status || "pending"}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Link href={`/checklists/${checklist.id}`}>
                                                            <Button variant="outline" size="sm">Dettaglio</Button>
                                                        </Link>
                                                        {canExecuteChecklist && (
                                                            <Link href={`/checklists/execute/${checklist.id}?work_order_id=${row.id}&machine_id=${row.machine_id}`}>
                                                                <Button size="sm">Esegui checklist</Button>
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Timeline esecuzioni</CardTitle>
                                <CardDescription>Storico delle checklist eseguite dentro questo ordine di lavoro.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {executions.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                        Nessuna esecuzione checklist ancora registrata.
                                    </div>
                                ) : (
                                    executions.map((execution) => (
                                        <div key={execution.id} className="rounded-2xl border border-border p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline">{execution.overall_status || "pending"}</Badge>
                                                <div className="text-sm font-medium text-foreground">{checklistTitleMap[execution.checklist_id] ?? execution.checklist_id}</div>
                                            </div>
                                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                                <div>Eseguita da: {formatUser(profiles[execution.executed_by])}</div>
                                                <div>Avvio: {formatDate(execution.executed_at)}</div>
                                                <div>Completamento: {formatDate(execution.completed_at)}</div>
                                                {execution.notes && <div>Note: {execution.notes}</div>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">{value || "—"}</div>
        </div>
    );
}

