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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ClipboardCheck, Play, Wrench } from "lucide-react";

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
    results: any;
};

type MachineLite = { id: string; name: string | null; internal_code: string | null; plant_id: string | null; area: string | null };
type PlantLite = { id: string; name: string | null; type: string | null };
type WorkOrderLite = { id: string; title: string | null; status: string | null };
type ProfileLite = { id: string; display_name: string | null; first_name: string | null; last_name: string | null; email: string | null };

function formatDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function typeLabel(value: string | null | undefined) {
    switch (String(value ?? "inspection").toLowerCase()) {
        case "startup": return "Avvio";
        case "shutdown": return "Arresto";
        case "safety": return "Sicurezza";
        case "quality": return "Qualità";
        case "custom": return "Personalizzata";
        default: return "Ispezione";
    }
}

function statusLabel(value: string | null | undefined) {
    switch (String(value ?? "pending").toLowerCase()) {
        case "passed": return "Superata";
        case "failed": return "Fallita";
        case "partial": return "Parziale";
        default: return "In sospeso";
    }
}

function statusBadgeClass(value: string | null | undefined) {
    switch (String(value ?? "pending").toLowerCase()) {
        case "passed": return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
        case "failed": return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
        case "partial": return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        default: return "border-border bg-muted text-muted-foreground";
    }
}

function formatUser(profile: ProfileLite | null | undefined) {
    if (!profile) return "Utente";
    const display = profile.display_name?.trim();
    if (display) return display;
    const fallback = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    return fallback || profile.email || "Utente";
}

