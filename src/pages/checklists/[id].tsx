import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ClipboardList, PlayCircle } from "lucide-react";
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
    machines?: { id: string; name: string | null; internal_code: string | null; plants?: { name: string | null } | null } | null;
};

type ItemRow = {
    id: string;
    title: string;
    description: string | null;
    item_order: number | null;
    is_required: boolean | null;
    expected_value: string | null;
    measurement_unit: string | null;
    min_value: number | null;
    max_value: number | null;
};

type ExecutionRow = {
    id: string;
    work_order_id: string | null;
    executed_at: string | null;
    completed_at: string | null;
    overall_status: string | null;
    notes: string | null;
};

function formatDateTime(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
    } catch {
        return value;
    }
}

export default function ChecklistDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { membership } = useAuth();
    const { canExecuteChecklist, isManufacturer, plantLabel, checklistsLabel } = useOrgType();
    const userRole = membership?.role ?? "viewer";

    const [loading, setLoading] = useState(true);
    const [checklist, setChecklist] = useState < ChecklistRow | null > (null);
    const [items, setItems] = useState < ItemRow[] > ([]);
    const [executions, setExecutions] = useState < ExecutionRow[] > ([]);

    useEffect(() => {
        if (!id || typeof id !== "string") return;
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const [{ data: checklistData, error: checklistError }, { data: itemData, error: itemError }, { data: executionData, error: executionError }] = await Promise.all([
                    supabase
                        .from("checklists")
                        .select("id, organization_id, machine_id, title, description, checklist_type, is_template, is_active, created_at, machines(id, name, internal_code, plants(name))")
                        .eq("id", id)
                        .maybeSingle(),
                    supabase
                        .from("checklist_items")
                        .select("id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value")
                        .eq("checklist_id", id)
                        .order("item_order", { ascending: true }),
                    supabase
                        .from("checklist_executions")
                        .select("id, work_order_id, executed_at, completed_at, overall_status, notes")
                        .eq("checklist_id", id)
                        .order("executed_at", { ascending: false })
                        .limit(20),
                ]);
                if (checklistError) throw checklistError;
                if (itemError) throw itemError;
                if (executionError) throw executionError;
                if (!active) return;
                setChecklist((checklistData as any) ?? null);
                setItems((itemData as any) ?? []);
                setExecutions((executionData as any) ?? []);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Errore caricamento checklist", description: error?.message ?? "Impossibile aprire la checklist." });
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [id, toast]);

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${checklist?.title ?? checklistsLabel} - MACHINA`} />
                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="mb-2 flex flex-wrap gap-2">
                                <Badge variant="outline">{checklist?.checklist_type || "inspection"}</Badge>
                                <Badge variant="secondary">{checklist?.is_template ? "Template" : "Checklist"}</Badge>
                                <Badge variant={checklist?.is_active ? "secondary" : "outline"}>{checklist?.is_active ? "Attiva" : "Inattiva"}</Badge>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">{checklist?.title ?? "Checklist"}</h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {plantLabel}: {checklist?.machines?.plants?.name ?? "—"} · Macchina: {checklist?.machines?.name ?? checklist?.machines?.internal_code ?? "Template generico"}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="outline"><Link href="/checklists">Torna alla lista</Link></Button>
                            {!isManufacturer && canExecuteChecklist && checklist && (
                                <Button asChild>
                                    <Link href={`/checklists/execute/${checklist.id}`}>
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Esegui checklist
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-sm text-muted-foreground">Caricamento checklist...</div>
                    ) : !checklist ? (
                        <Card><CardContent className="p-6 text-sm text-muted-foreground">Checklist non trovata.</CardContent></Card>
                    ) : (
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                            <Card>
                                <CardHeader><CardTitle>Punti di controllo</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    {items.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">Nessun item presente.</div>
                                    ) : (
                                        items.map((item, index) => (
                                            <div key={item.id} className="rounded-2xl border border-border p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-semibold text-foreground">{index + 1}. {item.title}</div>
                                                        {item.description && <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>}
                                                    </div>
                                                    <Badge variant={item.is_required ? "default" : "outline"}>{item.is_required ? "Obbligatorio" : "Opzionale"}</Badge>
                                                </div>
                                                {(item.expected_value || item.measurement_unit || item.min_value != null || item.max_value != null) && (
                                                    <div className="mt-3 rounded-xl bg-muted/30 p-3 text-sm text-muted-foreground">
                                                        {item.expected_value && <div>Atteso: {item.expected_value}</div>}
                                                        {item.measurement_unit && <div>Unità: {item.measurement_unit}</div>}
                                                        {(item.min_value != null || item.max_value != null) && <div>Range: {item.min_value ?? "—"} / {item.max_value ?? "—"}</div>}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle>Dettagli</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Descrizione</div>
                                            <div className="mt-1 whitespace-pre-wrap text-foreground">{checklist.description || "—"}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Ultima esecuzione</div>
                                            <div className="mt-1 text-foreground">{executions[0] ? formatDateTime(executions[0].completed_at || executions[0].executed_at) : "—"}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Esecuzioni registrate</div>
                                            <div className="mt-1 text-foreground">{executions.length}</div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle>Storico esecuzioni</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        {executions.length === 0 ? (
                                            <div className="text-sm text-muted-foreground">Nessuna esecuzione registrata.</div>
                                        ) : executions.map((execution) => (
                                            <div key={execution.id} className="rounded-2xl border border-border p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-foreground">{execution.work_order_id ? `Ordine ${execution.work_order_id.slice(0, 8)}` : "Esecuzione standalone"}</div>
                                                        <div className="mt-1 text-sm text-muted-foreground">{formatDateTime(execution.completed_at || execution.executed_at)}</div>
                                                    </div>
                                                    <Badge variant="outline">{execution.overall_status || "pending"}</Badge>
                                                </div>
                                                {execution.notes && <div className="mt-3 text-sm text-muted-foreground">{execution.notes}</div>}
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

