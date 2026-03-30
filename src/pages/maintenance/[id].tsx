import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ClipboardCheck, ClipboardList, Wrench } from "lucide-react";
import { getWorkOrderCreateContext, type WorkOrderCreateContextAssignee, type WorkOrderCreateContextMachine } from "@/lib/workOrderCreateApi";

interface MaintenancePlanRow {
    id: string;
    organization_id: string;
    machine_id: string | null;
    title: string;
    description: string | null;
    instructions: string | null;
    safety_notes: string | null;
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

export default function MaintenancePlanDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { loading: authLoading, membership, organization } = useAuth();
    const { language } = useLanguage();
    const userRole = membership?.role ?? "viewer";
    const canEdit = ["owner", "admin", "supervisor", "technician"].includes(userRole);

    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState < MaintenancePlanRow | null > (null);
    const [machines, setMachines] = useState < WorkOrderCreateContextMachine[] > ([]);
    const [assignees, setAssignees] = useState < WorkOrderCreateContextAssignee[] > ([]);

    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (authLoading || !organization?.id || !resolvedId) return;
            setLoading(true);
            try {
                const [planRes, context] = await Promise.all([
                    supabase.from("maintenance_plans").select("id, organization_id, machine_id, title, description, instructions, safety_notes, frequency_value, estimated_duration_minutes, default_assignee_id, priority, is_active, next_due_date, updated_at").eq("id", resolvedId).eq("organization_id", organization.id).maybeSingle(),
                    getWorkOrderCreateContext(),
                ]);
                if (planRes.error) throw planRes.error;
                if (!active) return;
                setPlan((planRes.data as MaintenancePlanRow | null) ?? null);
                setMachines(context.machines ?? []);
                setAssignees(context.assignees ?? []);
            } catch (error: any) {
                console.error(error);
                toast({ title: "Errore", description: error?.message || "Errore caricamento piano", variant: "destructive" });
                void router.push("/maintenance");
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [authLoading, organization?.id, resolvedId, router, toast]);

    const machine = plan?.machine_id ? machines.find((row) => row.id === plan.machine_id) : null;
    const assignee = plan?.default_assignee_id ? assignees.find((row) => row.id === plan.default_assignee_id) : null;

    if (authLoading || loading) {
        return <MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">Caricamento piano...</div></MainLayout>;
    }

    if (!plan) {
        return <MainLayout userRole={userRole}><div className="p-8 text-sm text-muted-foreground">Piano non trovato.</div></MainLayout>;
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${plan.title} - MACHINA`} />
                <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <Button variant="ghost" onClick={() => router.push("/maintenance")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Piani di manutenzione
                        </Button>
                        <div className="flex flex-wrap gap-3">
                            {canEdit && <Link href={`/maintenance/edit/${plan.id}`}><Button variant="outline">Modifica piano</Button></Link>}
                            {canEdit && plan.machine_id && (
                                <Link href={`/work-orders/create?work_type=preventive&machine_id=${plan.machine_id}&maintenance_plan_id=${plan.id}&plan_title=${encodeURIComponent(plan.title)}&plan_priority=${plan.priority || "medium"}`}>
                                    <Button>
                                        <ClipboardList className="mr-2 h-4 w-4" />
                                        Genera work order
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader><CardTitle>{plan.title}</CardTitle></CardHeader>
                        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <div className="space-y-6">
                                <section className="space-y-2">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Descrizione</h2>
                                    <p className="text-sm text-foreground">{plan.description || "Nessuna descrizione"}</p>
                                </section>
                                <section className="space-y-2">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Istruzioni operative</h2>
                                    <p className="text-sm text-foreground whitespace-pre-wrap">{plan.instructions || "Nessuna istruzione"}</p>
                                </section>
                                <section className="space-y-2">
                                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Note di sicurezza</h2>
                                    <p className="text-sm text-foreground whitespace-pre-wrap">{plan.safety_notes || "Nessuna nota di sicurezza"}</p>
                                </section>
                            </div>

                            <div className="space-y-3">
                                <Info label="Macchina" value={machine?.name || plan.machine_id || "Non collegata"} />
                                <Info label="Frequenza" value={plan.frequency_value ? `Ogni ${plan.frequency_value} giorni` : "Non definita"} />
                                <Info label="Prossima scadenza" value={formatDate(plan.next_due_date, language)} />
                                <Info label="Durata stimata" value={plan.estimated_duration_minutes ? `${plan.estimated_duration_minutes} min` : "—"} />
                                <Info label="Assegnatario predefinito" value={assignee?.display_name || assignee?.email || "Non assegnato"} />
                                <Info label="Stato piano" value={plan.is_active === false ? "Disattivo" : "Attivo"} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-wrap gap-3">
                        {plan.machine_id && (
                            <Link href={`/equipment/${plan.machine_id}`}><Button variant="outline"><Wrench className="mr-2 h-4 w-4" />Macchina collegata</Button></Link>
                        )}
                        <Link href="/checklists/templates"><Button variant="outline"><ClipboardCheck className="mr-2 h-4 w-4" />Checklist</Button></Link>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return <div className="rounded-2xl border border-border bg-background px-4 py-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold text-foreground">{value}</div></div>;
}
