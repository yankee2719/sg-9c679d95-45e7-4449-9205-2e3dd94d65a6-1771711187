import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
    canManageChecklists,
    getChecklistTexts,
    translateChecklistTarget,
} from "@/lib/checklistsPageText";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRightLeft, Plus, RefreshCcw, Trash2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Template = {
    id: string;
    name: string;
    target_type: string;
    version: number;
};

type Machine = {
    id: string;
    name: string;
    internal_code: string | null;
    organization_id: string | null;
};

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

export default function ChecklistAssignmentsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = getChecklistTexts(language);

    const [role, setRole] = useState("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [templates, setTemplates] = useState < Template[] > ([]);
    const [machines, setMachines] = useState < Machine[] > ([]);
    const [assignments, setAssignments] = useState < Assignment[] > ([]);

    const [templateId, setTemplateId] = useState("none");
    const [machineId, setMachineId] = useState("none");

    const allow = useMemo(() => canManageChecklists(role), [role]);

    const load = async () => {
        setLoading(true);
        try {
            const ctx = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }

            const activeOrgId = ctx.orgId ?? null;
            if (!activeOrgId) throw new Error(text.assignments.assignError);

            setRole(ctx.role ?? "technician");
            setOrgId(activeOrgId);

            const [
                { data: tplRows, error: tplError },
                { data: machineRows, error: machineError },
                { data: assignmentRows, error: assignmentError },
            ] = await Promise.all([
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

            if (tplError) throw tplError;
            if (machineError) throw machineError;
            if (assignmentError) throw assignmentError;

            const templateList = (tplRows ?? []) as Template[];
            const machineList = (machineRows ?? []) as Machine[];
            const assignmentList = (assignmentRows ?? []) as Assignment[];

            const templateMap = new Map(templateList.map((row) => [row.id, row]));
            const machineMap = new Map(machineList.map((row) => [row.id, row]));

            setTemplates(templateList);
            setMachines(machineList);
            setAssignments(
                assignmentList.map((row) => ({
                    ...row,
                    template: templateMap.get(row.template_id) ?? null,
                    machine: row.machine_id ? machineMap.get(row.machine_id) ?? null : null,
                }))
            );
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.common.error,
                description: error?.message ?? text.assignments.assignError,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const assign = async () => {
        if (!allow) {
            toast({
                title: text.assignments.permissionDenied,
                description: text.assignments.onlyManagers,
                variant: "destructive",
            });
            return;
        }

        if (!orgId) return;
        if (templateId === "none" || machineId === "none") {
            toast({
                title: text.common.error,
                description: text.assignments.missingSelection,
                variant: "destructive",
            });
            return;
        }

        const duplicate = assignments.find(
            (entry) => entry.template_id === templateId && entry.machine_id === machineId && entry.is_active
        );
        if (duplicate) {
            toast({
                title: text.common.error,
                description: text.assignments.duplicate,
                variant: "destructive",
            });
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
            } as any);

            if (error) throw error;

            setTemplateId("none");
            setMachineId("none");

            toast({ title: text.assignments.assigned });
            await load();
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.common.error,
                description: error?.message ?? text.assignments.assignError,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const deactivate = async (assignmentId: string) => {
        if (!allow) return;
        if (!window.confirm(text.assignments.deactivateConfirm)) return;

        try {
            const { error } = await supabase
                .from("checklist_assignments")
                .update({ is_active: false } as any)
                .eq("id", assignmentId)
                .eq("organization_id", orgId);

            if (error) throw error;

            toast({ title: text.assignments.deactivated });
            await load();
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.common.error,
                description: error?.message ?? text.assignments.deactivateError,
                variant: "destructive",
            });
        }
    };

    const stats = useMemo(() => {
        const total = assignments.length;
        const active = assignments.filter((entry) => entry.is_active).length;
        return { total, active };
    }, [assignments]);

    return (
        <MainLayout userRole={role}>
            <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <ArrowRightLeft className="h-6 w-6" />
                            {text.assignments.title}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">{text.assignments.subtitle}</p>
                    </div>

                    <Button variant="outline" onClick={load}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {text.common.refresh}
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>{text.assignments.totalAssignments}</CardDescription>
                            <CardTitle>{stats.total}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>{text.assignments.activeAssignments}</CardDescription>
                            <CardTitle>{stats.active}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>{text.assignments.activeOnly}</CardDescription>
                            <CardTitle>{stats.total === 0 ? 0 : Math.round((stats.active / stats.total) * 100)}%</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{text.assignments.newTitle}</CardTitle>
                        <CardDescription>{text.assignments.newDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="text-sm font-medium">{text.assignments.template}</div>
                                <Select value={templateId} onValueChange={setTemplateId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={text.assignments.selectTemplate} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{text.assignments.selectTemplate}</SelectItem>
                                        {templates.map((template) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                {template.name} · v{template.version}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-medium">{text.assignments.machine}</div>
                                <Select value={machineId} onValueChange={setMachineId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={text.assignments.selectMachine} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{text.assignments.selectMachine}</SelectItem>
                                        {machines.map((machine) => (
                                            <SelectItem key={machine.id} value={machine.id}>
                                                {machine.name}
                                                {machine.internal_code ? ` — ${machine.internal_code}` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={assign} disabled={!allow || saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                                <Plus className="mr-2 h-4 w-4" />
                                {saving ? text.assignments.assigning : text.assignments.assign}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{text.assignments.historyTitle}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading && <div className="text-sm text-muted-foreground">{text.common.loading}</div>}

                        {!loading && assignments.length === 0 && (
                            <div className="text-sm text-muted-foreground">{text.assignments.noResults}</div>
                        )}

                        {!loading &&
                            assignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-start md:justify-between"
                                >
                                    <div className="space-y-2">
                                        <div className="font-medium">
                                            {assignment.template?.name ?? text.templates.newTemplate}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {text.assignments.machine}: {assignment.machine?.name ?? text.executions.machineFallback}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline">
                                                {translateChecklistTarget(assignment.template?.target_type, language)}
                                            </Badge>
                                            <Badge variant="outline">
                                                v{assignment.template?.version ?? 1}
                                            </Badge>
                                            <Badge variant={assignment.is_active ? "default" : "secondary"}>
                                                {assignment.is_active ? text.common.active : text.common.inactive}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {assignment.machine_id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/equipment/${assignment.machine_id}`)}
                                            >
                                                {text.assignments.openMachine}
                                            </Button>
                                        )}
                                        {assignment.is_active && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => deactivate(assignment.id)}
                                                disabled={!allow}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {text.assignments.deactivate}
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
