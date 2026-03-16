import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
import { ArrowLeft, ClipboardCheck, FileText, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { checklistExecutionApi, type ChecklistExecutionDetail } from "@/lib/checklistExecutionApi";
import { getUserContext } from "@/lib/supabaseHelpers";

type AnswerRow = {
    id: string;
    title: string;
    description: string | null;
    value: string | null;
    notes: string | null;
    isRequired: boolean;
    orderIndex: number;
    boolState: "ok" | "ko" | "neutral";
    photos: string[];
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
    const [detail, setDetail] = useState < ChecklistExecutionDetail | null > (null);

    useEffect(() => {
        if (!router.isReady || !id || typeof id !== "string") return;

        const load = async () => {
            setLoading(true);
            try {
                const [ctx, data] = await Promise.all([getUserContext(), checklistExecutionApi.get(id)]);
                setDetail(data);
                setRole(ctx?.role ?? "technician");
                setOrgType(ctx?.orgType ?? null);
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
    }, [id, router, router.isReady, text.common.error, text.executions.loadError, toast]);

    const answers = useMemo < AnswerRow[] > (() => {
        if (!detail) return [];
        return (detail.items ?? [])
            .map((item, index) => {
                const rawValue = item.answer?.value ?? null;
                const boolState =
                    rawValue === "true" ? "ok" : rawValue === "false" ? "ko" : "neutral";
                return {
                    id: item.answer?.id ?? item.id,
                    title: item.title,
                    description: item.description ?? null,
                    value: rawValue,
                    notes: item.answer?.notes ?? null,
                    isRequired: Boolean(item.is_required),
                    orderIndex: item.order_index ?? index,
                    boolState,
                    photos: item.answer?.photos ?? [],
                };
            })
            .sort((a, b) => a.orderIndex - b.orderIndex);
    }, [detail]);

    const stats = useMemo(() => {
        const total = answers.length;
        const ok = answers.filter((answer) => answer.boolState === "ok").length;
        const ko = answers.filter((answer) => answer.boolState === "ko").length;
        const notes = answers.filter((answer) => Boolean(answer.notes)).length;
        return { total, ok, ko, notes };
    }, [answers]);

    const normalizedStatus = normalizeExecutionStatus(detail?.execution.overall_status);
    const templateName = detail?.template?.name ?? text.executions.detailTitle;
    const machineName = detail?.machine?.name ?? text.executions.machineFallback;
    const workOrderTitle = detail?.workOrder?.title ?? text.executions.workOrderFallback;

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
                                {formatChecklistDate(detail?.execution.executed_at || detail?.execution.completed_at, language)}
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

                                        {answer.photos.length > 0 && (
                                            <div className="rounded-xl bg-muted/20 p-3">
                                                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                    <ImageIcon className="h-4 w-4" />
                                                    Photos: {answer.photos.length}
                                                </div>
                                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                    {answer.photos.map((path) => (
                                                        <div key={path} className="rounded border p-2 text-xs break-all text-muted-foreground">
                                                            {path}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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
