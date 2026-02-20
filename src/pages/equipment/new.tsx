// src/pages/equipment/new.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getUserContext } from "@/lib/supabaseHelpers";
import { ArrowLeft, Save } from "lucide-react";

type Plant = {
  id: string;
  name?: string | null;
  code?: string | null;
};

type ProductionLine = {
  id: string;
  name?: string | null;
  code?: string | null;
  plant_id: string;
};

async function getDefaultOrgId(): Promise<string | null> {
  // Prova a usare il tuo helper di contesto (se ritorna org)
  try {
    const ctx: any = await getUserContext();
    if (ctx?.organization_id) return ctx.organization_id;
    if (ctx?.organizationId) return ctx.organizationId;
    if (ctx?.orgId) return ctx.orgId;
  } catch {
    // ignore
  }

  // Fallback: profiles.default_organization_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("default_organization_id")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return (data as any)?.default_organization_id ?? null;
}

export default function NewEquipmentPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userRole, setUserRole] = useState<string>("technician");

  // Form base (adatta i nomi se nel tuo form attuale sono diversi)
  const [name, setName] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Plant + Line
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>(""); // opzionale
  const [loadingLines, setLoadingLines] = useState(false);

  const canCreate = useMemo(() => true, []); // se vuoi limitare per ruolo dimmelo

  useEffect(() => {
    const init = async () => {
      try {
        const ctx: any = await getUserContext();
        if (!ctx) {
          router.push("/login");
          return;
        }
        setUserRole(ctx.role ?? "technician");

        // Carica plants visibili all'utente (RLS)
        const { data, error } = await supabase
          .from("plants")
          .select("id,name,code")
          .eq("is_archived", false)
          .order("name", { ascending: true });

        if (error) throw error;
        setPlants((data ?? []) as any);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Errore", description: e.message ?? "Errore caricamento stabilimenti", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  // Quando cambia plant, carica linee
  useEffect(() => {
    const loadLines = async () => {
      if (!selectedPlantId) {
        setLines([]);
        setSelectedLineId("");
        return;
      }

      setLoadingLines(true);
      try {
        const { data, error } = await supabase
          .from("production_lines")
          .select("id,name,code,plant_id")
          .eq("plant_id", selectedPlantId)
          .order("name", { ascending: true });

        if (error) throw error;
        setLines((data ?? []) as any);
        setSelectedLineId(""); // reset quando cambi plant
      } catch (e: any) {
        console.error(e);
        // Se qui hai errori, molto spesso è RLS su production_lines
        toast({
          title: "Errore",
          description: e.message ?? "Errore caricamento linee (controlla RLS su production_lines)",
          variant: "destructive",
        });
        setLines([]);
        setSelectedLineId("");
      } finally {
        setLoadingLines(false);
      }
    };

    loadLines();
  }, [selectedPlantId]);

  const handleSave = async () => {
    if (!canCreate) return;

    if (!selectedPlantId) {
      toast({ title: "Errore", description: "Seleziona uno stabilimento", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Errore", description: "Inserisci un nome per la macchina/attrezzatura", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const orgId = await getDefaultOrgId();
      if (!orgId) throw new Error("Organization non trovata (profiles.default_organization_id).");

      // Payload minimo e robusto
      const payload: any = {
        organization_id: orgId,
        plant_id: selectedPlantId,
        production_line_id: selectedLineId || null, // ✅ LINEA OPZIONALE
        name: name.trim(),
        internal_code: internalCode.trim() || null,
        serial_number: serialNumber.trim() || null,
        notes: notes.trim() || null,
        is_archived: false,
      };

      const { error } = await supabase.from("machines").insert(payload);
      if (error) throw error;

      toast({ title: "OK", description: "Attrezzatura creata" });
      router.push("/equipment"); // se la tua lista è su /machines dimmelo e lo cambio
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Errore salvataggio",
        description: e.message ?? "Errore creazione macchina",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <MainLayout userRole={userRole as any}>
      <SEO title="Nuova attrezzatura - MACHINA" />

      <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>

        <Card className="rounded-2xl border-0 bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Nuova attrezzatura</CardTitle>
            <CardDescription className="text-muted-foreground">
              Seleziona lo stabilimento e, se serve, la linea (opzionale)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Stabilimento */}
            <div className="space-y-2">
              <Label>Stabilimento *</Label>
              <select
                value={selectedPlantId}
                onChange={(e) => setSelectedPlantId(e.target.value)}
                className="w-full border border-border bg-background rounded-md px-3 py-2"
              >
                <option value="">— Seleziona —</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.code ?? p.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Linea (opzionale) */}
            <div className="space-y-2">
              <Label>Linea (opzionale)</Label>
              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                disabled={!selectedPlantId || loadingLines}
                className="w-full border border-border bg-background rounded-md px-3 py-2 disabled:opacity-60"
              >
                <option value="">— Nessuna —</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name ?? l.code ?? l.id}
                  </option>
                ))}
              </select>
              {!selectedPlantId && (
                <p className="text-xs text-muted-foreground">Seleziona prima lo stabilimento per vedere le linee.</p>
              )}
            </div>

            {/* Dati macchina */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Pressa B1" />
              </div>

              <div className="space-y-2">
                <Label>Codice interno</Label>
                <Input value={internalCode} onChange={(e) => setInternalCode(e.target.value)} placeholder="es. PRS-B1" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Matricola</Label>
                <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="es. SN-12345" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Note</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Note..." />
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}