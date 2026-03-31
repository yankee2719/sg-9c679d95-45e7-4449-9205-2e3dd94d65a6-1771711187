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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ClipboardCheck, PlayCircle, Plus, Wrench } from "lucide-react";

type ChecklistRow = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    checklist_type: string | null;
    is_template: boolean | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
    created_by: string | null;
};

type ChecklistItemRow = {
    id: string;
    checklist_id: string;
    title: string;
    description: string | null;
    item_order: number | null;
    is_required: boolean | null;
    expected_value: string | null;
    measurement_unit: string | null;
    min_value: number | null;
    max_value: number | null;
    created_at: string | null;
};

type ExecutionRow = {
    id: string;
    checklist_id: string;
    machine_id: string | null;
    work_order_id: string | null;
    executed_by: string;
    executed_at: string | null;
    completed_at: string | null;
    overall_status: string | null;
    notes: string | null;
    created_at: string | null;
};

type MachineLite = {
    id: string;
    name: string | null;
    internal_code: string | null;
    plant_id: string | null;
    area: string | null;
};

type PlantLite = { id: string; name: string | null; type: string | null };

type WorkOrderLite = {
    id: string;
    title: string;
    status: string | null;
    due_date: string | null;
};

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: value.includes("T") ? "2-digit" : undefined,
        minute: value.includes("T") ? "2-digit" : undefined,
    }).format(date);
}

function checklistTypeLabel(value: string | null | undefined) {
    switch (String(value ?? "inspection").toLowerCase()) {
        case "startup":
            return "Avvio";
        case "shutdown":
            return "Arresto";
        case "safety":
            return "Sicurezza";
        case "quality":
            return "Qualità";
        case "custom":
            return "Personalizzata";
        default:
            return "Ispezione";
    }
}

function executionStatusLabel(value: string | null | undefined) {
    switch (String(value ?? "pending").toLowerCase()) {
        case "passed":
            return "Superata";
        case "failed":
            return "Fallita";
        case "partial":
            return "Parziale";
        default:
            return "In sospeso";
    }
}

function executionStatusClass(value: string | null | undefined) {
    switch (String(value ?? "pending").toLowerCase()) {
        case "passed":
            return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
        case "failed":
            return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
        case "partial":
            return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        default:
            return "border-border bg-muted text-muted-foreground";
    }
}

function workOrderStatusLabel(value: string | null | undefined) {
    switch (String(value ?? "draft").toLowerCase()) {
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
            return "Bozza";
    }
}

