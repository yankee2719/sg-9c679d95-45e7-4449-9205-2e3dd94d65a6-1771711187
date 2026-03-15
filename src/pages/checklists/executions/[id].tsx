import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    formatChecklistDate,
    getChecklistTexts,
    normalizeExecutionStatus,
} from "@/lib/checklistsPageText";
import { ArrowLeft, ClipboardCheck, FileText, ShieldCheck } from "lucide-react";

type ExecutionRecord = {
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
    results?: any;
    created_at?: string | null;
};

type TemplateItem = {
    id: string;
    title: string | null;
    description: string | null;
    input_type: string | null;
    is_required: boolean | null;
    order_index: number | null;
};

type ExecutionItem = {
    id: string;
    template_item_id: string;
    value: string | null;
    notes: string | null;
};

export default function ChecklistExecutionDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = getChecklistTexts(language);

    const [role, setRole] = useState("technician");
    const [orgType, setOrgType] = useState < "manufacturer" | "customer" | null > (null);
    const [loading, setLoading] = useState(true);

    const [execution, setExecution] = useState < ExecutionRecord | null > (null);
    const [templateName, setTemplateName] = useState < string > (text.executions.detailTitle);
    const [machineName, setMachineName] = useState < string > (text.executions.machineFallback);
    const [workOrderTitle, setWorkOrderTitle] = useState < string > (text.executions.workOrderFallback);
    const [answers, setAnswers] = useState <
        Array < {
        id: string;
        title: string;
        description: string | null;
        value: string | null;
        notes: string | null;
        isRequired: boolean;
        orderIndex: number;
        boolState: "ok" | "ko" | "neutral";
    } >
  > ([]);

    useEffect(() => {
        if (!router.isReady || !id) return;

        const load = async () => {
            setLoading(true);
            try {
                const ctx = await getUserContext();
                if (!ctx || !ctx.orgId || !ctx.orgType) {
                    router.push("/login");
                    return;
                }

                setRole(ctx.role ?? "technician");
                setOrgType(ctx.orgType);

                const { data: executionRow, error: executionError } = await supabase
                    .from("checklist_executions")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (executionError) throw executionError;
                const currentExecution = executionRow as any as ExecutionRecord;

                if (!currentExecution) {
                    throw new Error(text.executions.executionNotFound);
                }

                if (ctx.orgType === "customer") {
                    if (currentExecution.organization_id !== ctx.orgId) {
                        throw new Error(text.executions.executionNotFound);
                    }
                } else {
                    const { data: linkRow, error: linkError } = await supabase
                        .from("machine_assignments")
                        .select("id")
                        .eq("manufacturer_org_id", ctx.orgId)
                        .eq("machine_id", currentExecution.machine_id)
                        .eq("is_active", true)
                        .maybeSingle();

                    if (linkError) throw linkError;
                    if (!linkRow) throw new Error(text.executions.executionNotFound);
                }

                setExecution(currentExecution);

                let templateId: string | null = null;

                if (currentExecution.assignment_id) {
                    const { data: assignmentRow } = await supabase
                        .from("checklist_assignments")
                        .select("template_id, machine_id")
                        .eq("id", currentExecution.assignment_id)
                        .maybeSingle();

                    templateId = (assignmentRow as any)?.template_id ?? null;
                }

                if (templateId) {
                    const { data: templateRow } = await supabase
                        .from("checklist_templates")
                        .select("name")
                        .eq("id", templateId)
                        .maybeSingle();

                    setTemplateName((templateRow as any)?.name ?? text.executions.templateFallback);

                    const { data: templateItems } = await supabase
                        .from("checklist_template_items")
                        .select("id, title, description, input_type, is_required, order_index")
                        .eq("template_id", templateId)
                        .order("order_index", { ascending: true });

                    const itemsMap = new Map < string, TemplateItem> ();
                    for (const row of (templateItems ?? []) as any[]) {
                        itemsMap.set(row.id, row as TemplateItem);
                    }

                    const { data: executionItems } = await supabase
                        .from("checklist_execution_items")
                        .select("id, template_item_id, value, notes")
                        .eq("execution_id", currentExecution.id);

                    if (executionItems && executionItems.length > 0) {
                        const normalized = (executionItems as any[]).map((row) => {
                            const item = itemsMap.get(row.template_item_id);
                            const rawValue = row.value ?? null;
                            const boolState =
                                rawValue === "true" ? "ok" : rawValue === "false" ? "ko" : "neutral";

                            return {
                                id: row.id,
                                title: item?.title ?? text.executions.templateFallback,
                                description: item?.description ?? null,
                                value: rawValue,
                                notes: row.notes ?? null,
                                isRequired: Boolean(item?.is_required ?? false),
                                orderIndex: item?.order_index ?? 999999,
                                boolState,
                            };
                        });

                        normalized.sort((a, b) => a.orderIndex - b.orderIndex);
                        setAnswers(normalized);
                    } else if (currentExecution.results?.items?.length) {
                        const normalized = (currentExecution.results.items as any[]).map((row, index) => {
                            const rawValue = row.value ?? null;
                            const boolState =
                                rawValue === true || rawValue === "true"
                                    ? "ok"
                                    : rawValue === false || rawValue === "false"
                                        ? "ko"
                                        : "neutral";

                            return {
                                id: row.template_item_id ?? String(index),
                                title: row.title ?? text.executions.templateFallback,
                                description: null,
                                value:
                                    rawValue === true
                                        ? "true"
                                        : rawValue === false
                                            ? "false"
                                            : rawValue?.toString?.() ?? null,
                                notes: row.notes ?? null,
                                isRequired: false,
                                orderIndex: index,
                                boolState,
                            };
                        });

                        setAnswers(normalized);
                    }
                }

                if (currentExecution.machine_id) {
                    const { data: machineRow } = await supabase
                        .from("machines")
                        .select("name")
                        .eq("id", currentExecution.machine_id)
                        .maybeSingle();

                    setMachineName((machineRow as any)?.name ?? text.executions.machineFallback);
                }

                if (currentExecution.work_order_id) {
                    const { data: workOrderRow } = await supabase
                        .from("work_orders")
                        .select("title")
                        .eq("id", currentExecution.work_order_id)
                        .maybeSingle();

                    setWorkOrderTitle((workOrderRow as any)?.title ?? text.executions.workOrderFallback);
                }
            } catch (error: any) {
                console.error(error);
                toast({
                    title: text.common.error,
                    description: error?.message ?? text.executions.loadError,
                    variant: "destructive",
                });
                router.push("/checklists/executions");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id, router, router.isReady, toast, text.executions.executionNotFound, text.executions.loadError, text.executions.machineFallback, text.executions.workOrderFallback, text.executions.templateFallback]);

    const stats = useMemo(() => {
        const total = answers.length;
        const ok = answers.filter((answer) => answer.boolState === "ok").length;
        const ko = answers.filter((answer) => answer.boolState === "ko").length;
        const notes = answers.filter((answer) => Boolean(answer.notes)).length;
        return { total, ok, ko, notes };
    }, [answers]);

    const normalizedStatus = normalizeExecutionStatus(execution?.overall_status || execution?.status);

    return (
        <MainLayout userRole={role}>
            <SEO title={`${text.executions.detailTitle} - MACHINA`} />

            <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {text.common.back}
                    </Button>

                    <Button asChild variant="outline">
                        <Link href="/checklists/executions">{text.executions.title}</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardCheck className="h-5 w-5" />
                            {templateName}
                        </CardTitle>
                        <CardDescription>
                            {orgType === "manufacturer"
                                ? text.executions.subtitleManufacturer
                                : text.executions.subtitleCustomer}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="rounded-xl border p-4">
                            <div className="text-xs text-muted-foreground">{text.executions.status}</div>
                            <div className="mt-2">
                                <Badge variant="outline">{normalizedStatus}</Badge>
                            </div>
                        </div>
                        <div className="rounded-xl border p-4">
                            <div className="text-xs text-muted-foreground">{text.executions.machine}</div>
                            <div className="mt-2 text-sm font-medium">{machineName}</div>
                        </div>
                        <div className="rounded-xl border p-4">
                            <div className="text-xs text-muted-foreground">{text.executions.workOrder}</div>
                            <div className="mt-2 text-sm font-medium">{workOrderTitle}</div>
                        </div>
                        <div className="rounded-xl border p-4">
                            <div className="text-xs text-muted-foreground">{text.executions.executedAt}</div>
                            <div className="mt-2 text-sm font-medium">
                                {formatChecklistDate(execution?.executed_at || execution?.created_at, language)}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card><CardHeader className="pb-2"><CardDescription>{text.executions.results}</CardDescription><CardTitle>{stats.total}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>{text.executions.ok}</CardDescription><CardTitle>{stats.ok}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>{text.executions.ko}</CardDescription><CardTitle>{stats.ko}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>{text.executions.notes}</CardDescription><CardTitle>{stats.notes}</CardTitle></CardHeader></Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {text.executions.answers}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-sm text-muted-foreground">{text.common.loading}</div>
                        ) : answers.length === 0 ? (
                            <div className="text-sm text-muted-foreground">{text.executions.noAnswers}</div>
                        ) : (
                            <div className="space-y-3">
                                {answers.map((answer, index) => (
                                    <div key={answer.id} className="space-y-3 rounded-2xl border p-4">
                                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                            <div className="min-w-0">
                                                <div className="text-xs text-muted-foreground">#{index + 1}</div>
                                                <div className="font-medium">{answer.title}</div>
                                                {answer.description && (
                                                    <div className="mt-1 text-sm text-muted-foreground">{answer.description}</div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {answer.boolState === "ok" && (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        {text.executions.ok}
                                                    </Badge>
                                                )}
                                                {answer.boolState === "ko" && (
                                                    <Badge className="bg-rose-50 text-rose-700 border-rose-200">
                                                        {text.executions.ko}
                                                    </Badge>
                                                )}
                                                {answer.isRequired && <Badge variant="outline">{text.templates.required}</Badge>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                                            <div className="rounded-xl bg-muted/40 p-3">
                                                <div className="mb-1 text-xs text-muted-foreground">{text.executions.value}</div>
                                                <div>{answer.value || "—"}</div>
                                            </div>
                                            <div className="rounded-xl bg-muted/40 p-3">
                                                <div className="mb-1 text-xs text-muted-foreground">{text.executions.notes}</div>
                                                <div>{answer.notes || "—"}</div>
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
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            {text.executions.accessRules}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>{text.executions.customerRule}</p>
                        <p>{text.executions.manufacturerRule}</p>
                        <p>{text.executions.readonlyRule}</p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
