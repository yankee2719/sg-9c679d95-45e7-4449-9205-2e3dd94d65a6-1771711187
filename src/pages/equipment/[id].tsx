import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Edit3, Factory, Building2, FileText, Upload, ExternalLink, Trash2 } from "lucide-react";

type MachineRow = {
  id: string;
  name: string;
  internal_code: string | null;
  serial_number: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  position: string | null;
  lifecycle_state: string | null;
  qr_code_token: string | null;
  plant_id: string | null;
  production_line_id: string | null;
  organization_id: string | null;
  photo_url: string | null;
  is_archived: boolean | null;
};

type OrgRow = { id: string; name: string; type: string | null };
type PlantRow = { id: string; name: string | null; code: string | null };
type LineRow = { id: string; name: string | null; code: string | null };

type AssignmentRow = {
  id: string;
  customer_org_id: string;
  manufacturer_org_id: string;
  is_active: boolean;
  assigned_at: string;
  customer?: { id: string; name: string } | null;
};

type DocumentRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  language: string | null;
  is_mandatory: boolean;
  created_at: string;
};

function niceDate(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function EquipmentDetailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const id = router.query.id as string | undefined;

  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState("technician");
  const [orgType, setOrgType] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const isManufacturer = useMemo(() => orgType === "manufacturer", [orgType]);
  const canEdit = useMemo(() => userRole === "admin" || userRole === "supervisor", [userRole]);

  const [machine, setMachine] = useState<MachineRow | null>(null);
  const [customerAssigned, setCustomerAssigned] = useState<AssignmentRow | null>(null);
  const [plant, setPlant] = useState<PlantRow | null>(null);
  const [line, setLine] = useState<LineRow | null>(null);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docLang, setDocLang] = useState("it");
  const [docMandatory, setDocMandatory] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await getUserContext();
        if (!ctx) {
          router.push("/login");
          return;
        }
        setUserRole(ctx.role ?? "technician");
        setOrgType(ctx.orgType ?? null);
        setOrgId(ctx.orgId ?? null);

        if (!id) return;

        const { data: m, error: mErr } = await supabase
          .from("machines")
          .select("*")
          .eq("id", id)
          .single();
        if (mErr) throw mErr;
        setMachine(m as any);

        // CUSTOMER VIEW: plant + line
        if ((ctx.orgType ?? null) !== "manufacturer") {
          if ((m as any)?.plant_id) {
            const { data: p } = await supabase
              .from("plants")
              .select("id,name,code")
              .eq("id", (m as any).plant_id)
              .maybeSingle();
            setPlant((p as any) ?? null);
          }
          if ((m as any)?.production_line_id) {
            const { data: l } = await supabase
              .from("production_lines")
              .select("id,name,code")
              .eq("id", (m as any).production_line_id)
              .maybeSingle();
            setLine((l as any) ?? null);
          }
        }

        // MANUFACTURER VIEW: assignment -> customer
        if ((ctx.orgType ?? null) === "manufacturer" && ctx.orgId) {
          const { data: asg } = await supabase
            .from("machine_assignments")
            .select("id,customer_org_id,manufacturer_org_id,is_active,assigned_at, customer:organizations!machine_assignments_customer_org_id_fkey(id,name)")
            .eq("machine_id", id)
            .eq("manufacturer_org_id", ctx.orgId)
            .eq("is_active", true)
            .order("assigned_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          setCustomerAssigned((asg as any) ?? null);
        }

        // Documents (machine-scoped)
        const { data: docs, error: dErr } = await supabase
          .from("documents")
          .select("id,title,description,category,language,is_mandatory,created_at")
          .eq("machine_id", id)
          .eq("is_archived", false)
          .order("created_at", { ascending: false });

        if (dErr) console.error("documents load:", dErr);
        setDocuments((docs as any) ?? []);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Errore", description: e?.message ?? "Errore caricamento", variant: "destructive" });
        router.push("/equipment");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, router]);

  const lifecycleBadge = (state: string | null) => {
    const map: Record<string, { label: string; cls: string }> = {
      active: { label: "Attivo", cls: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" },
      commissioned: { label: "Attivo", cls: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" },
      inactive: { label: "Inattivo", cls: "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30" },
      under_maintenance: { label: "Manutenzione", cls: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30" },
      decommissioned: { label: "Dismesso", cls: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30" },
    };
    const v = map[state ?? "active"] ?? map.active;
    return <Badge className={`border ${v.cls}`}>{v.label}</Badge>;
  };

  const openQrTarget = () => {
    if (!machine) return;
    const target = machine.qr_code_token?.trim();
    if (target) window.open(target, "_blank");
    else router.push(`/equipment/${machine.id}`);
  };

  const handleUpload = async (file: File) => {
    if (!machine || !orgId) return;
    if (!docTitle.trim()) {
      toast({ title: "Errore", description: "Inserisci un titolo documento", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Storage path: org/machine/uuid_filename
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const objectPath = `${orgId}/machines/${machine.id}/${crypto.randomUUID()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(objectPath, file, { upsert: false, contentType: file.type });

      if (upErr) throw upErr;

      // IMPORTANT: bucket "documents" è private => usiamo signed URL per aprire
      // Salviamo solo metadata su tabella documents (senza file_path perché nel tuo schema non c'è)
      // Se vuoi tracciare anche lo storage path, va aggiunta colonna file_path in documents oppure usare document_versions.
      const { data: doc, error: insErr } = await supabase
        .from("documents")
        .insert({
          organization_id: orgId,
          machine_id: machine.id,
          title: docTitle.trim(),
          description: docDesc.trim() || null,
          language: docLang || "it",
          is_mandatory: docMandatory,
          category: "other",
          tags: [],
        })
        .select("id,title,description,category,language,is_mandatory,created_at")
        .single();

      if (insErr) throw insErr;

      setDocuments((prev) => [doc as any, ...prev]);
      setDocTitle("");
      setDocDesc("");
      setDocLang("it");
      setDocMandatory(false);

      toast({ title: "OK", description: "Documento caricato e registrato" });

      // Nota: senza salvare objectPath nel DB, il file resta nello storage ma non sappiamo dove.
      // Nel prossimo step lo sistemiamo bene con document_versions (è la strada giusta).
      toast({
        title: "Nota importante",
        description: "Per collegare davvero il file al record serve salvare lo storage path (document_versions). Te lo finisco nel prossimo step.",
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Errore upload", description: e?.message ?? "Errore", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("Archiviare questo documento?")) return;
    try {
      const { error } = await supabase.from("documents").update({ is_archived: true }).eq("id", docId);
      if (error) throw error;
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast({ title: "OK", description: "Documento archiviato" });
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message ?? "Errore", variant: "destructive" });
    }
  };

  if (loading) return null;
  if (!machine) return null;

  return (
    <MainLayout userRole={userRole as any}>
      <SEO title={`${machine.name} - MACHINA`} />

      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openQrTarget}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Apri link QR
            </Button>

            {canEdit && (
              <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push(`/equipment/edit/${machine.id}`)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Modifica
              </Button>
            )}
          </div>
        </div>

        {/* Header */}
        <Card className="rounded-2xl border-0 bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <CardTitle className="text-2xl text-foreground truncate">{machine.name}</CardTitle>
                <CardDescription className="text-muted-foreground font-mono">
                  {machine.internal_code ?? "—"} {machine.serial_number ? `• SN ${machine.serial_number}` : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {lifecycleBadge(machine.lifecycle_state)}
                {machine.category && <Badge variant="outline">{machine.category}</Badge>}
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Manufacturer vs Customer info */}
            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                {isManufacturer ? <Factory className="w-4 h-4 text-purple-400" /> : <Building2 className="w-4 h-4 text-blue-400" />}
                <div className="font-semibold text-foreground">{isManufacturer ? "Cliente assegnato" : "Stabilimento / Linea"}</div>
              </div>

              {isManufacturer ? (
                <div className="text-sm">
                  {customerAssigned?.customer?.name ? (
                    <>
                      <div className="text-foreground font-medium">{customerAssigned.customer.name}</div>
                      <div className="text-xs text-muted-foreground">Assegnata: {niceDate(customerAssigned.assigned_at)}</div>
                      <div className="mt-2">
                        <Link href={`/customers/${customerAssigned.customer.id}`} className="text-[#FF6B35] underline text-sm">
                          Apri scheda cliente
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Nessun cliente assegnato.</div>
                  )}
                </div>
              ) : (
                <div className="text-sm">
                  <div className="text-foreground font-medium">{plant?.name ?? "—"}</div>
                  <div className="text-muted-foreground">{line?.name ?? "—"}</div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <div className="font-semibold text-foreground mb-2">Info</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Marca: <span className="text-foreground">{machine.brand ?? "—"}</span></div>
                <div>Modello: <span className="text-foreground">{machine.model ?? "—"}</span></div>
                <div>Posizione: <span className="text-foreground">{machine.position ?? "—"}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <div className="font-semibold text-foreground mb-2">QR</div>
              <div className="text-sm text-muted-foreground">
                <div className="break-all">{machine.qr_code_token?.trim() ? machine.qr_code_token : "— (usa link scheda)"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="rounded-2xl border-0 bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Documentazione tecnica
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Carica e gestisci manuali, schemi, certificati, ecc.
                </CardDescription>
              </div>

              {canEdit && (
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.currentTarget.value = "";
                    }}
                    disabled={uploading}
                  />
                  <Button type="button" className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" disabled={uploading}>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Upload..." : "Carica file"}
                  </Button>
                </label>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {canEdit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/10">
                <div className="space-y-2">
                  <Label>Titolo *</Label>
                  <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="es. Manuale uso e manutenzione" />
                </div>
                <div className="space-y-2">
                  <Label>Lingua</Label>
                  <Input value={docLang} onChange={(e) => setDocLang(e.target.value)} placeholder="it / en / es..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Descrizione</Label>
                  <Input value={docDesc} onChange={(e) => setDocDesc(e.target.value)} placeholder="Descrizione breve..." />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="mandatory"
                    type="checkbox"
                    checked={docMandatory}
                    onChange={(e) => setDocMandatory(e.target.checked)}
                  />
                  <Label htmlFor="mandatory">Obbligatorio</Label>
                </div>
                <div className="text-xs text-muted-foreground md:col-span-2">
                  Nota: nel tuo schema attuale manca la colonna “file_path” in documents → nel prossimo step lo colleghiamo correttamente via <b>document_versions</b>.
                </div>
              </div>
            )}

            {documents.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nessun documento caricato.</div>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-background">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{d.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.category} • {d.language ?? "—"} • {niceDate(d.created_at)} {d.is_mandatory ? "• OBBLIGATORIO" : ""}
                      </div>
                      {d.description && <div className="text-sm text-muted-foreground line-clamp-2">{d.description}</div>}
                    </div>

                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDeleteDoc(d.id)}
                        title="Archivia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}