import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { checklistExecutionApi, type ChecklistExecutionListItem } from "@/lib/checklistExecutionApi";

type Plant = { id: string; name: string | null };

export default function ChecklistExecutionsIndexPage() {
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = getChecklistTexts(language);

    const [role, setRole] = useState("technician");
    const [orgType, setOrgType] = useState < "manufacturer" | "customer" | "enterprise" | "enterprise" | null > (null);
    const [loading, setLoading] = useState(true);
    const [executions, setExecutions] = useState < ChecklistExecutionListItem[] > ([]);
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [plantFilter, setPlantFilter] = useState("all");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const ctx = await getUserContext();
                if (!ctx || !ctx.orgId || !ctx.orgType) {
                    throw new Error(text.executions.loadError);
                }

                setRole(ctx.role ?? "technician");
                setOrgType(ctx.orgType);

                const data = await checklistExecutionApi.list();
                setExecutions(data);

                const plantMap = new Map < string, string | null > ();
                for (const row of data) {
                    if (row.plant_id) {
                        plantMap.set(row.plant_id, row.plant_name ?? row.plant_id);
                    }
                }
                setPlants(Array.from(plantMap.entries()).map(([id, name]) => ({ id, name })));
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
    }, [toast, text.common.error, text.executions.loadError]);

    const filteredExecutions = useMemo(() => {
        return executions.filter((row) => {
            const normalizedStatus = normalizeExecutionStatus(row.overall_status);
            const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
            const matchesPlant = plantFilter === "all" || String(row.plant_id ?? "") === plantFilter;

            const haystack = [
                row.template_name,
                row.machine_name,
                row.machine_code,
                row.work_order_title,
                row.executed_by_name,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
            return matchesStatus && matchesPlant && matchesSearch;
        });
    }, [executions, plantFilter, search, statusFilter]);

    const stats = useMemo(() => {
        const total = filteredExecutions.length;
        const completed = filteredExecutions.filter(
            (row) => normalizeExecutionStatus(row.overall_status) === "completed"
        ).length;
        const inProgress = filteredExecutions.filter(
            (row) => normalizeExecutionStatus(row.overall_status) === "in_progress"
        ).length;
        const failed = filteredExecutions.filter(
            (row) => normalizeExecutionStatus(row.overall_status) === "failed"
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
                            <Select value={plantFilter} onValueChange={setPlantFilter}>
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
                                    const status = normalizeExecutionStatus(row.overall_status);

                                    return (
                                        <div
                                            key={row.id}
                                            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate font-medium">
                                                        {row.template_name ?? text.executions.templateFallback}
                                                    </h3>
                                                    <Badge variant="outline" className={statusClass(status)}>
                                                        {statusLabel(status)}
                                                    </Badge>
                                                    {orgType === "manufacturer" && <Badge variant="outline">{text.executions.manufacturerView}</Badge>}
                                                </div>

                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Wrench className="h-3.5 w-3.5" />
                                                        {row.machine_name ?? text.executions.machineFallback}
                                                    </span>
                                                    <span>{text.executions.workOrder}: {row.work_order_title ?? text.executions.workOrderFallback}</span>
                                                    <span>{text.executions.executedAt}: {formatChecklistDate(row.executed_at || row.completed_at, language)}</span>
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
