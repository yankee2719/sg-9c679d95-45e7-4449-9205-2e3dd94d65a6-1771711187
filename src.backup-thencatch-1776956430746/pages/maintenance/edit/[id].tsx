import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { CalendarClock, ClipboardList, Factory, Pencil, PlusCircle, ShieldAlert, TimerReset } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { supabase } from "@/integrations/supabase/client";

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleDateString("it-IT");
    } catch {
        return value;
    }
}

function formatFrequency(type: string | null | undefined, value: number | null | undefined) {
    if (!type || !value) return "—";
    const map: Record<string, string> = {
        hours: value === 1 ? "ora" : "ore",
        days: value === 1 ? "giorno" : "giorni",
        weeks: value === 1 ? "settimana" : "settimane",
        months: value === 1 ? "mese" : "mesi",
        cycles: value === 1 ? "ciclo" : "cicli",
    };
    return `Ogni ${value} ${map[type] ?? type}`;
}

function priorityTone(priority: string | null | undefined) {
    const key = String(priority ?? "medium").toLowerCase();
    if (key === "critical") return "destructive" as const;
    if (key === "high") return "default" as const;
    if (key === "low") return "secondary" as const;
    return "outline" as const;
}

type PlanRow = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    frequency_type: string;
    frequency_value: number;
    estimated_duration_minutes: number | null;
    required_skills: string[] | null;
    spare_parts: any;
    instructions: string | null;
    safety_notes: string | null;
    default_assignee_id: string | null;
    priority: string | null;
    is_active: boolean;
    next_due_date: string | null;
    last_executed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    machines?: {
        id: string;
        name: string | null;
        internal_code: string | null;
        area: string | null;
        plant_id: string | null;
        plants?: {
            id: string;
            name: string | null;
            plant_type: string | null;
        } | null;
    } | null;
};

type WorkOrderRow = {
    id: string;
    title: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
    scheduled_date: string | null;
    assigned_to: string | null;
    created_at: string | null;
};