export default function ChecklistDetailPage() {
    const router = useRouter();
    const checklistId = typeof router.query.id === "string" ? router.query.id : "";

    const { loading: authLoading, organization, membership } = useAuth();
    const { toast } = useToast();
    const { isManufacturer, plantLabel, canExecuteChecklist, checklistsLabel } = useOrgType();

    const [loading, setLoading] = useState(true);
    const [checklist, setChecklist] = useState < ChecklistRow | null > (null);
    const [items, setItems] = useState < ChecklistItemRow[] > ([]);
    const [executions, setExecutions] = useState < ExecutionRow[] > ([]);
    const [machine, setMachine] = useState < MachineLite | null > (null);
    const [plant, setPlant] = useState < PlantLite | null > (null);
    const [linkedOrders, setLinkedOrders] = useState < Record < string, WorkOrderLite>> ({});

    useEffect(() => {
        if (authLoading) return;
        if (!organization?.id || !checklistId) {
            setLoading(false);
            return;
        }

        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const { data: checklistRow, error: checklistError } = await supabase
                    .from("checklists")
                    .select("id, organization_id, machine_id, title, description, checklist_type, is_template, is_active, created_at, updated_at, created_by")
                    .eq("organization_id", organization.id)
                    .eq("id", checklistId)
                    .single();
                if (checklistError) throw checklistError;

                const currentChecklist = checklistRow as ChecklistRow;

                const [{ data: itemRows, error: itemError }, { data: executionRows, error: executionError }] = await Promise.all([
                    supabase
                        .from("checklist_items")
                        .select("id, checklist_id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value, created_at")
                        .eq("checklist_id", checklistId)
                        .order("item_order", { ascending: true }),
                    supabase
                        .from("checklist_executions")
                        .select("id, checklist_id, machine_id, work_order_id, executed_by, executed_at, completed_at, overall_status, notes, created_at")
                        .eq("checklist_id", checklistId)
                        .order("executed_at", { ascending: false }),
                ]);

                if (itemError) throw itemError;
                if (executionError) throw executionError;

                let machineRow: MachineLite | null = null;
                let plantRow: PlantLite | null = null;

                if (currentChecklist.machine_id) {
                    const { data: machineData, error: machineError } = await supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id, area")
                        .eq("id", currentChecklist.machine_id)
                        .maybeSingle();
                    if (machineError) throw machineError;
                    machineRow = (machineData as MachineLite | null) ?? null;

                    if (machineRow?.plant_id) {
                        const { data: plantData, error: plantError } = await supabase
                            .from("plants")
                            .select("id, name, type")
                            .eq("id", machineRow.plant_id)
                            .maybeSingle();
                        if (plantError) throw plantError;
                        plantRow = (plantData as PlantLite | null) ?? null;
                    }
                }

                const orderIds = Array.from(new Set(((executionRows ?? []) as ExecutionRow[]).map((row) => row.work_order_id).filter(Boolean))) as string[];
                let orderMap: Record<string, WorkOrderLite> = {};
                if (orderIds.length > 0) {
                    const { data: orderRows, error: orderError } = await supabase
                        .from("work_orders")
                        .select("id, title, status, due_date")
                        .in("id", orderIds);
                    if (orderError) throw orderError;
                    orderMap = Object.fromEntries(((orderRows ?? []) as WorkOrderLite[]).map((row) => [row.id, row]));
                }

                if (!active) return;
                setChecklist(currentChecklist);
                setItems((itemRows ?? []) as ChecklistItemRow[]);
                setExecutions((executionRows ?? []) as ExecutionRow[]);
                setMachine(machineRow);
                setPlant(plantRow);
                setLinkedOrders(orderMap);
            } catch (error: any) {
                console.error("Checklist detail load error:", error);
                if (!active) return;
                toast({
                    title: "Errore caricamento checklist",
                    description: error?.message ?? "Impossibile caricare il dettaglio checklist.",
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
    }, [authLoading, checklistId, organization?.id, toast]);

    const stats = useMemo(() => {
        const total = executions.length;
        const passed = executions.filter((row) => String(row.overall_status ?? "").toLowerCase() === "passed").length;
        const failed = executions.filter((row) => String(row.overall_status ?? "").toLowerCase() === "failed").length;
        const lastRun = executions[0]?.completed_at ?? executions[0]?.executed_at ?? null;
        return { total, passed, failed, lastRun };
    }, [executions]);

    const userRole = membership?.role ?? "viewer";
    const canManage = ["owner", "admin", "supervisor"].includes(userRole);
    const executionHref = checklist ? `/checklists/execute/${checklist.id}` : "/checklists";

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${checklist?.title ?? checklistsLabel} - MACHINA`} />
                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-7xl space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Button variant="ghost" onClick={() => router.push("/checklists")} className="mb-2 -ml-3 px-3">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Torna alla lista
                                </Button>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                                    {loading ? "Caricamento checklist..." : checklist?.title ?? "Checklist"}
                                </h1>
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                                    {isManufacturer
                                        ? "Template checklist e risultati esecuzioni sui clienti in sola lettura."
                                        : "Dettaglio template, storico esecuzioni e accesso rapido alla compilazione sul campo."}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {canManage && checklist ? (
                                    <Button variant="outline" asChild className="rounded-2xl">
                                        <Link href={`/checklists/new?clone=${checklist.id}`}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Duplica
                                        </Link>
                                    </Button>
                                ) : null}
                                {canExecuteChecklist && checklist ? (
                                    <Button asChild className="rounded-2xl">
                                        <Link href={executionHref}>
                                            <PlayCircle className="mr-2 h-4 w-4" />
                                            Esegui checklist
                                        </Link>
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <Card className="rounded-2xl"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Punti controllo</div><div className="mt-2 text-3xl font-semibold text-foreground">{items.length}</div></CardContent></Card>
                            <Card className="rounded-2xl"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Esecuzioni totali</div><div className="mt-2 text-3xl font-semibold text-foreground">{stats.total}</div></CardContent></Card>
                            <Card className="rounded-2xl"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Esecuzioni fallite</div><div className="mt-2 text-3xl font-semibold text-rose-600 dark:text-rose-300">{stats.failed}</div></CardContent></Card>
                            <Card className="rounded-2xl"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Ultima esecuzione</div><div className="mt-2 text-base font-semibold text-foreground">{formatDate(stats.lastRun)}</div></CardContent></Card>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Contesto checklist</CardTitle>
                                    <CardDescription>Tipo, macchina collegata e impostazioni principali del template.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    {loading ? (
                                        <div className="text-muted-foreground">Caricamento...</div>
                                    ) : !checklist ? (
                                        <div className="text-muted-foreground">Checklist non trovata.</div>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="rounded-full">{checklistTypeLabel(checklist.checklist_type)}</Badge>
                                                <Badge variant="outline" className="rounded-full">{checklist.is_template ? "Template" : "Operativa"}</Badge>
                                                <Badge variant="outline" className="rounded-full">{checklist.is_active ? "Attiva" : "Disattivata"}</Badge>
                                            </div>
                                            <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Titolo</div>
                                                <div className="mt-1 font-medium text-foreground">{checklist.title}</div>
                                            </div>
                                            <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Descrizione</div>
                                                <div className="mt-1 whitespace-pre-wrap text-foreground">{checklist.description?.trim() || "—"}</div>
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{plantLabel}</div>
                                                    <div className="mt-1 font-medium text-foreground">{plant?.name ?? "Template generico"}</div>
                                                </div>
                                                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Macchina</div>
                                                    <div className="mt-1 font-medium text-foreground">
                                                        {machine ? `${machine.name ?? "Macchina"}${machine.internal_code ? ` · ${machine.internal_code}` : ""}` : "Template generico"}
                                                    </div>
                                                    {machine?.area ? <div className="mt-1 text-xs text-muted-foreground">Area: {machine.area}</div> : null}
                                                </div>
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Creata il</div>
                                                    <div className="mt-1 font-medium text-foreground">{formatDate(checklist.created_at)}</div>
                                                </div>
                                                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Aggiornata il</div>
                                                    <div className="mt-1 font-medium text-foreground">{formatDate(checklist.updated_at)}</div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Punti di controllo</CardTitle>
                                    <CardDescription>Elenco item in ordine operativo con target, range e obbligatorietà.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <div className="text-sm text-muted-foreground">Caricamento item...</div>
                                    ) : items.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Questa checklist non ha ancora punti di controllo.</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {items.map((item, index) => (
                                                <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Step {index + 1}</div>
                                                            <div className="mt-1 font-medium text-foreground">{item.title}</div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="outline" className="rounded-full">{item.is_required ? "Obbligatorio" : "Opzionale"}</Badge>
                                                            {item.measurement_unit || item.min_value !== null || item.max_value !== null ? (
                                                                <Badge variant="outline" className="rounded-full">Numerico</Badge>
                                                            ) : item.expected_value ? (
                                                                <Badge variant="outline" className="rounded-full">Valore atteso</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="rounded-full">Checklist</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {item.description ? <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p> : null}
                                                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                        {item.expected_value ? <span>Target: {item.expected_value}</span> : null}
                                                        {item.measurement_unit ? <span>Unità: {item.measurement_unit}</span> : null}
                                                        {item.min_value !== null ? <span>Min: {item.min_value}</span> : null}
                                                        {item.max_value !== null ? <span>Max: {item.max_value}</span> : null}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="rounded-2xl">
                            <CardHeader>
                                <CardTitle>Storico esecuzioni</CardTitle>
                                <CardDescription>
                                    {isManufacturer
                                        ? "Risultati eseguiti dai clienti sulle macchine vendute."
                                        : "Storico esecuzioni con eventuali ordini di lavoro collegati."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="text-sm text-muted-foreground">Caricamento esecuzioni...</div>
                                ) : executions.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Nessuna esecuzione registrata per questa checklist.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {executions.map((row) => {
                                            const linkedOrder = row.work_order_id ? linkedOrders[row.work_order_id] : null;
                                            return (
                                                <div key={row.id} className="rounded-2xl border border-border bg-background p-4">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-medium text-foreground">Eseguita il {formatDate(row.completed_at ?? row.executed_at)}</div>
                                                            <div className="mt-1 text-xs text-muted-foreground">ID esecuzione: {row.id}</div>
                                                        </div>
                                                        <Badge variant="outline" className={`rounded-full ${executionStatusClass(row.overall_status)}`}>
                                                            {executionStatusLabel(row.overall_status)}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                        <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">
                                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Ordine collegato</div>
                                                            {linkedOrder ? (
                                                                <div className="mt-1">
                                                                    <Link href={`/work-orders/${linkedOrder.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                                                                        {linkedOrder.title}
                                                                    </Link>
                                                                    <div className="mt-1 text-xs text-muted-foreground">{workOrderStatusLabel(linkedOrder.status)} · Scadenza {formatDate(linkedOrder.due_date)}</div>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-1 text-muted-foreground">Esecuzione standalone</div>
                                                            )}
                                                        </div>
                                                        <div className="rounded-2xl border border-border bg-muted/30 p-3 text-sm">
                                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Note finali</div>
                                                            <div className="mt-1 whitespace-pre-wrap text-foreground">{row.notes?.trim() || "—"}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

