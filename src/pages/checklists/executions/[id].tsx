import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getUserContext } from "@/lib/supabaseHelpers";
import { ArrowLeft, ClipboardCheck, Wrench, FileText, ShieldCheck } from "lucide-react";

type OrgType = "manufacturer" | "customer";

type ExecutionAnswer = {
    id: string;
    item_id: string | null;
    response_value: string | null;
    response_note: string | null;
    is_ok: boolean | null;
    created_at: string | null;
    checklist_template_item?: {
        id: string;
        title: string | null;
        description: string | null;
        sort_order: number | null;
        item_type: string | null;
        is_required: boolean | null;
    } | null;
};

type ExecutionData = {
    id: string;
    template_id: string | null;
    work_order_id: string | null;
    machine_id: string | null;
    organization_id: string | null;
    status: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    checklist_template?: {
        id: string;
        title: string | null;
        category: string | null;
        description: string | null;
    } | null;
    machines?: {
        id: string;
        name: string | null;
        internal_code: string | null;
        organization_id: string | null;
    } | null;
    work_orders?: {
        id: string;
        title: string | null;
        status: string | null;
    } | null;
};

type UserCtx = {
    userId: string;
    orgId: string | null;
    orgType: OrgType | null;
    role: string;
    displayName: string;
    email: string;
};

function formatDate(value?: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("it-IT");
}

function normalizeStatus(raw?: string | null) {
    const v = String(raw ?? "").toLowerCase();
    if (["completed", "done", "closed"].includes(v)) return "completed";
    if (["in_progress", "started", "open"].includes(v)) return "in_progress";
    if (["draft", "pending"].includes(v)) return "draft";
    return v || "unknown";
}

