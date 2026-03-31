import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useOrgType } from "@/hooks/useOrgType";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, ClipboardCheck, Pencil, PlayCircle } from "lucide-react";
import { inferChecklistItemMeta, parseChecklistItemDescription, responseTypeLabel } from "@/lib/checklistItemMeta";

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
  updated_at: string | null;
};

type ChecklistItemRow = {
  id: string;
  checklist_id: string;
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

type MachineLite = { id: string; name: string | null; internal_code: string | null; plant_id: string | null; area: string | null };
type PlantLite = { id: string; name: string | null };

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: value.includes("T") ? "2-digit" : undefined, minute: value.includes("T") ? "2-digit" : undefined }).format(date);
}

export default function ChecklistDetailPage() {
  const router = useRouter();
  const checklistId = typeof router.query.id === "string" ? router.query.id : "";
  const { loading: authLoading, organization, membership } = useAuth();
  const { toast } = useToast();
  const { isManufacturer, canExecuteChecklist, plantLabel, checklistsLabel } = useOrgType();

  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistRow | null>(null);
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [machine, setMachine] = useState<MachineLite | null>(null);
  const [plant, setPlant] = useState<PlantLite | null>(null);

  const canManage = ["owner", "admin", "supervisor"].includes(membership?.role ?? "");
  const userRole = membership?.role ?? "viewer";

  useEffect(() => {
    if (authLoading) return;
    if (!organization?.id || !checklistId) {
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: checklistRow, error: checklistError }, { data: itemRows, error: itemError }, { data: executionRows, error: executionError }] = await Promise.all([
          supabase.from("checklists").select("id, organization_id, machine_id, title, description, checklist_type, is_template, is_active, created_at, updated_at").eq("organization_id", organization.id).eq("id", checklistId).single(),
          supabase.from("checklist_items").select("id, checklist_id, title, description, item_order, is_required, expected_value, measurement_unit, min_value, max_value").eq("checklist_id", checklistId).order("item_order", { ascending: true }),
          supabase.from("checklist_executions").select("id, work_order_id, executed_at, completed_at, overall_status, notes").eq("checklist_id", checklistId).order("executed_at", { ascending: false }),
        ]);
        if (checklistError) throw checklistError;
        if (itemError) throw itemError;
        if (executionError) throw executionError;

        const currentChecklist = checklistRow as ChecklistRow;
        let machineRow: MachineLite | null = null;
        let plantRow: PlantLite | null = null;
        if (currentChecklist.machine_id) {
          const { data: machineData, error: machineError } = await supabase.from("machines").select("id, name, internal_code, plant_id, area").eq("id", currentChecklist.machine_id).maybeSingle();
          if (machineError) throw machineError;
          machineRow = (machineData as MachineLite | null) ?? null;
          if (machineRow?.plant_id) {
            const { data: plantData, error: plantError } = await supabase.from("plants").select("id, name").eq("id", machineRow.plant_id).maybeSingle();
            if (plantError) throw plantError;
            plantRow = (plantData as PlantLite | null) ?? null;
          }
        }

        if (!active) return;
        setChecklist(currentChecklist);
        setItems((itemRows ?? []) as ChecklistItemRow[]);
        setExecutions((executionRows ?? []) as ExecutionRow[]);
        setMachine(machineRow);
        setPlant(plantRow);
      } catch (error: any) {
        console.error("Checklist detail load error:", error);
        if (!active) return;
        toast({ title: "Errore caricamento checklist", description: error?.message ?? "Impossibile caricare il dettaglio checklist.", variant: "destructive" });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [authLoading, checklistId, organization?.id, toast]);

  const itemStats = useMemo(() => {
    return {
      total: items.length,
      numeric: items.filter((item) => inferChecklistItemMeta(item).responseType === "numeric").length,
      photo: items.filter((item) => inferChecklistItemMeta(item).allowPhoto).length,
    };
  }, [items]);

  return (
    <OrgContextGuard>
      <MainLayout userRole={userRole}>
        <SEO title={`${checklist?.title ?? "Checklist"} - MACHINA`} />
        <div className="px-5 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Button variant="ghost" onClick={() => router.push("/checklists")} className="mb-2 -ml-3 px-3"><ArrowLeft className="mr-2 h-4 w-4" />Torna alla lista</Button>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{checklist?.title ?? "Checklist"}</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{isManufacturer ? "Template checklist per clienti e macchine vendute." : "Dettaglio checklist con punti di controllo ed esecuzioni registrate."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link href={`/checklists/edit/${checklistId}`}><Pencil className="mr-2 h-4 w-4" />Modifica checklist</Link>
                  </Button>
                ) : null}
                {canExecuteChecklist ? (
                  <Button asChild className="rounded-2xl"><Link href={`/checklists/execute/${checklistId}`}><PlayCircle className="mr-2 h-4 w-4" />Esegui checklist</Link></Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardDescription>Punti controllo</CardDescription><CardTitle>{itemStats.total}</CardTitle></CardHeader></Card>
              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardDescription>Controlli numerici</CardDescription><CardTitle>{itemStats.numeric}</CardTitle></CardHeader></Card>
              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardDescription>Punti con foto</CardDescription><CardTitle>{itemStats.photo}</CardTitle></CardHeader></Card>
              <Card className="rounded-2xl"><CardHeader className="pb-2"><CardDescription>Esecuzioni</CardDescription><CardTitle>{executions.length}</CardTitle></CardHeader></Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Dati checklist</CardTitle>
                  <CardDescription>Contesto macchina e configurazione del template.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><div className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</div><div className="mt-1 font-medium text-foreground">{checklist?.checklist_type ?? "inspection"}</div></div>
                    <div><div className="text-xs uppercase tracking-wide text-muted-foreground">Stato</div><div className="mt-1"><Badge variant={checklist?.is_active ? "default" : "outline"}>{checklist?.is_active ? "Attiva" : "Inattiva"}</Badge></div></div>
                    <div><div className="text-xs uppercase tracking-wide text-muted-foreground">{plantLabel}</div><div className="mt-1 font-medium text-foreground">{plant?.name ?? "Template generico"}</div></div>
                    <div><div className="text-xs uppercase tracking-wide text-muted-foreground">Macchina</div><div className="mt-1 font-medium text-foreground">{machine?.name ?? "Template generico"}</div></div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Descrizione</div>
                    <div className="mt-1 whitespace-pre-wrap text-foreground">{checklist?.description || "—"}</div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><div className="text-xs uppercase tracking-wide text-muted-foreground">Creata</div><div className="mt-1 text-foreground">{formatDate(checklist?.created_at)}</div></div>
                    <div><div className="text-xs uppercase tracking-wide text-muted-foreground">Aggiornata</div><div className="mt-1 text-foreground">{formatDate(checklist?.updated_at)}</div></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Punti di controllo</CardTitle>
                  <CardDescription>{checklistsLabel} configurata con campi opzionali, controlli numerici e foto dove richieste.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? <div className="text-sm text-muted-foreground">Caricamento...</div> : null}
                  {items.map((item, index) => {
                    const parsed = parseChecklistItemDescription(item.description);
                    const meta = inferChecklistItemMeta(item);
                    return (
                      <div key={item.id} className="rounded-2xl border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-foreground">{index + 1}. {item.title}</div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{responseTypeLabel(meta.responseType)}</Badge>
                            {item.is_required ? <Badge>Obbligatorio</Badge> : <Badge variant="secondary">Opzionale</Badge>}
                            {meta.allowPhoto ? <Badge variant="outline"><Camera className="mr-1 h-3 w-3" />Foto</Badge> : null}
                          </div>
                        </div>
                        {parsed.cleanDescription ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{parsed.cleanDescription}</p> : null}
                        {meta.responseType === "numeric" ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-4 text-sm">
                            <div><div className="text-xs text-muted-foreground">Valore atteso</div><div className="font-medium text-foreground">{item.expected_value || "—"}</div></div>
                            <div><div className="text-xs text-muted-foreground">Unità</div><div className="font-medium text-foreground">{item.measurement_unit || "—"}</div></div>
                            <div><div className="text-xs text-muted-foreground">Min</div><div className="font-medium text-foreground">{item.min_value ?? "—"}</div></div>
                            <div><div className="text-xs text-muted-foreground">Max</div><div className="font-medium text-foreground">{item.max_value ?? "—"}</div></div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Storico esecuzioni</CardTitle>
                <CardDescription>Ultime esecuzioni registrate per questa checklist.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {executions.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nessuna esecuzione registrata.</div> : null}
                {executions.map((execution) => (
                  <div key={execution.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground"><ClipboardCheck className="h-4 w-4" />Esecuzione {formatDate(execution.executed_at)}</div>
                      <Badge variant="outline">{execution.overall_status ?? "pending"}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">Completata: {formatDate(execution.completed_at)}</div>
                    {execution.notes ? <div className="mt-2 text-sm text-foreground">{execution.notes}</div> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </OrgContextGuard>
  );
}
