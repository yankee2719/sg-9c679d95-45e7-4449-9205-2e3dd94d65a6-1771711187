import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Plus, RefreshCcw, Trash2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Template = { id: string; name: string; target_type: string; version: number };
type Machine = { id: string; name: string; internal_code: string | null; organization_id: string | null };
type Assignment = {
    id: string;
    organization_id: string;
    template_id: string;
    machine_id: string | null;
    production_line_id: string | null;
    is_active: boolean | null;
    created_at: string | null;
    template?: Template | null;
    machine?: Machine | null;
};

function canManage(role?: string) {
    return role === "admin" || role === "supervisor";
}

export default function ChecklistAssignmentsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [role, setRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [templates, setTemplates] = useState < Template[] > ([]);
    const [machines, setMachines] = useState < Machine[] > ([]);
    const [assignments, setAssignments] = useState < Assignment[] > ([]);

    const [templateId, setTemplateId] = useState < string > ("none");
    const [machineId, setMachineId] = useState < string > ("none");

    const allow = useMemo(() => canManage(role), [role]);

    const load = async () => {
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

            const [{ data: tplRows, error: tplErr }, { data: machineRows, error: machineErr }, { data: assignmentRows, error: asgErr }] = await Promise.all([
                supabase
                    .from("checklist_templates")
                    .select("id, name, target_type, version")
                    .eq("organization_id", activeOrgId)
                    .eq("is_active", true)
                    .order("name", { ascending: true }),
                supabase
                    .from("machines")
                    .select("id, name, internal_code, organization_id")
                    .eq("organization_id", activeOrgId)
                    .eq("is_archived", false)
                    .order("name", { ascending: true }),
                supabase
                    .from("checklist_assignments")
                    .select("id, organization_id, template_id, machine_id, production_line_id, is_active, created_at")
                    .eq("organization_id", activeOrgId)
                    .order("created_at", { ascending: false }),
            ]);

            if (tplErr) throw tplErr;
            if (machineErr) throw machineErr;
            if (asgErr) throw asgErr;

            const tplList = (tplRows ?? []) as Template[];
            const machineList = (machineRows ?? []) as Machine[];
            const asgList = (assignmentRows ?? []) as Assignment[];

            const templateMap = new Map(tplList.map((t) => [t.id, t]));
            const machineMap = new Map(machineList.map((m) => [m.id, m]));

            setTemplates(tplList);
            setMachines(machineList);
            setAssignments(
                asgList.map((a) => ({
                    ...a,
                    template: templateMap.get(a.template_id) ?? null,
                    machine: a.machine_id ? machineMap.get(a.machine_id) ?? null : null,
                }))
            );
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore caricamento assegnazioni", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const assign = async () => {
        if (!allow) {
            toast({ title: "Permesso negato", description: "Solo Admin e Supervisor possono assegnare checklist.", variant: "destructive" });
            return;
        }

        if (!orgId) return;
        if (templateId === "none" || machineId === "none") {
            toast({ title: "Errore", description: "Seleziona template e macchina.", variant: "destructive" });
            return;
        }

        const duplicate = assignments.find((a) => a.template_id === templateId && a.machine_id === machineId && a.is_active);
        if (duplicate) {
            toast({ title: "Errore", description: "Questa checklist è già assegnata alla macchina.", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from("checklist_assignments").insert({
                id: crypto.randomUUID(),
                organization_id: orgId,
                template_id: templateId,
                machine_id: machineId,
                production_line_id: null,
                is_active: true,
            });

            if (error) throw error;

            setTemplateId("none");
            setMachineId("none");
            toast({ title: "OK", description: "Checklist assegnata correttamente." });
            await load();
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore assegnazione checklist", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const deactivate = async (assignmentId: string) => {
        if (!allow) return;
        if (!confirm("Disattivare questa assegnazione checklist?")) return;

        try {
            const { error } = await supabase.from("checklist_assignments").update({ is_active: false }).eq("id", assignmentId).eq("organization_id", orgId);
            if (error) throw error;
            toast({ title: "OK", description: "Assegnazione disattivata." });
            await load();
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore disattivazione", variant: "destructive" });
        }
    };

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ArrowRightLeft className="w-6 h-6" />
                            Assegnazioni checklist
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            L&apos;owner operativo assegna template a macchine. Le esecuzioni partono poi da work order o manutenzione.
                        </p>
                    </div>

                    <Button variant="outline" onClick={load}>
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Aggiorna
                    </Button>
                </div>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>Nuova assegnazione</CardTitle>
                        <CardDescription>Collega un template attivo a una macchina della tua organizzazione.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Template</div>
                                <Select value={templateId} onValueChange={setTemplateId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Seleziona template...</SelectItem>
                                        {templates.map((template) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                {template.name} (v{template.version})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-medium">Macchina</div>
                                <Select value={machineId} onValueChange={setMachineId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona macchina" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Seleziona macchina...</SelectItem>
                                        {machines.map((machine) => (
                                            <SelectItem key={machine.id} value={machine.id}>
                                                {machine.name}{machine.internal_code ? ` — ${machine.internal_code}` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={assign} disabled={!allow || saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                {saving ? "Assegnazione..." : "Assegna checklist"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>Assegnazioni attive e storiche</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading && <div className="text-sm text-muted-foreground">Caricamento assegnazioni...</div>}

                        {!loading && assignments.length === 0 && (
                            <div className="text-sm text-muted-foreground">Nessuna assegnazione checklist trovata.</div>
                        )}

                        {!loading && assignments.map((assignment) => (
                            <div key={assignment.id} className="rounded-xl border p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="space-y-2">
                                    <div className="font-medium">{assignment.template?.name ?? "Template"}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Macchina: {assignment.machine?.name ?? "Non trovata"}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">{assignment.template?.target_type === "production_line" ? "Linea" : "Macchina"}</Badge>
                                        <Badge variant="outline">v{assignment.template?.version ?? 1}</Badge>
                                        <Badge variant={assignment.is_active ? "default" : "secondary"}>
                                            {assignment.is_active ? "Attiva" : "Disattivata"}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {assignment.machine_id && (
                                        <Button variant="outline" size="sm" onClick={() => router.push(`/equipment/${assignment.machine_id}`)}>
                                            Apri macchina
                                        </Button>
                                    )}
                                    {assignment.is_active && (
                                        <Button variant="outline" size="sm" onClick={() => deactivate(assignment.id)} disabled={!allow}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Disattiva
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