export default function ChecklistExecutionDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();

    const [ctx, setCtx] = useState < UserCtx | null > (null);
    const [loading, setLoading] = useState(true);
    const [execution, setExecution] = useState < ExecutionData | null > (null);
    const [answers, setAnswers] = useState < ExecutionAnswer[] > ([]);

    useEffect(() => {
        if (!router.isReady || !id) return;

        const load = async () => {
            setLoading(true);
            try {
                const userCtx = (await getUserContext()) as UserCtx | null;
                if (!userCtx) {
                    router.push("/login");
                    return;
                }
                if (!userCtx.orgId || !userCtx.orgType) {
                    throw new Error("Contesto organizzativo non valido.");
                }
                setCtx(userCtx);

                const { data: executionRow, error: executionError } = await supabase
                    .from("checklist_executions")
                    .select(`
            id,
            template_id,
            work_order_id,
            machine_id,
            organization_id,
            status,
            started_at,
            completed_at,
            created_at,
            updated_at,
            checklist_template:template_id ( id, title, category, description ),
            machines:machine_id ( id, name, internal_code, organization_id ),
            work_orders:work_order_id ( id, title, status )
          `)
                    .eq("id", id)
                    .single();

                if (executionError) throw executionError;
                if (!executionRow) throw new Error("Esecuzione checklist non trovata.");

                if (userCtx.orgType === "customer") {
                    if ((executionRow as any).organization_id !== userCtx.orgId) {
                        throw new Error("Non puoi accedere a questa esecuzione.");
                    }
                } else {
                    const machineId = (executionRow as any).machine_id;
                    if (!machineId) throw new Error("Macchina non valida.");

                    const { data: assignment, error: assignmentError } = await supabase
                        .from("machine_assignments")
                        .select("id")
                        .eq("manufacturer_org_id", userCtx.orgId)
                        .eq("machine_id", machineId)
                        .eq("is_active", true)
                        .maybeSingle();

                    if (assignmentError) throw assignmentError;
                    if (!assignment) {
                        throw new Error("Questa esecuzione non appartiene a una macchina collegata alla tua organizzazione.");
                    }
                }

                const { data: answerRows, error: answersError } = await supabase
                    .from("checklist_execution_answers")
                    .select(`
            id,
            item_id,
            response_value,
            response_note,
            is_ok,
            created_at,
            checklist_template_item:item_id ( id, title, description, sort_order, item_type, is_required )
          `)
                    .eq("execution_id", id)
                    .order("created_at", { ascending: true });

                if (answersError) throw answersError;

                const sortedAnswers = ((answerRows ?? []) as ExecutionAnswer[]).sort((a, b) => {
                    const aa = a.checklist_template_item?.sort_order ?? 999999;
                    const bb = b.checklist_template_item?.sort_order ?? 999999;
                    return aa - bb;
                });

                setExecution(executionRow as ExecutionData);
                setAnswers(sortedAnswers);
            } catch (error: any) {
                console.error(error);
                toast({
                    title: "Errore",
                    description: error?.message ?? "Errore caricamento dettaglio esecuzione.",
                    variant: "destructive",
                });
                router.push("/checklists/executions");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id, router, router.isReady, toast]);

    const stats = useMemo(() => {
        const total = answers.length;
        const ok = answers.filter((a) => a.is_ok === true).length;
        const ko = answers.filter((a) => a.is_ok === false).length;
        const notes = answers.filter((a) => !!a.response_note).length;
        return { total, ok, ko, notes };
    }, [answers]);

    const normalizedStatus = normalizeStatus(execution?.status);

    return (
        <MainLayout userRole={(ctx?.role as any) || "technician"}>
            <SEO title="Dettaglio esecuzione checklist - MACHINA" />

            <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                    </Button>

                    <Button asChild variant="outline">
                        <Link href="/checklists/executions">Tutte le esecuzioni</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> {execution?.checklist_template?.title ?? "Dettaglio esecuzione"}</CardTitle>
                        <CardDescription>
                            {ctx?.orgType === "manufacturer"
                                ? "Vista costruttore: sola lettura sullo storico esecutivo del cliente."
                                : "Vista cliente: storico esecutivo nel tuo contesto operativo."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Stato</div><div className="mt-2"><Badge variant="outline">{normalizedStatus}</Badge></div></div>
                        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Macchina</div><div className="mt-2 text-sm font-medium">{execution?.machines?.name ?? "—"}</div></div>
                        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Work order</div><div className="mt-2 text-sm font-medium">{execution?.work_orders?.title ?? "—"}</div></div>
                        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Completata il</div><div className="mt-2 text-sm font-medium">{formatDate(execution?.completed_at)}</div></div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card><CardHeader className="pb-2"><CardDescription>Totale risposte</CardDescription><CardTitle>{stats.total}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>OK</CardDescription><CardTitle>{stats.ok}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>KO</CardDescription><CardTitle>{stats.ko}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Con note</CardDescription><CardTitle>{stats.notes}</CardTitle></CardHeader></Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Dettaglio risposte</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-sm text-muted-foreground">Caricamento...</div>
                        ) : answers.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Nessuna risposta registrata.</div>
                        ) : (
                            <div className="space-y-3">
                                {answers.map((answer, index) => (
                                    <div key={answer.id} className="rounded-2xl border p-4 space-y-3">
                                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                            <div className="min-w-0">
                                                <div className="text-xs text-muted-foreground">Voce #{index + 1}</div>
                                                <div className="font-medium">{answer.checklist_template_item?.title ?? "Item senza titolo"}</div>
                                                {answer.checklist_template_item?.description && (
                                                    <div className="text-sm text-muted-foreground mt-1">{answer.checklist_template_item.description}</div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {answer.is_ok === true && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>}
                                                {answer.is_ok === false && <Badge className="bg-rose-50 text-rose-700 border-rose-200">KO</Badge>}
                                                {answer.checklist_template_item?.is_required && <Badge variant="outline">Obbligatoria</Badge>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="rounded-xl bg-muted/40 p-3">
                                                <div className="text-xs text-muted-foreground mb-1">Valore risposta</div>
                                                <div>{answer.response_value || "—"}</div>
                                            </div>
                                            <div className="rounded-xl bg-muted/40 p-3">
                                                <div className="text-xs text-muted-foreground mb-1">Nota</div>
                                                <div>{answer.response_note || "—"}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Regole di accesso</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>Il cliente finale gestisce l&apos;esecuzione operativa nel proprio contesto.</p>
                        <p>Il costruttore può consultare lo storico solo per macchine collegate attivamente alla propria organizzazione.</p>
                        <p>Questa pagina è in sola lettura: l&apos;editing resta confinato ai flussi operativi del customer owner.</p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
