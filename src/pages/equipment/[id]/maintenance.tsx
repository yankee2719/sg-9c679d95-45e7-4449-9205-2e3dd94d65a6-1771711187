import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardCheck, Plus, Wrench, CalendarClock } from "lucide-react";

type MachineRow = {
    id: string;
    organization_id: string;
    name: string;
    internal_code: string | null;
    serial_number: string | null;
    plant_id: string | null;
    production_line_id: string | null;
};

type WorkOrderRow = {
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    created_at: string;
};

type ChecklistAssignmentRow = {
    id: string;
    template_id: string;
    is_active: boolean | null;
};

type ChecklistTemplateRow = {
    id: string;
    name: string;
    version: number | null;
};

function formatDateTime(value: string | null) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("it-IT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function EquipmentMaintenancePage() {
    const router = useRouter();
    const { toast } = useToast();

    const machineId = useMemo(() => {
        const raw = router.query.id;
        return typeof raw === "string" ? raw : null;
    }, [router.query.id]);

    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [machine, setMachine] = useState < MachineRow | null > (null);
    const [workOrders, setWorkOrders] = useState < WorkOrderRow[] > ([]);
    const [checklists, setChecklists] = useState < (ChecklistAssignmentRow & { template?: ChecklistTemplateRow | null })[] > ([]);

    const canCreate = role === "admin" || role === "supervisor";

    useEffect(() => {
        const load = async () => {
            if (!machineId) return;
            setLoading(true);
            try {
                const ctx = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }

                const activeOrgId = ctx.orgId ?? null;
                if (!activeOrgId) throw new Error("Organizzazione attiva non trovata nel contesto utente.");

                setRole(ctx.role ?? "technician");
                setOrgId(activeOrgId);

                const { data: machineRow, error: machineErr } = await supabase
                    .from("machines")
                    .select("id, organization_id, name, internal_code, serial_number, plant_id, production_line_id")
                    .eq("id", machineId)
                    .eq("organization_id", activeOrgId)
                    .single();

                if (machineErr) throw machineErr;
                setMachine(machineRow as MachineRow);

                const [{ data: workRows, error: workErr }, { data: assignmentRows, error: assignmentErr }] = await Promise.all([
                    supabase
                        .from("work_orders")
                        .select("id, title, status, priority, due_date, created_at")
                        .eq("organization_id", activeOrgId)
                        .eq("machine_id", machineId)
                        .order("created_at", { ascending: false }),
                    supabase
                        .from("checklist_assignments")
                        .select("id, template_id, is_active")
                        .eq("organization_id", activeOrgId)
                        .eq("machine_id", machineId)
                        .eq("is_active", true),
                ]);

                if (workErr) throw workErr;
                if (assignmentErr) throw assignmentErr;

                setWorkOrders((workRows ?? []) as WorkOrderRow[]);

                const templateIds = Array.from(new Set((assignmentRows ?? []).map((r: any) => r.template_id).filter(Boolean)));
                let templatesMap = new Map < string, ChecklistTemplateRow> ();

                if (templateIds.length > 0) {
                    const { data: templateRows, error: templateErr } = await supabase
                        .from("checklist_templates")
                        .select("id, name, version")
                        .in("id", templateIds);

                    if (templateErr) throw templateErr;
                    for (const row of templateRows ?? []) {
                        templatesMap.set((row as any).id, row as ChecklistTemplateRow);
                    }
                }

                const merged = ((assignmentRows ?? []) as ChecklistAssignmentRow[]).map((assignment) => ({
                    ...assignment,
                    template: templatesMap.get(assignment.template_id) ?? null,
                }));
                setChecklists(merged);
            } catch (e: any) {
                console.error(e);
                toast({
                    title: "Errore",
                    description: e?.message ?? "Errore caricamento manutenzione macchina",
                    variant: "destructive",
                });
                router.push("/equipment");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [machineId, router, toast]);

    if (loading || !machine) return null;

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
                <Button variant="ghost" onClick={() => router.push(`/equipment/${machine.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Indietro alla macchina
                </Button>

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Wrench className="w-8 h-8" />
                            Manutenzione macchina
                        </h1>
                        <p className="text-muted-foreground mt-1">{machine.name}</p>
                    </div>

                    <div className="flex gap-2">
                        {canCreate && (
                            <Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${machine.id}`)}>
                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                Gestisci checklist
                            </Button>
                        )}
                        {canCreate && (
                            <Button onClick={() => router.push(`/work-orders/create?machine_id=${machine.id}`)} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Nuovo work order
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader className="pb-2"><CardDescription>Work order</CardDescription><CardTitle>{workOrders.length}</CardTitle></CardHeader>
                    </Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader className="pb-2"><CardDescription>Checklist attive</CardDescription><CardTitle>{checklists.length}</CardTitle></CardHeader>
                    </Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader className="pb-2"><CardDescription>Contesto owner</CardDescription><CardTitle className="text-base">{orgId ?? "—"}</CardTitle></CardHeader>
                    </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader>
                            <CardTitle>Ultimi work order</CardTitle>
                            <CardDescription>
                                Operatività del proprietario della macchina. Il costruttore non gestisce qui i dati del cliente finale.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {workOrders.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nessun work order presente per questa macchina.</p>
                            ) : (
                                workOrders.slice(0, 8).map((wo) => (
                                    <button
                                        key={wo.id}
                                        type="button"
                                        onClick={() => router.push(`/work-orders/${wo.id}`)}
                                        className="w-full text-left rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="font-medium">{wo.title}</div>
                                                <div className="text-xs text-muted-foreground mt-1">Creato: {formatDateTime(wo.created_at)}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant="outline">{wo.status}</Badge>
                                                <span className="text-xs text-muted-foreground">Scadenza: {formatDateTime(wo.due_date)}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader>
                            <CardTitle>Checklist attive</CardTitle>
                            <CardDescription>Template assegnati alla macchina nel contesto operativo corrente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {checklists.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nessuna checklist attiva assegnata a questa macchina.</p>
                            ) : (
                                checklists.map((assignment) => (
                                    <div key={assignment.id} className="rounded-xl border border-border p-4">
                                        <div className="font-medium">{assignment.template?.name ?? "Template"}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Versione: {assignment.template?.version ?? "—"}
                                        </div>
                                    </div>
                                ))
                            )}

                            <div className="pt-2">
                                <Button variant="outline" onClick={() => router.push(`/checklists?machine_id=${machine.id}`)}>
                                    <ClipboardCheck className="w-4 h-4 mr-2" />
                                    Apri checklist
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardHeader>
                        <CardTitle>Nota architetturale</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <div>La manutenzione è gestita dall&apos;owner operativo della macchina.</div>
                        <div>Il costruttore può vedere e gestire documentazione tecnica, ma non deve modificare work order e checklist del cliente finale.</div>
                        <div>Per macchine demo o interne del costruttore, questo stesso modulo resta valido perché l&apos;owner coincide con il manufacturer.</div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
