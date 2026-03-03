// src/pages/work-orders/new.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Machine = { id: string; name: string; internal_code?: string | null };

function pickOrgId(ctx: any): string | null {
  return (
    ctx?.orgId ||
    ctx?.organizationId ||
    ctx?.organization_id ||
    ctx?.tenant_id ||
    null
  );
}

export default function WorkOrderNewPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState<string>("technician");
  const canCreate = role === "admin" || role === "supervisor";

  const typeFromQuery = useMemo(() => {
    const t = router.query.type;
    return typeof t === "string" && t.trim() ? t.trim() : "maintenance";
  }, [router.query.type]);

  // form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState(typeFromQuery);
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<string>("");

  // machine (optional)
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState<string>("none");

  // resolved context
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => setType(typeFromQuery), [typeFromQuery]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const ctx: any = await getUserContext();
        if (!ctx) {
          router.push("/login");
          return;
        }

        const resolvedOrgId = pickOrgId(ctx);
        if (!resolvedOrgId) throw new Error("Organization non trovata nel contesto utente.");
        setOrgId(resolvedOrgId);

        setRole(ctx.role ?? "technician");

        // Load machines visible to the user (RLS decides)
        const { data, error } = await supabase
          .from("machines")
          .select("id,name,internal_code")
          .eq("is_archived", false)
          .order("name", { ascending: true })
          .limit(500);

        if (error) throw error;
        setMachines((data ?? []) as any);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Errore",
          description: e?.message ?? "Errore caricamento",
          variant: "destructive",
        });
        router.push("/work-orders");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router, toast]);

  const handleSave = async () => {
    if (!canCreate) {
      toast({
        title: "Permesso negato",
        description: "Solo Admin/Supervisor possono creare work orders.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un titolo",
        variant: "destructive",
      });
      return;
    }

    if (!orgId) {
      toast({
        title: "Errore",
        description: "orgId mancante nel contesto utente.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const createdBy = userRes?.user?.id ?? null;

      const payload: any = {
        organization_id: orgId, // ✅ fondamentale per RLS
        title: title.trim(),
        description: description.trim() || null,
        type: type || "maintenance",
        status,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        machine_id: machineId === "none" ? null : machineId,
        created_by: createdBy, // se la colonna non esiste, togli questa riga
      };

      const { data, error } = await supabase
        .from("work_orders")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      toast({ title: "OK", description: "Work order creato" });
      router.push(`/work-orders/${data.id}`);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Errore",
        description: e?.message ?? "Errore creazione work order",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <MainLayout userRole={role as any}>
      <SEO title="Nuovo Work Order - MACHINA" />

      <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
        </Button>

        <Card className="rounded-2xl border-0 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Nuovo Work Order</CardTitle>
            <CardDescription className="text-muted-foreground">
              Crea un ordine di lavoro. Se arrivi da Maintenance, il tipo è già preimpostato.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Titolo *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="es. Sostituzione cinghia..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Seleziona tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priorità</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Seleziona priorità..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stato</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Seleziona stato..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scadenza (opzionale)</Label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Macchina (opzionale)</Label>
                <Select value={machineId} onValueChange={setMachineId}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Nessuna (generico)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna (generico)</SelectItem>
                    {machines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.internal_code ? ` — ${m.internal_code}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Descrizione</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Dettagli..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Salvataggio..." : "Salva"}
              </Button>
            </div>

            {!canCreate && (
              <p className="text-xs text-muted-foreground">
                Sei loggato come <span className="font-mono">{role}</span>: non puoi creare work orders.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}