export default function MaintenancePlanDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { membership, loading: authLoading } = useAuth();
    const { plantLabel, machineContextLabel, canManageMaintenance } = useOrgType();
    const userRole = membership?.role ?? "technician";

    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState<PlanRow | null>(null);
    const [orders, setOrders] = useState<WorkOrderRow[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (authLoading || !id || typeof id !== "string") return;
        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const { data: planData, error: planError } = await supabase
                    .from("maintenance_plans")
                    .select(`
            id, organization_id, machine_id, title, description, frequency_type, frequency_value,
            estimated_duration_minutes, required_skills, spare_parts, instructions, safety_notes,
            default_assignee_id, priority, is_active, next_due_date, last_executed_at, created_at, updated_at,
            machines (
              id, name, internal_code, area, plant_id,
              plants ( id, name, plant_type )
            )
          `)
                    .eq("id", id)
                    .maybeSingle();

                if (planError) throw planError;

                const { data: ordersData, error: ordersError } = await supabase
                    .from("work_orders")
                    .select("id, title, status, priority, due_date, scheduled_date, assigned_to, created_at")
                    .eq("maintenance_plan_id", id)
                    .order("created_at", { ascending: false });

                if (ordersError) throw ordersError;

                if (!active) return;
                setPlan((planData as any) ?? null);
                setOrders((ordersData as any) ?? []);
            } catch (error: any) {
                console.error("maintenance detail load error", error);
                if (active) {
                    toast({
                        variant: "destructive",
                        title: "Errore caricamento piano",
                        description: error?.message ?? "Impossibile leggere il piano di manutenzione.",
                    });
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, id, toast]);

    const machineLabel = useMemo(() => {
        const plantName = plan?.machines?.plants?.name || "—";
        const machineName = plan?.machines?.name || "Macchina generica";
        return `${plantName} → ${machineName}`;
    }, [plan]);

    const handleGenerateWorkOrder = async () => {
        if (!plan) return;
        if (!plan.machine_id) {
            toast({ variant: "destructive", title: "Piano senza macchina", description: "Assegna una macchina al piano prima di generare un ordine." });
            return;
        }
        router.push(`/work-orders/new?plan_id=${plan.id}`);
    };

    const handleToggleActive = async () => {
        if (!plan) return;
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from("maintenance_plans")
                .update({ is_active: !plan.is_active, updated_at: new Date().toISOString() })
                .eq("id", plan.id);
            if (error) throw error;
            setPlan((prev) => (prev ? { ...prev, is_active: !prev.is_active } : prev));
            toast({ title: plan.is_active ? "Piano disattivato" : "Piano riattivato" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Errore aggiornamento", description: error?.message ?? "Operazione non completata." });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${plan?.title ?? "Piano manutenzione"} - MACHINA`} />
                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Badge variant={priorityTone(plan?.priority)}>{plan?.priority ?? "medium"}</Badge>
                                <Badge variant={plan?.is_active ? "secondary" : "outline"}>{plan?.is_active ? "Attivo" : "Inattivo"}</Badge>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">{plan?.title ?? "Piano di manutenzione"}</h1>
                            <p className="mt-2 text-sm text-muted-foreground">{machineContextLabel}: {machineLabel}</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="outline">
                                <Link href="/maintenance">Torna alla lista</Link>
                            </Button>
                            {canManageMaintenance && (
                                <>
                                    <Button asChild variant="outline">
                                        <Link href={`/maintenance/edit/${id}`}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Modifica
                                        </Link>
                                    </Button>
                                    <Button type="button" onClick={handleGenerateWorkOrder}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Genera ordine di lavoro
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-sm text-muted-foreground">Caricamento piano...</div>
                    ) : !plan ? (
                        <Card>
                            <CardContent className="p-6 text-sm text-muted-foreground">Piano non trovato.</CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <Card>
                                    <CardContent className="flex items-start gap-3 p-5">
                                        <TimerReset className="mt-0.5 h-5 w-5 text-orange-500" />
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Frequenza</div>
                                            <div className="mt-1 font-semibold">{formatFrequency(plan.frequency_type, plan.frequency_value)}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="flex items-start gap-3 p-5">
                                        <CalendarClock className="mt-0.5 h-5 w-5 text-orange-500" />
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Prossima scadenza</div>
                                            <div className="mt-1 font-semibold">{formatDate(plan.next_due_date)}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="flex items-start gap-3 p-5">
                                        <Factory className="mt-0.5 h-5 w-5 text-orange-500" />
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">{plantLabel}</div>
                                            <div className="mt-1 font-semibold">{plan.machines?.plants?.name ?? "—"}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="flex items-start gap-3 p-5">
                                        <ClipboardList className="mt-0.5 h-5 w-5 text-orange-500" />
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Ordini generati</div>
                                            <div className="mt-1 font-semibold">{orders.length}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Dettaglio piano</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-5 text-sm">
                                        <div>
                                            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Descrizione</div>
                                            <p className="whitespace-pre-wrap text-foreground">{plan.description || "—"}</p>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Durata stimata</div>
                                                <div>{plan.estimated_duration_minutes ? `${plan.estimated_duration_minutes} min` : "—"}</div>
                                            </div>
                                            <div>
                                                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Ultima esecuzione</div>
                                                <div>{formatDate(plan.last_executed_at)}</div>
                                            </div>
                                            <div>
                                                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Competenze richieste</div>
                                                <div>{plan.required_skills?.length ? plan.required_skills.join(", ") : "—"}</div>
                                            </div>
                                            <div>
                                                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Macchina</div>
                                                <div>{plan.machines?.name ?? "Template generico"}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Istruzioni operative</div>
                                            <p className="whitespace-pre-wrap text-foreground">{plan.instructions || "—"}</p>
                                        </div>
                                        <div>
                                            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                Note di sicurezza
                                            </div>
                                            <p className="whitespace-pre-wrap text-foreground">{plan.safety_notes || "—"}</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Storico ordini di lavoro</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {orders.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                                Nessun ordine di lavoro ancora generato da questo piano.
                                            </div>
                                        ) : (
                                            orders.map((order) => (
                                                <Link key={order.id} href={`/work-orders/${order.id}`} className="block rounded-2xl border border-border p-4 transition hover:bg-muted/40">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="truncate font-semibold text-foreground">{order.title || "Ordine senza titolo"}</div>
                                                            <div className="mt-1 text-sm text-muted-foreground">Scadenza: {formatDate(order.due_date || order.scheduled_date)}</div>
                                                        </div>
                                                        <div className="flex shrink-0 gap-2">
                                                            <Badge variant="outline">{order.status || "draft"}</Badge>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))
                                        )}

                                        {canManageMaintenance && (
                                            <div className="pt-2">
                                                <Button type="button" className="w-full" onClick={handleGenerateWorkOrder}>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Genera ordine di lavoro ora
                                                </Button>
                                            </div>
                                        )}

                                        {canManageMaintenance && (
                                            <Button type="button" variant="outline" className="w-full" disabled={submitting} onClick={handleToggleActive}>
                                                {plan.is_active ? "Disattiva piano" : "Riattiva piano"}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}


