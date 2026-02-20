import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, ChevronLeft, Clock, Flag, MessageSquare, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// NOTE
// This page supports BOTH:
// - Legacy executions that point to `checklists/checklist_items`
// - New executions that point to `checklist_assignments` -> `checklist_templates` -> `checklist_template_items`

type InputType = "text" | "number" | "boolean" | "select" | "photo";

interface ExecutionItemUI {
  id: string;
  title: string;
  description: string | null;
  input_type: InputType;
  is_required: boolean;
  order_index: number;
  metadata?: any;

  // UI state
  value?: string; // for text/number/select
  checked?: boolean; // for boolean
  notes?: string;
  files?: File[]; // for photo
  uploadedPaths?: string[]; // storage paths
}

interface ChecklistExecution {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  executed_by: string;
  signature?: string | null;
  schedule_id?: string | null;
  work_order_id?: string | null;
  notes?: string | null;
  results?: any;

  // legacy
  checklist_id?: string;

  // new (may not exist yet in DB; we treat as any)
  assignment_id?: string | null;
}

export default function ChecklistExecutionPage() {
  const router = useRouter();
  const { id, assignmentId } = router.query;
  const { toast } = useToast();

  const [execution, setExecution] = useState<ChecklistExecution | null>(null);
  const [checklistTitle, setChecklistTitle] = useState<string>("");
  const [checklistDescription, setChecklistDescription] = useState<string | null>(null);
  const [items, setItems] = useState<ExecutionItemUI[]>([]);

  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [technicianName, setTechnicianName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [saveSignature, setSaveSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    // If the page is opened with ?assignmentId=... and no execution id, create an execution.
    const bootstrap = async () => {
      if (!effectiveExecutionId && effectiveAssignmentId) {
        await createExecutionFromAssignment(effectiveAssignmentId);
        return;
      }
      if (effectiveExecutionId) {
        await loadExecution(effectiveExecutionId);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveExecutionId, effectiveAssignmentId]);

  const createExecutionFromAssignment = async (aid: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // We keep legacy `checklist_id` NULL for new executions.
      const { data, error } = await supabase
        .from("checklist_executions")
        // using `as any` because DB types may lag behind migrations
        .insert({
          executed_by: user.id,
          status: "in_progress",
          started_at: new Date().toISOString(),
          assignment_id: aid,
        } as any)
        .select("id")
        .single();

      if (error) throw error;
      router.replace(`/checklist/execute?id=${data.id}`);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Errore",
        description: e.message ?? "Errore creazione esecuzione",
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

      const exec = executionData as any as ChecklistExecution;
      setExecution(exec);

      // Prefer new model if assignment_id exists
      const aid = (executionData as any)?.assignment_id as string | null | undefined;
      if (aid) {
        await loadFromAssignment(aid);
      } else if (exec.checklist_id) {
        await loadLegacy(exec.checklist_id);
      } else {
        setChecklistTitle("Checklist");
        setChecklistDescription(null);
        setItems([]);
      }

      // Technician name prefill
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (profile?.full_name) setTechnicianName(profile.full_name);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Errore", description: e.message ?? "Errore caricamento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadFromAssignment = async (aid: string) => {
    // assignment -> template -> items
    const { data: assignment, error: aErr } = await supabase
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

    if (aErr) throw aErr;

    const tpl = (assignment as any).checklist_templates;
    setChecklistTitle(tpl?.name ?? "Checklist");
    setChecklistDescription(tpl?.description ?? null);

    const { data: tplItems, error: iErr } = await supabase
      .from("checklist_template_items")
      .select("id,title,description,input_type,is_required,order_index,metadata")
      .eq("template_id", (assignment as any).template_id)
      .order("order_index", { ascending: true });

    if (iErr) throw iErr;

    const uiItems: ExecutionItemUI[] = (tplItems ?? []).map((it: any) => ({
      id: it.id,
      title: it.title,
      description: it.description,
      input_type: (it.input_type ?? "boolean") as InputType,
      is_required: Boolean(it.is_required),
      order_index: it.order_index ?? 0,
      metadata: it.metadata ?? {},
      checked: false,
      value: "",
      notes: "",
      files: [],
      uploadedPaths: [],
    }));

    setItems(uiItems);
  };

  const loadLegacy = async (checklistId: string) => {
    // Legacy schema (may be partially broken if DB diverged)
    const { data: checklistData, error: checklistError } = await supabase
      .from("checklists")
      .select("id, title, description")
      .eq("id", checklistId)
      .single();
    if (checklistError) throw checklistError;

    setChecklistTitle((checklistData as any)?.title ?? "Checklist");
    setChecklistDescription((checklistData as any)?.description ?? null);

    const { data: itemsData, error: itemsError } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("checklist_id", checklistId)
      // try both columns
      .order("order_index", { ascending: true });

    if (itemsError) throw itemsError;

    const initializedItems: ExecutionItemUI[] = (itemsData || []).map((item: any, idx: number) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      input_type: (item.input_type ?? "boolean") as InputType,
      is_required: Boolean(item.is_required ?? true),
      order_index: item.order_index ?? item.item_order ?? idx,
      metadata: { images: item.images ?? [] },
      checked: false,
      value: "",
      notes: "",
      files: [],
      uploadedPaths: [],
    }));

    setItems(initializedItems);
  };

  const handleFileChange = (itemId: string, fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    setItems(prev => prev.map(i => (i.id === itemId ? { ...i, files } : i)));
  };

  const uploadPhotosIfAny = async (execId: string, item: ExecutionItemUI) => {
    if (!item.files || item.files.length === 0) return [] as string[];

    // We store files in Supabase Storage bucket: checklist-photos
    // Path: executions/<executionId>/<templateItemId>/<timestamp>_<filename>
    const bucket = "checklist-photos";

    const uploaded: string[] = [];
    for (const file of item.files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `executions/${execId}/${item.id}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase
        .storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type });

      if (upErr) throw upErr;
      uploaded.push(path);
    }

    return uploaded;
  };

  const validateBeforeComplete = () => {
    const missing = items.filter(i => i.is_required).filter(i => {
      if (i.input_type === "boolean") return !i.checked;
      if (i.input_type === "photo") return !(i.files && i.files.length > 0);
      return !(i.value && i.value.trim().length > 0);
    });

    return missing;
  };

  const completeExecution = async () => {
    if (!execution) return;

    const missing = validateBeforeComplete();
    if (missing.length > 0) {
      toast({
        title: "Checklist incompleta",
        description: `Compila i campi obbligatori: ${missing.slice(0, 3).map(m => m.title).join(", ")}${missing.length > 3 ? "…" : ""}`,
        variant: "destructive",
      });
      return;
    }

    setCompleting(true);
    try {
      // Upload photos first
      const itemsWithUploads: ExecutionItemUI[] = [];
      for (const it of items) {
        const uploadedPaths = it.input_type === "photo" ? await uploadPhotosIfAny(execution.id, it) : [];
        itemsWithUploads.push({ ...it, uploadedPaths });
      }

      // Build results JSON (always)
      const resultsJson = {
        checklistTitle,
        completedAt: new Date().toISOString(),
        technicianName: technicianName || null,
        items: itemsWithUploads.map(it => ({
          template_item_id: it.id,
          title: it.title,
          input_type: it.input_type,
          value: it.input_type === "boolean" ? Boolean(it.checked) : (it.value ?? null),
          notes: it.notes ?? null,
          photos: it.uploadedPaths ?? [],
        })),
      };

      // Try to persist normalized items (new tables). If tables don't exist yet, it will fail and we still keep JSON.
      try {
        const rows = itemsWithUploads.map(it => ({
          execution_id: execution.id,
          template_item_id: it.id,
          value: it.input_type === "boolean" ? String(Boolean(it.checked)) : (it.value ?? null),
          notes: it.notes ?? null,
        }));

        const { data: inserted, error: insErr } = await supabase
          .from("checklist_execution_items")
          .insert(rows as any)
          .select("id, template_item_id");

        if (insErr) throw insErr;

        // link photos
        const photoRows: any[] = [];
        for (const it of itemsWithUploads) {
          const insertedRow = (inserted ?? []).find((r: any) => r.template_item_id === it.id);
          if (!insertedRow) continue;
          for (const p of (it.uploadedPaths ?? [])) {
            photoRows.push({
              execution_item_id: insertedRow.id,
              storage_path: p,
            });
          }
        }
        if (photoRows.length > 0) {
          const { error: phErr } = await supabase
            .from("checklist_execution_photos")
            .insert(photoRows as any);
          if (phErr) throw phErr;
        }
      } catch (e) {
        // Non-blocking; keeps JSON results
        console.warn("Normalized checklist save skipped (tables missing or RLS):", e);
      }

      // Update execution row
      const payload: any = {
        status: "completed",
        completed_at: new Date().toISOString(),
        results: resultsJson,
        notes: null,
      };
      if (saveSignature && signatureDataUrl) payload.signature = signatureDataUrl;

      const { error: upErr } = await supabase
        .from("checklist_executions")
        .update(payload)
        .eq("id", execution.id);

      if (upErr) throw upErr;

      toast({ title: "Completata", description: "Checklist completata con successo" });
      router.push(`/checklist/${execution.id}`);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Errore", description: e.message ?? "Errore completamento", variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  };

  // Signature drawing helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!canvasRef.current) return;
    setIsDrawing(false);
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSignatureDataUrl(dataUrl);
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
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!execution) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Execution non trovata</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => router.push("/checklists")}>Torna alle checklist</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEO title={`Esegui Checklist - ${checklistTitle}`} />

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <Badge variant={execution.status === "completed" ? "default" : "secondary"}>
            {execution.status}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>{checklistTitle}</span>
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {execution.started_at ? format(new Date(execution.started_at), "dd/MM/yyyy HH:mm") : "-"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checklistDescription && (
              <p className="text-sm text-muted-foreground mb-3">{checklistDescription}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <LabelSmall>Operatore</LabelSmall>
                <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} placeholder="Nome tecnico" />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={() => setShowSignatureDialog(true)}>
                  <Flag className="h-4 w-4 mr-2" />
                  Firma (opzionale)
                </Button>
                {signatureDataUrl && (
                  <Badge variant="secondary">Firma pronta</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Elementi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessun elemento nella checklist. Aggiungi items al template.</p>
            )}

            {items
              .slice()
              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
              .map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-border bg-background space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">
                        {item.title}{" "}
                        {item.is_required && <span className="text-red-500">*</span>}
                      </div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      )}
                    </div>
                  </div>

                  {/* Input */}
                  {item.input_type === "boolean" && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(item.checked)}
                        onCheckedChange={(v) =>
                          setItems(prev => prev.map(i => (i.id === item.id ? { ...i, checked: Boolean(v) } : i)))
                        }
                      />
                      <span className="text-sm">OK / Eseguito</span>
                    </div>
                  )}

                  {item.input_type === "number" && (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        value={item.value ?? ""}
                        onChange={(e) =>
                          setItems(prev => prev.map(i => (i.id === item.id ? { ...i, value: e.target.value } : i)))
                        }
                        placeholder={item.metadata?.unit ? `Valore (${item.metadata.unit})` : "Valore"}
                      />
                      {typeof item.metadata?.min !== "undefined" || typeof item.metadata?.max !== "undefined" ? (
                        <div className="text-xs text-muted-foreground">
                          Range: {item.metadata?.min ?? "-"} … {item.metadata?.max ?? "-"}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {item.input_type === "text" && (
                    <Input
                      value={item.value ?? ""}
                      onChange={(e) =>
                        setItems(prev => prev.map(i => (i.id === item.id ? { ...i, value: e.target.value } : i)))
                      }
                      placeholder="Testo"
                    />
                  )}

                  {item.input_type === "select" && (
                    <select
                      value={item.value ?? ""}
                      onChange={(e) =>
                        setItems(prev => prev.map(i => (i.id === item.id ? { ...i, value: e.target.value } : i)))
                      }
                      className="w-full border border-border bg-background rounded-md px-3 py-2"
                    >
                      <option value="">Seleziona…</option>
                      {(item.metadata?.options ?? []).map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {item.input_type === "photo" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Camera className="h-4 w-4" />
                        Carica una o più foto
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileChange(item.id, e.target.files)}
                      />
                      {item.files && item.files.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {item.files.length} file selezionati
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <Textarea
                    value={item.notes ?? ""}
                    onChange={(e) =>
                      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, notes: e.target.value } : i)))
                    }
                    placeholder="Note (opzionale)"
                    rows={2}
                  />
                </div>
              ))}

            <div className="flex justify-end">
              <Button
                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                onClick={completeExecution}
                disabled={completing}
              >
                {completing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvataggio…
                  </>
                ) : (
                  "Completa"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Signature dialog */}
        <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Firma</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="border rounded-md overflow-hidden">
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
                <Checkbox checked={saveSignature} onCheckedChange={(v) => setSaveSignature(Boolean(v))} />
                <span className="text-sm">Salva firma nell’esecuzione</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={clearSignature}>Pulisci</Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>Chiudi</Button>
              <Button onClick={() => setShowSignatureDialog(false)} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                Usa firma
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

function LabelSmall({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground mb-1">{children}</div>;
}