export default function ChecklistDetailPage() {
    const router = useRouter();
    const id = typeof router.query.id === "string" ? router.query.id : "";
    const { organization, membership, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { plantLabel, canExecuteChecklist, isManufacturer } = useOrgType();

    const [loading, setLoading] = useState(true);
    const [checklist, setChecklist] = useState < ChecklistRow | null > (null);
    const [items, setItems] = useState < ChecklistItemRow[] > ([]);
    const [executions, setExecutions] = useState < ExecutionRow[] > ([]);
    const [machine, setMachine] = useState < MachineLite | null > (null);
    const [plant, setPlant] = useState < PlantLite | null > (null);
    const [workOrders, setWorkOrders] = useState < Record < string, WorkOrderLite>> ({});
    const [profiles, setProfiles] = useState < Record < string, ProfileLite>> ({});

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
                const { data: checklistRow, error: checklistError } = await supabase
                    .from("checklists")
                    .select("id, organization_id, machine_id, title, description, checklist_type, is_template, is_active, created_at, updated_at, created_by")
                    .eq("organization_id", organization.id)
                    .eq("id", id)
                    .single();
                if (checklistError) throw checklistError;
                const resolvedChecklist = checklistRow as ChecklistRow;

                const [{ data: itemRows, error: itemError }, { data: executionRows, error: executionError }] = await Promise.all([
                    supabase.from("checklist_items").select("id, checklist_id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value, created_at").eq("checklist_id", id).order("item_order", { ascending: true }),
                    supabase.from("checklist_executions").select("id, checklist_id, machine_id, work_order_id, executed_by, executed_at, completed_at, overall_status, notes, results").eq("checklist_id", id).order("executed_at", { ascending: false }),
                ]);
                if (itemError) throw itemError;
                if (executionError) throw executionError;

                let resolvedMachine: MachineLite | null = null;
                let resolvedPlant: PlantLite | null = null;
                if (resolvedChecklist.machine_id) {
                    const { data: machineRow, error: machineError } = await supabase.from("machines").select("id, name, internal_code, plant_id, area").eq("id", resolvedChecklist.machine_id).maybeSingle();
                    if (machineError) throw machineError;
                    resolvedMachine = (machineRow as MachineLite | null) ?? null;
                    if (resolvedMachine?.plant_id) {
                        const { data: plantRow, error: plantError } = await supabase.from("plants").select("id, name, type").eq("id", resolvedMachine.plant_id).maybeSingle();
                        if (plantError) throw plantError;
                        resolvedPlant = (plantRow as PlantLite | null) ?? null;
                    }
                }

                const executionList = (executionRows ?? []) as ExecutionRow[];
                const workOrderIds = Array.from(new Set(executionList.map((row) => row.work_order_id).filter(Boolean))) as string[];
                const profileIds = Array.from(new Set(executionList.map((row) => row.executed_by).filter(Boolean))) as string[];
                let workOrderMap: Record<string, WorkOrderLite> = {};
                let profileMap: Record<string, ProfileLite> = {};
                if (workOrderIds.length > 0) {
                    const { data: orderRows, error: orderError } = await supabase.from("work_orders").select("id, title, status").in("id", workOrderIds);
                    if (orderError) throw orderError;
                    workOrderMap = Object.fromEntries(((orderRows ?? []) as WorkOrderLite[]).map((row) => [row.id, row]));
                }
                if (profileIds.length > 0) {
                    const { data: profileRows, error: profileError } = await supabase.from("profiles").select("id, display_name, first_name, last_name, email").in("id", profileIds);
                    if (profileError) throw profileError;
                    profileMap = Object.fromEntries(((profileRows ?? []) as ProfileLite[]).map((row) => [row.id, row]));
                }

                if (!active) return;
                setChecklist(resolvedChecklist);
                setItems((itemRows ?? []) as ChecklistItemRow[]);
                setExecutions(executionList);
                setMachine(resolvedMachine);
                setPlant(resolvedPlant);
                setWorkOrders(workOrderMap);
                setProfiles(profileMap);
            } catch (error: any) {
                console.error("Checklist detail load error:", error);
                if (active) {
                    toast({ title: "Errore caricamento", description: error?.message ?? "Impossibile caricare il dettaglio checklist.", variant: "destructive" });
                    router.push("/checklists");
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, id, organization?.id, router, toast]);

    const stats = useMemo(() => ({
        totalItems: items.length,
        requiredItems: items.filter((item) => item.is_required !== false).length,
        totalExecutions: executions.length,
        failedExecutions: executions.filter((row) => String(row.overall_status ?? "").toLowerCase() === "failed").length,
    }), [executions, items]);

    return (
        <OrgContextGuard>
            <MainLayout userRole={membership?.role ?? "technician"}>
                <SEO title={`${checklist?.title ?? "Checklist"} - MACHINA`} />
                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-7xl space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Button variant="ghost" onClick={() => router.push("/checklists")} className="mb-2 -ml-3 px-3">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Torna alle checklist
                                </Button>
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{checklist?.title ?? "Checklist"}</h1>
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{checklist?.description || "Dettaglio del template checklist e storico delle esecuzioni."}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {canExecuteChecklist ? (
                                    <Link href={`/checklists/execute/${id}${machine?.id ? `?machine_id=${machine.id}` : ""}`}>
                                        <Button>
                                            <Play className="mr-2 h-4 w-4" />
                                            Esegui checklist
                                        </Button>
                                    </Link>
                                ) : null}
                                <Link href="/checklists/new"><Button variant="outline">Nuova checklist</Button></Link>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard title="Punti totali" value={stats.totalItems} icon={ClipboardCheck} />
                            <MetricCard title="Obbligatori" value={stats.requiredItems} icon={Wrench} />
                            <MetricCard title="Esecuzioni" value={stats.totalExecutions} icon={Play} />
                            <MetricCard title="Esecuzioni KO" value={stats.failedExecutions} icon={Wrench} tone="danger" />
                        </div>

                        {loading ? (
                            <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Caricamento checklist...</CardContent></Card>
                        ) : checklist ? (
                            <div className="space-y-6">
                                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                                    <Card className="rounded-2xl">
                                        <CardHeader>
                                            <CardTitle>Dati checklist</CardTitle>
                                            <CardDescription>Contesto operativo e impostazioni del template.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid gap-3 md:grid-cols-2">
                                            <InfoBlock label="Tipo" value={typeLabel(checklist.checklist_type)} />
                                            <InfoBlock label="Stato" value={checklist.is_active !== false ? "Attiva" : "Disattivata"} />
                                            <InfoBlock label={plantLabel} value={plant?.name ?? "—"} />
                                            <InfoBlock label="Macchina" value={machine ? `${machine.name ?? "Macchina"}${machine.internal_code ? ` · ${machine.internal_code}` : ""}` : "Template generico"} />
                                            <InfoBlock label="Template" value={checklist.is_template ? "Sì" : "No"} />
                                            <InfoBlock label="Ultimo aggiornamento" value={formatDate(checklist.updated_at)} />
                                        </CardContent>
                                    </Card>

                                    <Card className="rounded-2xl">
                                        <CardHeader>
                                            <CardTitle>Regole operative</CardTitle>
                                            <CardDescription>Indicatori di compilazione che il tecnico vede sul campo.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                                            <p>• I punti con min/max valorizzati evidenziano le misure fuori range.</p>
                                            <p>• I punti obbligatori bloccano il completamento finché non vengono compilati.</p>
                                            <p>• {isManufacturer ? "Il costruttore visualizza solo le esecuzioni in lettura." : "I technician possono aprire la compilazione direttamente dal work order o dalla checklist."}</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="rounded-2xl">
                                    <CardHeader>
                                        <CardTitle>Punti di controllo</CardTitle>
                                        <CardDescription>Sequenza ordinata delle verifiche da eseguire.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {items.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nessun punto di controllo configurato.</div>
                                        ) : items.map((item, index) => (
                                            <div key={item.id} className="rounded-2xl border border-border p-4">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="outline">#{index + 1}</Badge>
                                                    <div className="text-sm font-medium text-foreground">{item.title}</div>
                                                    {item.is_required !== false ? <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">Obbligatorio</Badge> : null}
                                                </div>
                                                {item.description ? <div className="mt-2 text-sm text-muted-foreground">{item.description}</div> : null}
                                                <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                                                    <InfoBlock label="Valore atteso" value={item.expected_value || "—"} compact />
                                                    <InfoBlock label="Unità" value={item.measurement_unit || "—"} compact />
                                                    <InfoBlock label="Min" value={item.min_value != null ? String(item.min_value) : "—"} compact />
                                                    <InfoBlock label="Max" value={item.max_value != null ? String(item.max_value) : "—"} compact />
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card className="rounded-2xl">
                                    <CardHeader>
                                        <CardTitle>Storico esecuzioni</CardTitle>
                                        <CardDescription>{isManufacturer ? "Risultati checklist in sola lettura, raggruppati per cliente/macchina." : "Ultime esecuzioni registrate su questa checklist."}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {executions.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nessuna esecuzione registrata.</div>
                                        ) : executions.map((execution) => (
                                            <div key={execution.id} className="rounded-2xl border border-border p-4">
                                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="outline" className={statusBadgeClass(execution.overall_status)}>{statusLabel(execution.overall_status)}</Badge>
                                                            <div className="text-sm font-medium text-foreground">{formatUser(profiles[execution.executed_by])}</div>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">Eseguita il {formatDate(execution.executed_at)} · completata il {formatDate(execution.completed_at)}</div>
                                                        {execution.work_order_id ? (
                                                            <div className="text-xs text-muted-foreground">Ordine di lavoro: {workOrders[execution.work_order_id]?.title ?? execution.work_order_id}</div>
                                                        ) : null}
                                                        {execution.notes ? <div className="text-sm text-muted-foreground">{execution.notes}</div> : null}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{Array.isArray(execution.results) ? `${execution.results.length} risultati registrati` : "Risultati disponibili"}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        ) : null}
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function MetricCard({ title, value, icon: Icon, tone = "default" }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; tone?: "default" | "danger"; }) {
    const toneClass = tone === "danger" ? "text-rose-700 dark:text-rose-300" : "text-foreground";
    return (
        <Card className="rounded-2xl">
            <CardContent className="flex items-center justify-between p-5">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
                </div>
                <div className={`rounded-2xl border border-border bg-muted/40 p-3 ${toneClass}`}><Icon className="h-5 w-5" /></div>
            </CardContent>
        </Card>
    );
}

function InfoBlock({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
    return (
        <div className={`rounded-2xl border border-border bg-muted/20 ${compact ? "p-3" : "p-4"}`}>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{value || "—"}</div>
        </div>
    );
}

