import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Camera, ChevronLeft, Clock, Flag, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistFlowTexts } from "@/lib/checklistFlowText";

type InputType = "text" | "number" | "boolean" | "select" | "photo";
type BooleanState = "ok" | "ko" | "na";

interface ExecutionItemUI {
    id: string;
    title: string;
    description: string | null;
    input_type: InputType;
    is_required: boolean;
    order_index: number;
    metadata?: any;
    value?: string;
    booleanState?: BooleanState;
    notes?: string;
    files?: File[];
    uploadedPaths?: string[];
}

interface ChecklistExecution {
    id: string;
    status: string;
    overall_status?: string | null;
    started_at: string | null;
    completed_at: string | null;
    executed_by: string;
    signature?: string | null;
    work_order_id?: string | null;
    notes?: string | null;
    results?: any;
    checklist_id?: string;
    assignment_id?: string | null;
}

export default function ChecklistExecutionPage() {
    const router = useRouter();
    const { id, assignmentId } = router.query;
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = getChecklistFlowTexts(language).execute;

    const [execution, setExecution] = useState < ChecklistExecution | null > (null);
    const [checklistTitle, setChecklistTitle] = useState < string > (text.pageTitle);
    const [checklistDescription, setChecklistDescription] = useState < string | null > (null);
    const [items, setItems] = useState < ExecutionItemUI[] > ([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [technicianName, setTechnicianName] = useState("");
    const [signatureDataUrl, setSignatureDataUrl] = useState < string | null > (null);
    const [saveSignature, setSaveSignature] = useState(false);
    const canvasRef = useRef < HTMLCanvasElement > (null);
    const [isDrawing, setIsDrawing] = useState(false);

    const effectiveExecutionId = useMemo(() => {
        const raw = Array.isArray(id) ? id[0] : id;
        return typeof raw === "string" ? raw : null;
    }, [id]);

    const effectiveAssignmentId = useMemo(() => {
        const raw = Array.isArray(assignmentId) ? assignmentId[0] : assignmentId;
        return typeof raw === "string" ? raw : null;
    }, [assignmentId]);

    useEffect(() => {
        const bootstrap = async () => {
            if (!effectiveExecutionId && effectiveAssignmentId) {
                await createExecutionFromAssignment(effectiveAssignmentId);
                return;
            }
            if (effectiveExecutionId) {
                await loadExecution(effectiveExecutionId);
                return;
            }
            setLoading(false);
        };

        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveExecutionId, effectiveAssignmentId]);

    const createExecutionFromAssignment = async (aid: string) => {
        try {
            setLoading(true);
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            const { data: assignmentRow, error: assignmentError } = await supabase
                .from("checklist_assignments")
                .select("id, organization_id, machine_id")
                .eq("id", aid)
                .single();

            if (assignmentError) throw assignmentError;

            const { data, error } = await supabase
                .from("checklist_executions")
                .insert({
                    executed_by: user.id,
                    status: "in_progress",
                    overall_status: "in_progress",
                    started_at: new Date().toISOString(),
                    assignment_id: aid,
                    organization_id: (assignmentRow as any)?.organization_id ?? null,
                    machine_id: (assignmentRow as any)?.machine_id ?? null,
                } as any)
                .select("id")
                .single();

            if (error) throw error;
            router.replace(`/checklist/execute?id=${data.id}`);
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.createError,
                description: error?.message ?? text.createError,
                variant: "destructive",
            });
            setLoading(false);
        }
    };

    const loadExecution = async (executionId: string) => {
        try {
            setLoading(true);

            const { data: executionData, error: executionError } = await supabase
                .from("checklist_executions")
                .select("*")
                .eq("id", executionId)
                .single();

            if (executionError) throw executionError;

            const currentExecution = executionData as any as ChecklistExecution;
            setExecution(currentExecution);

            const aid = (executionData as any)?.assignment_id as string | null | undefined;
            if (aid) {
                await loadFromAssignment(aid);
            } else if (currentExecution.checklist_id) {
                await loadLegacy(currentExecution.checklist_id);
            } else {
                setChecklistTitle(text.pageTitle);
                setChecklistDescription(null);
                setItems([]);
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", user.id)
                    .single();
                if ((profile as any)?.full_name) {
                    setTechnicianName((profile as any).full_name);
                }
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.loadError,
                description: error?.message ?? text.loadError,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const loadFromAssignment = async (aid: string) => {
        const { data: assignment, error: assignmentError } = await supabase
            .from("checklist_assignments")
            .select(`
        id,
        organization_id,
        template_id,
        checklist_templates:template_id (
          id,
          name,
          description,
          version,
          target_type
        )
      `)
            .eq("id", aid)
            .single();

        if (assignmentError) throw assignmentError;

        const template = (assignment as any)?.checklist_templates;
        setChecklistTitle(template?.name ?? text.pageTitle);
        setChecklistDescription(template?.description ?? null);

        const { data: templateItems, error: itemsError } = await supabase
            .from("checklist_template_items")
            .select("id, title, description, input_type, is_required, order_index, metadata")
            .eq("template_id", (assignment as any).template_id)
            .order("order_index", { ascending: true });

        if (itemsError) throw itemsError;

        setItems(
            (templateItems ?? []).map((item: any) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                input_type: (item.input_type ?? "boolean") as InputType,
                is_required: Boolean(item.is_required),
                order_index: item.order_index ?? 0,
                metadata: item.metadata ?? {},
                booleanState: item.input_type === "boolean" ? "na" : undefined,
                value: "",
                notes: "",
                files: [],
                uploadedPaths: [],
            }))
        );
    };

    const loadLegacy = async (checklistId: string) => {
        const { data: checklistData, error: checklistError } = await supabase
            .from("checklists")
            .select("id, title, description")
            .eq("id", checklistId)
            .single();
        if (checklistError) throw checklistError;

        setChecklistTitle((checklistData as any)?.title ?? text.pageTitle);
        setChecklistDescription((checklistData as any)?.description ?? null);

        const { data: itemsData, error: itemsError } = await supabase
            .from("checklist_items")
            .select("*")
            .eq("checklist_id", checklistId)
            .order("order_index", { ascending: true });

        if (itemsError) throw itemsError;

        setItems(
            (itemsData || []).map((item: any, index: number) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                input_type: (item.input_type ?? "boolean") as InputType,
                is_required: Boolean(item.is_required ?? true),
                order_index: item.order_index ?? item.item_order ?? index,
                metadata: { images: item.images ?? [] },
                booleanState: item.input_type === "boolean" ? "na" : undefined,
                value: "",
                notes: "",
                files: [],
                uploadedPaths: [],
            }))
        );
    };

    const setItemPatch = (itemId: string, patch: Partial<ExecutionItemUI>) => {
        setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
    };

    const handleFileChange = (itemId: string, fileList: FileList | null) => {
        if (!fileList) return;
        setItemPatch(itemId, { files: Array.from(fileList) });
    };

    const uploadPhotosIfAny = async (executionId: string, item: ExecutionItemUI) => {
        if (!item.files || item.files.length === 0) return [] as string[];

        const bucket = "checklist-photos";
        const uploaded: string[] = [];

        for (const file of item.files) {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const path = `executions/${executionId}/${item.id}/${Date.now()}_${safeName}`;
            const { error } = await supabase.storage.from(bucket).upload(path, file, {
                upsert: false,
                contentType: file.type,
            });
            if (error) throw error;
            uploaded.push(path);
        }

        return uploaded;
    };

    const validateBeforeComplete = () => {
        return items.filter((item) => {
            if (!item.is_required) return false;
            if (item.input_type === "boolean") return (item.booleanState ?? "na") === "na";
            if (item.input_type === "photo") return !(item.files && item.files.length > 0);
            return !(item.value && item.value.trim().length > 0);
        });
    };

    const getBooleanResult = (value: BooleanState | undefined) => {
        if (value === "ok") return true;
        if (value === "ko") return false;
        return null;
    };

    const getBooleanStorageValue = (value: BooleanState | undefined) => {
        if (value === "ok") return "true";
        if (value === "ko") return "false";
        return null;
    };

    const completeExecution = async () => {
        if (!execution) return;

        const missing = validateBeforeComplete();
        if (missing.length > 0) {
            toast({
                title: text.incompleteTitle,
                description: `${text.incompleteDescription} ${missing
                    .slice(0, 3)
                    .map((item) => item.title)
                    .join(", ")}${missing.length > 3 ? "…" : ""}`,
                variant: "destructive",
            });
            return;
        }

        setCompleting(true);
        try {
            const itemsWithUploads: ExecutionItemUI[] = [];
            for (const item of items) {
                const uploadedPaths = item.input_type === "photo" ? await uploadPhotosIfAny(execution.id, item) : [];
                itemsWithUploads.push({ ...item, uploadedPaths });
            }

            const resultsJson = {
                checklistTitle,
                completedAt: new Date().toISOString(),
                technicianName: technicianName || null,
                items: itemsWithUploads.map((item) => ({
                    template_item_id: item.id,
                    title: item.title,
                    input_type: item.input_type,
                    value: item.input_type === "boolean" ? getBooleanResult(item.booleanState) : item.value ?? null,
                    notes: item.notes ?? null,
                    photos: item.uploadedPaths ?? [],
                })),
            };

            try {
                const rows = itemsWithUploads.map((item) => ({
                    execution_id: execution.id,
                    template_item_id: item.id,
                    value: item.input_type === "boolean" ? getBooleanStorageValue(item.booleanState) : item.value ?? null,
                    notes: item.notes ?? null,
                }));

                const { data: insertedItems, error: insertError } = await supabase
                    .from("checklist_execution_items")
                    .insert(rows as any)
                    .select("id, template_item_id");

                if (insertError) throw insertError;

                const photoRows: any[] = [];
                for (const item of itemsWithUploads) {
                    const insertedRow = (insertedItems ?? []).find((row: any) => row.template_item_id === item.id);
                    if (!insertedRow) continue;
                    for (const path of item.uploadedPaths ?? []) {
                        photoRows.push({ execution_item_id: insertedRow.id, storage_path: path });
                    }
                }

                if (photoRows.length > 0) {
                    const { error: photoError } = await supabase.from("checklist_execution_photos").insert(photoRows as any);
                    if (photoError) throw photoError;
                }
            } catch (error) {
                console.warn("Normalized checklist save skipped:", error);
            }

            const payload: any = {
                status: "completed",
                overall_status: "completed",
                completed_at: new Date().toISOString(),
                executed_at: new Date().toISOString(),
                results: resultsJson,
                notes: null,
            };
            if (saveSignature && signatureDataUrl) {
                payload.signature = signatureDataUrl;
            }

            const { error: updateError } = await supabase.from("checklist_executions").update(payload).eq("id", execution.id);
            if (updateError) throw updateError;

            toast({ title: text.completedTitle, description: text.completedDescription });
            router.push(`/checklists/executions/${execution.id}`);
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.completeError,
                description: error?.message ?? text.completeError,
                variant: "destructive",
            });
        } finally {
            setCompleting(false);
        }
    };

    const startDrawing = (event: MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        setIsDrawing(true);
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000";
        ctx.beginPath();
        const rect = canvasRef.current.getBoundingClientRect();
        ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    };

    const draw = (event: MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;
        const rect = canvasRef.current.getBoundingClientRect();
        ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!canvasRef.current) return;
        setIsDrawing(false);
        setSignatureDataUrl(canvasRef.current.toDataURL("image/png"));
    };

    const clearSignature = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setSignatureDataUrl(null);
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex h-[70vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </MainLayout>
        );
    }

    if (!execution) {
        return (
            <MainLayout>
                <div className="mx-auto max-w-3xl p-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{text.emptyExecutionTitle}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" onClick={() => router.push("/checklists")}>{text.backToChecklists}</Button>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <SEO title={`${text.pageTitle} - ${checklistTitle}`} />

            <div className="mx-auto max-w-4xl space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        {text.back}
                    </Button>
                    <Badge variant={(execution.overall_status || execution.status) === "completed" ? "default" : "secondary"}>
                        {execution.overall_status || execution.status}
                    </Badge>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-3">
                            <span>{checklistTitle}</span>
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {execution.started_at ? format(new Date(execution.started_at), "dd/MM/yyyy HH:mm") : "-"}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {checklistDescription ? <p className="mb-3 text-sm text-muted-foreground">{checklistDescription}</p> : null}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                                <LabelSmall>{text.operator}</LabelSmall>
                                <Input
                                    value={technicianName}
                                    onChange={(event) => setTechnicianName(event.target.value)}
                                    placeholder={text.operatorPlaceholder}
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <Button variant="outline" onClick={() => setShowSignatureDialog(true)}>
                                    <Flag className="mr-2 h-4 w-4" />
                                    {text.signatureOptional}
                                </Button>
                                {signatureDataUrl ? <Badge variant="secondary">{text.signatureReady}</Badge> : null}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            {text.itemsTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {items.length === 0 ? <p className="text-sm text-muted-foreground">{text.emptyItems}</p> : null}

                        {items
                            .slice()
                            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                            .map((item) => (
                                <div key={item.id} className="space-y-3 rounded-xl border border-border bg-background p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="font-medium text-foreground">
                                                {item.title} {item.is_required ? <span className="text-red-500">*</span> : null}
                                            </div>
                                            {item.description ? <div className="text-sm text-muted-foreground">{item.description}</div> : null}
                                        </div>
                                    </div>

                                    {item.input_type === "boolean" ? (
                                        <select
                                            value={item.booleanState ?? "na"}
                                            onChange={(event) => setItemPatch(item.id, { booleanState: event.target.value as BooleanState })}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                        >
                                            <option value="na">{text.boolNa}</option>
                                            <option value="ok">{text.boolOk}</option>
                                            <option value="ko">{text.boolKo}</option>
                                        </select>
                                    ) : null}

                                    {item.input_type === "number" ? (
                                        <div className="space-y-1">
                                            <Input
                                                type="number"
                                                value={item.value ?? ""}
                                                onChange={(event) => setItemPatch(item.id, { value: event.target.value })}
                                                placeholder={
                                                    item.metadata?.unit
                                                        ? `${text.numberPlaceholderWithUnit} (${item.metadata.unit})`
                                                        : text.numberPlaceholder
                                                }
                                            />
                                            {typeof item.metadata?.min !== "undefined" || typeof item.metadata?.max !== "undefined" ? (
                                                <div className="text-xs text-muted-foreground">
                                                    {text.rangeLabel}: {item.metadata?.min ?? "-"} … {item.metadata?.max ?? "-"}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {item.input_type === "text" ? (
                                        <Input
                                            value={item.value ?? ""}
                                            onChange={(event) => setItemPatch(item.id, { value: event.target.value })}
                                            placeholder={text.textPlaceholder}
                                        />
                                    ) : null}

                                    {item.input_type === "select" ? (
                                        <select
                                            value={item.value ?? ""}
                                            onChange={(event) => setItemPatch(item.id, { value: event.target.value })}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                        >
                                            <option value="">{text.selectPlaceholder}</option>
                                            {(item.metadata?.options ?? []).map((option: string) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    ) : null}

                                    {item.input_type === "photo" ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Camera className="h-4 w-4" />
                                                {text.uploadPhotos}
                                            </div>
                                            <Input type="file" accept="image/*" multiple onChange={(event) => handleFileChange(item.id, event.target.files)} />
                                            {item.files && item.files.length > 0 ? (
                                                <div className="text-xs text-muted-foreground">
                                                    {item.files.length} {text.filesSelected}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <Textarea
                                        value={item.notes ?? ""}
                                        onChange={(event) => setItemPatch(item.id, { notes: event.target.value })}
                                        placeholder={text.itemNotesPlaceholder}
                                        rows={2}
                                    />
                                </div>
                            ))}

                        <div className="flex justify-end">
                            <Button className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]" onClick={completeExecution} disabled={completing}>
                                {completing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {text.saving}
                                    </>
                                ) : (
                                    text.complete
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{text.signatureTitle}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3">
                            <div className="overflow-hidden rounded-md border">
                                <canvas
                                    ref={canvasRef}
                                    width={520}
                                    height={180}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    className="w-full bg-white"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="save-signature"
                                    type="checkbox"
                                    checked={saveSignature}
                                    onChange={(event) => setSaveSignature(event.target.checked)}
                                />
                                <label htmlFor="save-signature" className="text-sm">
                                    {text.saveSignature}
                                </label>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={clearSignature}>{text.clear}</Button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>{text.close}</Button>
                            <Button onClick={() => setShowSignatureDialog(false)} className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]">
                                {text.useSignature}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}

function LabelSmall({ children }: { children: ReactNode }) {
    return <div className="mb-1 text-xs text-muted-foreground">{children}</div>;
}
