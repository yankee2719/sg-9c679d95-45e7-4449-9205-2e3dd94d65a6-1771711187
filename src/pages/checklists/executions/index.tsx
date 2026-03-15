import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    formatChecklistDate,
    getChecklistTexts,
    normalizeExecutionStatus,
} from "@/lib/checklistsPageText";
import { ClipboardCheck, Search, Filter, Eye, Wrench, Factory, Building2 } from "lucide-react";

type ExecutionRow = {
    id: string;
    assignment_id?: string | null;
    organization_id?: string | null;
    work_order_id?: string | null;
    machine_id?: string | null;
    executed_by?: string | null;
    executed_at?: string | null;
    template_version?: number | null;
    overall_status?: string | null;
    status?: string | null;
    notes?: string | null;
    created_at?: string | null;
};

type AssignmentRow = { id: string; template_id: string; machine_id: string | null };
type TemplateRow = { id: string; name: string | null };
type MachineRow = { id: string; name: string | null; internal_code: string | null; plant_id: string | null };
type WorkOrderRow = { id: string; title: string | null; status: string | null };
type Plant = { id: string; name: string | null };

export default function ChecklistExecutionsIndexPage() {
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = getChecklistTexts(language);

    const [role, setRole] = useState("technician");
    const [orgType, setOrgType] = useState < "manufacturer" | "customer" | null > (null);
    const [loading, setLoading] = useState(true);

    const [executions, setExecutions] = useState < ExecutionRow[] > ([]);
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [assignmentMap, setAssignmentMap] = useState < Record < string, AssignmentRow>> ({});
    const [templateMap, setTemplateMap] = useState < Record < string, TemplateRow>> ({});
    const [machineMap, setMachineMap] = useState < Record < string, MachineRow>> ({});
    const [workOrderMap, setWorkOrderMap] = useState < Record < string, WorkOrderRow>> ({});

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [plantFilter, setPlantFilter] = useState("all");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const ctx = await getUserContext();
                if (!ctx) return;

                if (!ctx.orgId || !ctx.orgType) {
                    throw new Error(text.executions.loadError);
                }

                setRole(ctx.role ?? "technician");
                setOrgType(ctx.orgType);

                if (ctx.orgType === "customer") {
                    const { data: plantRows, error: plantError } = await supabase
                        .from("plants")
                        .select("id, name")
                        .eq("organization_id", ctx.orgId)
                        .eq("is_archived", false)
                        .order("name", { ascending: true });

                    if (plantError) throw plantError;
                    setPlants((plantRows ?? []) as Plant[]);
                } else {
                    setPlants([]);
                }

                let executionRows: ExecutionRow[] = [];

                if (ctx.orgType === "customer") {
                    const { data, error } = await supabase
                        .from("checklist_executions")
                        .select("*")
                        .eq("organization_id", ctx.orgId)
                        .order("executed_at", { ascending: false });

                    if (error) throw error;
                    executionRows = (data ?? []) as any[];
                } else {
                    const { data: assignmentRows, error: manufacturerAssignmentError } = await supabase
                        .from("machine_assignments")
                        .select("machine_id")
                        .eq("manufacturer_org_id", ctx.orgId)
                        .eq("is_active", true);

                    if (manufacturerAssignmentError) throw manufacturerAssignmentError;

                    const machineIds = Array.from(
                        new Set(((assignmentRows ?? []) as any[]).map((row) => row.machine_id).filter(Boolean))
                    );

                    if (machineIds.length === 0) {
                        setExecutions([]);
                        setLoading(false);
                        return;
                    }

                    const { data, error } = await supabase
                        .from("checklist_executions")
                        .select("*")
                        .in("machine_id", machineIds)
                        .order("executed_at", { ascending: false });

                    if (error) throw error;
                    executionRows = (data ?? []) as any[];
                }

                setExecutions(executionRows);

                const assignmentIds = Array.from(
                    new Set(executionRows.map((row) => row.assignment_id).filter(Boolean))
                ) as string[];
                const workOrderIds = Array.from(
                    new Set(executionRows.map((row) => row.work_order_id).filter(Boolean))
                ) as string[];
                const machineIds = Array.from(
                    new Set(executionRows.map((row) => row.machine_id).filter(Boolean))
                ) as string[];

                const nextAssignmentMap: Record<string, AssignmentRow> = {};
                const nextTemplateMap: Record<string, TemplateRow> = {};
                const nextMachineMap: Record<string, MachineRow> = {};
                const nextWorkOrderMap: Record<string, WorkOrderRow> = {};

                let templateIds: string[] = [];

                if (assignmentIds.length > 0) {
                    const { data: assignmentRows, error: assignmentError } = await supabase
                        .from("checklist_assignments")
                        .select("id, template_id, machine_id")
                        .in("id", assignmentIds);

                    if (assignmentError) throw assignmentError;

                    for (const row of (assignmentRows ?? []) as any[]) {
                        nextAssignmentMap[row.id] = row as AssignmentRow;
                        if (row.template_id) templateIds.push(row.template_id);
                    }
                }

                if (templateIds.length > 0) {
                    templateIds = Array.from(new Set(templateIds));
                    const { data: templateRows, error: templateError } = await supabase
                        .from("checklist_templates")
                        .select("id, name")
                        .in("id", templateIds);

                    if (templateError) throw templateError;

                    for (const row of (templateRows ?? []) as any[]) {
                        nextTemplateMap[row.id] = row as TemplateRow;
                    }
                }

                if (machineIds.length > 0) {
                    const { data: machineRows, error: machineError } = await supabase
                        .from("machines")
                        .select("id, name, internal_code, plant_id")
                        .in("id", machineIds);

                    if (machineError) throw machineError;

                    for (const row of (machineRows ?? []) as any[]) {
                        nextMachineMap[row.id] = row as MachineRow;
                    }
                }

                if (workOrderIds.length > 0) {
                    const { data: workOrderRows, error: workOrderError } = await supabase
                        .from("work_orders")
                        .select("id, title, status")
                        .in("id", workOrderIds);

                    if (workOrderError) throw workOrderError;

                    for (const row of (workOrderRows ?? []) as any[]) {
                        nextWorkOrderMap[row.id] = row as WorkOrderRow;
                    }
                }

                setAssignmentMap(nextAssignmentMap);
                setTemplateMap(nextTemplateMap);
                setMachineMap(nextMachineMap);
                setWorkOrderMap(nextWorkOrderMap);
            } catch (error: any) {
                console.error(error);
                toast({
                    title: text.common.error,
                    description: error?.message ?? text.executions.loadError,
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [toast, text.executions.loadError]);

    const filteredExecutions = useMemo(() => {
        return executions.filter((row) => {
            const normalizedStatus = normalizeExecutionStatus(row.overall_status || row.status);
            const machine = row.machine_id ? machineMap[row.machine_id] : null;
            const workOrder = row.work_order_id ? workOrderMap[row.work_order_id] : null;
            const assignment = row.assignment_id ? assignmentMap[row.assignment_id] : null;
            const template = assignment?.template_id ? templateMap[assignment.template_id] : null;

            const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
            const matchesPlant = plantFilter === "all" || String(machine?.plant_id ?? "") === plantFilter;

            const haystack = [
                template?.name,
                machine?.name,
                machine?.internal_code,
                workOrder?.title,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());

            return matchesStatus && matchesPlant && matchesSearch;
        });
    }, [executions, statusFilter, plantFilter, search, machineMap, workOrderMap, assignmentMap, templateMap]);

    const stats = useMemo(() => {
        const total = filteredExecutions.length;
        const completed = filteredExecutions.filter(
            (row) => normalizeExecutionStatus(row.overall_status || row.status) === "completed"
        ).length;
        const inProgress = filteredExecutions.filter(
            (row) => normalizeExecutionStatus(row.overall_status || row.status) === "in_progress"
        ).length;
        const failed = filteredExecutions.filter(
            (row) => normalizeExecutionStatus(row.overall_status || row.status) === "failed"
        ).length;
        return { total, completed, inProgress, failed };
    }, [filteredExecutions]);

    const statusLabel = (status: string) => {
        if (status === "completed") return text.executions.completed;
        if (status === "failed") return text.executions.failed;
        return text.executions.inProgress;
    };

    const statusClass = (status: string) => {
        if (status === "completed") {
            return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30";
        }
        if (status === "failed") {
            return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30";
        }
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30";
    };

    return (
        <MainLayout userRole={role}>
            <SEO title={`${text.executions.title} - MACHINA`} />

            <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">{text.executions.title}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {orgType === "manufacturer"
                                ? text.executions.subtitleManufacturer
                                : text.executions.subtitleCustomer}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {orgType === "manufacturer" ? <Factory className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                        <span>
                            {orgType === "manufacturer"
                                ? text.executions.manufacturerView
                                : text.executions.customerView}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card><CardHeader className="pb-2"><CardDescription>{text.executions.total}</CardDescription><CardTitle>{stats.total}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>{text.executions.completed}</CardDescription><CardTitle>{stats.completed}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>{text.executions.inProgress}</CardDescription><CardTitle>{stats.inProgress}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>{text.executions.failed}</CardDescription><CardTitle>{stats.failed}</CardTitle></CardHeader></Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            {text.executions.filters}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{text.common.search}</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                    placeholder={text.executions.searchPlaceholder}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{text.executions.status}</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger><SelectValue placeholder={text.executions.allStatuses} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{text.executions.allStatuses}</SelectItem>
                                    <SelectItem value="completed">{text.executions.completed}</SelectItem>
                                    <SelectItem value="in_progress">{text.executions.inProgress}</SelectItem>
                                    <SelectItem value="failed">{text.executions.failed}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{text.executions.plant}</label>
                            <Select
                                value={plantFilter}
                                onValueChange={setPlantFilter}
                                disabled={orgType !== "customer"}
                            >
                                <SelectTrigger><SelectValue placeholder={text.executions.allPlants} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{text.executions.allPlants}</SelectItem>
                                    {plants.map((plant) => (
                                        <SelectItem key={plant.id} value={plant.id}>
                                            {plant.name ?? plant.id}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            {text.executions.title}
                        </CardTitle>
                        <CardDescription>
                            {filteredExecutions.length} {text.executions.results}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-sm text-muted-foreground">{text.common.loading}</div>
                        ) : filteredExecutions.length === 0 ? (
                            <div className="text-sm text-muted-foreground">{text.executions.noResults}</div>
                        ) : (
                            <div className="space-y-3">
                                {filteredExecutions.map((row) => {
                                    const status = normalizeExecutionStatus(row.overall_status || row.status);
                                    const assignment = row.assignment_id ? assignmentMap[row.assignment_id] : null;
                                    const template = assignment?.template_id ? templateMap[assignment.template_id] : null;
                                    const machine = row.machine_id ? machineMap[row.machine_id] : null;
                                    const workOrder = row.work_order_id ? workOrderMap[row.work_order_id] : null;

                                    return (
                                        <div
                                            key={row.id}
                                            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate font-medium">
                                                        {template?.name ?? text.executions.templateFallback}
                                                    </h3>
                                                    <Badge variant="outline" className={statusClass(status)}>
                                                        {statusLabel(status)}
                                                    </Badge>
                                                    {orgType === "manufacturer" && <Badge variant="outline">{text.executions.manufacturerView}</Badge>}
                                                </div>

                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Wrench className="h-3.5 w-3.5" />
                                                        {machine?.name ?? text.executions.machineFallback}
                                                    </span>
                                                    <span>{text.executions.workOrder}: {workOrder?.title ?? text.executions.workOrderFallback}</span>
                                                    <span>{text.executions.executedAt}: {formatChecklistDate(row.executed_at || row.created_at, language)}</span>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/checklists/executions/${row.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        {text.executions.detail}
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
