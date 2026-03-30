import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getWorkOrderCreateContext, type WorkOrderCreateContextAssignee, type WorkOrderCreateContextMachine } from "@/lib/workOrderCreateApi";
import { CalendarDays, ClipboardList, Plus, Search, Settings2, Wrench } from "lucide-react";

interface MaintenancePlanRow {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    frequency_type: string | null;
    frequency_value: number | null;
    estimated_duration_minutes: number | null;
    default_assignee_id: string | null;
    priority: string | null;
    is_active: boolean | null;
    next_due_date: string | null;
    updated_at: string | null;
}

function formatDate(value: string | null | undefined, language: string) {
    if (!value) return "—";
    try {
        const locale = language === "it" ? "it-IT" : language === "es" ? "es-ES" : language === "fr" ? "fr-FR" : "en-GB";
        return new Date(value).toLocaleDateString(locale);
    } catch {
        return value;
    }
}

function priorityLabel(value: string | null | undefined) {
    const normalized = String(value ?? "").toLowerCase();
    if (normalized === "critical") return "Critica";
    if (normalized === "high") return "Alta";
    if (normalized === "medium") return "Media";
    return "Bassa";
}

function frequencyLabel(plan: MaintenancePlanRow) {
    const value = plan.frequency_value ?? 0;
    return value > 0 ? `Ogni ${value} giorni` : "Frequenza non definita";
}

export default function MaintenancePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t, language } = useLanguage();
    const { loading: authLoading, membership, organization } = useAuth();

    const tr = (key: string, fallback: string) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };

    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor", "technician"].includes(userRole);

    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState < MaintenancePlanRow[] > ([]);
    const [machines, setMachines] = useState < WorkOrderCreateContextMachine[] > ([]);
    const [assignees, setAssignees] = useState < WorkOrderCreateContextAssignee[] > ([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading || !organization?.id) return;
            setLoading(true);
            try {
                const [plansRes, context] = await Promise.all([
                    supabase
                        .from("maintenance_plans")
                        .select("id, organization_id, machine_id, title, description, frequency_type, frequency_value, estimated_duration_minutes, default_assignee_id, priority, is_active, next_due_date, updated_at")
                        .eq("organization_id", organization.id)
                        .order("next_due_date", { ascending: true, nullsFirst: false }),
                    getWorkOrderCreateContext(),
                ]);

                if (plansRes.error) throw plansRes.error;
                if (!active) return;
                setPlans((plansRes.data ?? []) as MaintenancePlanRow[]);
                setMachines(context.machines ?? []);
                setAssignees(context.assignees ?? []);
            } catch (error: any) {
                console.error(error);
                toast({ title: tr("common.error", "Errore"), description: error?.message || "Errore caricamento piani di manutenzione", variant: "destructive" });
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [authLoading, organization?.id, toast]);

    const machineMap = useMemo(() => new Map(machines.map((row) => [row.id, row])), [machines]);
    const assigneeMap = useMemo(() => new Map(assignees.map((row) => [row.id, row])), [assignees]);

    const filteredPlans = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return plans;
        return plans.filter((plan) => {
            const machineName = plan.machine_id ? machineMap.get(plan.machine_id)?.name ?? "" : "";
            const assigneeName = plan.default_assignee_id ? assigneeMap.get(plan.default_assignee_id)?.display_name ?? "" : "";
            return [plan.title, plan.description, machineName, assigneeName, plan.priority]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q));
        });
    }, [plans, search, machineMap, assigneeMap]);

    const stats = useMemo(() => ({
        total: plans.length,
        active: plans.filter((plan) => plan.is_active !== false).length,
        overdue: plans.filter((plan) => plan.is_active !== false && plan.next_due_date && new Date(plan.next_due_date).getTime() < Date.now()).length,
        inactive: plans.filter((plan) => plan.is_active === false).length,
    }), [plans]);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${tr("maintenance.title", "Piani di manutenzione")} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">{tr("maintenance.title", "Piani di manutenzione")}</h1>
                            <p className="text-base text-muted-foreground">
                                Questa sezione definisce le regole preventive. Da qui nasce il work order operativo.
                            </p>
                        </div>

                        {canEdit && (
                            <Link href="/maintenance/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nuovo piano
                                </Button>
                            </Link>
                        )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard title="Totale piani" value={stats.total} icon={<ClipboardList className="h-5 w-5" />} />
                        <StatCard title="Piani attivi" value={stats.active} icon={<Settings2 className="h-5 w-5" />} />
                        <StatCard title="Scaduti" value={stats.overdue} icon={<CalendarDays className="h-5 w-5" />} />
                        <StatCard title="Disattivi" value={stats.inactive} icon={<Wrench className="h-5 w-5" />} />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder="Cerca piano, macchina o assegnatario..." />
                            </div>
                        </CardContent>
                    </Card>

                    {loading ? (
                        <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">Caricamento piani di manutenzione...</CardContent></Card>
                    ) : filteredPlans.length === 0 ? (
                        <Card className="rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">Nessun piano di manutenzione trovato.</CardContent></Card>
                    ) : (
                        <div className="grid gap-4">
                            {filteredPlans.map((plan) => {
                                const machine = plan.machine_id ? machineMap.get(plan.machine_id) : null;
                                const assignee = plan.default_assignee_id ? assigneeMap.get(plan.default_assignee_id) : null;
                                return (
                                    <Card key={plan.id} className="rounded-2xl">
                                        <CardContent className="space-y-4 p-6">
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div className="min-w-0 space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                                                            {plan.is_active === false ? "Disattivo" : "Attivo"}
                                                        </span>
                                                        <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600 dark:text-orange-300">
                                                            {priorityLabel(plan.priority)}
                                                        </span>
                                                    </div>
                                                    <h2 className="text-xl font-semibold text-foreground">{plan.title}</h2>
                                                    <p className="text-sm text-muted-foreground">{plan.description || "Nessuna descrizione"}</p>
                                                </div>

                                                <div className="grid gap-2 text-sm text-muted-foreground sm:text-right">
                                                    <div>Macchina: <span className="font-medium text-foreground">{machine?.name || "Non collegata"}</span></div>
                                                    <div>Frequenza: <span className="font-medium text-foreground">{frequencyLabel(plan)}</span></div>
                                                    <div>Prossima scadenza: <span className="font-medium text-foreground">{formatDate(plan.next_due_date, language)}</span></div>
                                                    <div>Assegnatario predefinito: <span className="font-medium text-foreground">{assignee?.display_name || assignee?.email || "Non assegnato"}</span></div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                <Link href={`/maintenance/${plan.id}`}><Button variant="outline">Apri piano</Button></Link>
                                                {canEdit && <Link href={`/maintenance/edit/${plan.id}`}><Button variant="outline">Modifica</Button></Link>}
                                                {canEdit && plan.machine_id && (
                                                    <Button
                                                        onClick={() => router.push(`/work-orders/create?work_type=preventive&machine_id=${plan.machine_id}&maintenance_plan_id=${plan.id}&plan_title=${encodeURIComponent(plan.title)}&plan_priority=${plan.priority || "medium"}`)}
                                                    >
                                                        Genera work order
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
    return (
        <Card className="rounded-2xl"><CardContent className="p-6"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">{icon}</div><div className="text-4xl font-bold text-foreground">{value}</div><div className="mt-2 text-sm text-muted-foreground">{title}</div></CardContent></Card>
    );
}
