import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { MachinePhotoUpload } from "@/components/Equipment/MachinePhotoUpload";
import { MachineEventTimeline } from "@/components/MachineEventTimeline";
import {
  ArrowLeft,
  Wrench,
  Building2,
  MapPin,
  Calendar,
  Hash,
  Tag,
  QrCode,
  FileText,
  ClipboardList,
  Save,
  X,
  Factory,
  Lock,
  Loader2,
  History,
  Camera,
  Layers3,
  Pencil,
} from "lucide-react";

type OrgType = "manufacturer" | "customer";

interface Machine {
  id: string;
  name: string;
  internal_code: string | null;
  serial_number: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  lifecycle_state: string | null;
  position: string | null;
  commissioned_at: string | null;
  specifications: any;
  notes: string | null;
  plant_id: string | null;
  production_line_id: string | null;
  qr_code_token: string | null;
  photo_url: string | null;
  year_of_manufacture: number | null;
  organization_id: string | null;
  is_archived: boolean | null;
}

interface PlantRow {
  id: string;
  name: string | null;
  code: string | null;
}

interface ProductionLineRow {
  id: string;
  name: string | null;
  code: string | null;
  plant_id: string | null;
}

const lifecycleOptions = [
  { value: "active", label: "Attiva" },
  { value: "commissioning", label: "Commissioning" },
  { value: "maintenance", label: "In manutenzione" },
  { value: "inactive", label: "Inattiva" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: "Attivo",
    className:
      "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
  },
  commissioning: {
    label: "Commissioning",
    className:
      "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30",
  },
  maintenance: {
    label: "In Manutenzione",
    className:
      "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30",
  },
  inactive: {
    label: "Inattivo",
    className:
      "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
  },
};

function InfoRow({
  icon,
  label,
  value,
  fallback = "—",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  fallback?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>
        {value || fallback}
      </span>
    </div>
  );
}

export default function EditEquipmentPage() {
  const router = useRouter();
  const { id, tab } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingQR, setSavingQR] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const [userRole, setUserRole] = useState("technician");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgType, setOrgType] = useState<OrgType | null>(null);

  const [machine, setMachine] = useState<Machine | null>(null);
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [lines, setLines] = useState<ProductionLineRow[]>([]);
  const [manufacturerName, setManufacturerName] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");
  const [position, setPosition] = useState("");
  const [commissionedAt, setCommissionedAt] = useState("");
  const [yearOfManufacture, setYearOfManufacture] = useState("");
  const [notes, setNotes] = useState("");
  const [specificationsText, setSpecificationsText] = useState("");
  const [plantId, setPlantId] = useState("");
  const [productionLineId, setProductionLineId] = useState("");
  const [lifecycleState, setLifecycleState] = useState("active");
  const [editingQR, setEditingQR] = useState(false);
  const [qrUrlDraft, setQrUrlDraft] = useState("");

  useEffect(() => {
    if (tab && typeof tab === "string") setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    const load = async () => {
      try {
        const ctx = await getUserContext();
        if (!ctx?.orgId || !ctx?.orgType) return;

        setUserRole(ctx.role ?? "technician");
        setOrgId(ctx.orgId);
        setOrgType(ctx.orgType as OrgType);

        const { data: machineRow, error: machineError } = await supabase
          .from("machines")
          .select("*")
          .eq("id", id)
          .single();

        if (machineError) throw machineError;
        setMachine(machineRow as Machine);

        const currentMachine = machineRow as Machine;

        setName(currentMachine.name ?? "");
        setInternalCode(currentMachine.internal_code ?? "");
        setSerialNumber(currentMachine.serial_number ?? "");
        setBrand(currentMachine.brand ?? "");
        setModel(currentMachine.model ?? "");
        setCategory(currentMachine.category ?? "");
        setPosition(currentMachine.position ?? "");
        setCommissionedAt(currentMachine.commissioned_at ? String(currentMachine.commissioned_at).slice(0, 10) : "");
        setYearOfManufacture(currentMachine.year_of_manufacture ? String(currentMachine.year_of_manufacture) : "");
        setNotes(currentMachine.notes ?? "");
        setPlantId(currentMachine.plant_id ?? "");
        setProductionLineId(currentMachine.production_line_id ?? "");
        setLifecycleState(currentMachine.lifecycle_state ?? "active");
        setQrUrlDraft(currentMachine.qr_code_token ?? "");
        setSpecificationsText(
          currentMachine.specifications
            ? typeof currentMachine.specifications === "string"
              ? currentMachine.specifications
              : currentMachine.specifications?.text || JSON.stringify(currentMachine.specifications)
            : ""
        );

        const [plantsRes, linesRes] = await Promise.all([
          supabase
            .from("plants")
            .select("id, name, code")
            .eq("organization_id", ctx.orgId)
            .eq("is_archived", false)
            .order("name", { ascending: true }),
          supabase
            .from("production_lines")
            .select("id, name, code, plant_id")
            .eq("organization_id", ctx.orgId)
            .eq("is_archived", false)
            .order("name", { ascending: true }),
        ]);

        if (plantsRes.error) throw plantsRes.error;
        if (linesRes.error) throw linesRes.error;

        setPlants((plantsRes.data ?? []) as PlantRow[]);
        setLines((linesRes.data ?? []) as ProductionLineRow[]);

        if (currentMachine.organization_id && currentMachine.organization_id !== ctx.orgId) {
          const { data: mfrOrg } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", currentMachine.organization_id)
            .single();

          if (mfrOrg) setManufacturerName(mfrOrg.name);
        }
      } catch (error) {
        console.error("Equipment edit load error:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const filteredLines = useMemo(() => {
    if (!plantId) return lines;
    return lines.filter((line) => line.plant_id === plantId);
  }, [lines, plantId]);

  const canEdit = useMemo(() => {
    if (!machine || !orgId) return false;
    const elevated = userRole === "admin" || userRole === "supervisor";
    if (orgType === "manufacturer") return elevated && machine.organization_id === orgId;
    if (orgType === "customer") return machine.organization_id === orgId && (elevated || userRole === "technician");
    return false;
  }, [machine, orgId, orgType, userRole]);

  const isAssigned = useMemo(() => {
    if (!machine || !orgId) return false;
    return machine.organization_id !== orgId;
  }, [machine, orgId]);

  const statusPreview = statusConfig[lifecycleState] ?? statusConfig.active;
  const selectedPlant = plants.find((p) => p.id === plantId);
  const selectedLine = lines.find((l) => l.id === productionLineId);
  const qrValue =
    qrUrlDraft ||
    (typeof window !== "undefined" && machine ? `${window.location.origin}/equipment/${machine.id}` : "");

  const handleSave = async () => {
    if (!machine || !canEdit || !name.trim()) return;

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        internal_code: internalCode.trim() || null,
        serial_number: serialNumber.trim() || null,
        brand: brand.trim() || null,
        model: model.trim() || null,
        category: category.trim() || null,
        position: position.trim() || null,
        commissioned_at: commissionedAt || null,
        year_of_manufacture: yearOfManufacture ? Number(yearOfManufacture) : null,
        notes: notes.trim() || null,
        lifecycle_state: lifecycleState || "active",
        specifications: specificationsText.trim() ? { text: specificationsText.trim() } : null,
      };

      if (orgType === "customer") {
        payload.plant_id = plantId || null;
        payload.production_line_id = productionLineId || null;
      }

      const { error } = await supabase.from("machines").update(payload).eq("id", machine.id);
      if (error) throw error;

      setMachine((prev) =>
        prev
          ? {
              ...prev,
              ...payload,
            }
          : prev
      );

      router.push(`/equipment/${machine.id}`);
    } catch (error) {
      console.error("Equipment save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQR = async () => {
    if (!machine || !canEdit) return;

    setSavingQR(true);
    try {
      const { error } = await supabase
        .from("machines")
        .update({ qr_code_token: qrUrlDraft.trim() || null })
        .eq("id", machine.id);

      if (error) throw error;

      setMachine((prev) =>
        prev
          ? {
              ...prev,
              qr_code_token: qrUrlDraft.trim() || null,
            }
          : prev
      );

      setEditingQR(false);
    } catch (error) {
      console.error("QR save error:", error);
    } finally {
      setSavingQR(false);
    }
  };

  if (loading) {
    return (
      <MainLayout userRole={userRole}>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!machine) {
    return (
      <MainLayout userRole={userRole}>
        <div className="container mx-auto py-6 text-center">
          <p className="text-red-400 text-lg">Macchina non trovata</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/equipment")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla lista
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userRole={userRole}>
      <SEO title={`Modifica ${machine.name} - MACHINA`} />

      <div className="container mx-auto py-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/equipment/${machine.id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
              <h1 className="text-2xl font-bold text-foreground">{name || machine.name}</h1>
              <p className="text-sm text-muted-foreground">{internalCode || machine.internal_code || "—"}</p>
            </div>

            <Badge className={statusPreview.className}>{statusPreview.label}</Badge>

            {isAssigned && (
              <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30 flex items-center gap-1">
                <Factory className="w-3 h-3" />
                {manufacturerName || "Costruttore"}
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/equipment/${machine.id}`)}>
              <X className="mr-2 h-4 w-4" />
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={!canEdit || saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </div>

        {isAssigned && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-100 dark:bg-purple-500/10 border border-purple-500/30">
            <Lock className="w-5 h-5 shrink-0 text-purple-400" />
            <div>
              <p className="text-foreground font-medium">
                Macchina fornita da {manufacturerName || "costruttore"}
              </p>
              <p className="text-muted-foreground text-sm">
                Se la macchina non è di tua proprietà, alcune modifiche potrebbero non essere consentite.
              </p>
            </div>
          </div>
        )}

        {!canEdit && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-100 dark:bg-amber-500/10 border border-amber-500/30">
            <Lock className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-foreground font-medium">Modifica non consentita</p>
              <p className="text-muted-foreground text-sm">
                Non hai permessi sufficienti per modificare questa macchina.
              </p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger value="general" className="gap-1.5">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Generale</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documenti</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-1.5">
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-4">
            <Card className="rounded-2xl border-0 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Foto Macchina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MachinePhotoUpload
                  machineId={machine.id}
                  currentPhotoUrl={machine.photo_url}
                  onPhotoChange={(url) => setMachine((prev) => (prev ? { ...prev, photo_url: url } : null))}
                  readonly={!canEdit}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary" />
                  Modifica Informazioni
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Nome macchina *</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Codice</label>
                    <Input value={internalCode} onChange={(e) => setInternalCode(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Categoria</label>
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Marca</label>
                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Modello</label>
                    <Input value={model} onChange={(e) => setModel(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">N. Serie</label>
                    <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Anno fabbricazione</label>
                    <Input
                      type="number"
                      value={yearOfManufacture}
                      onChange={(e) => setYearOfManufacture(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Data commissione</label>
                    <Input
                      type="date"
                      value={commissionedAt}
                      onChange={(e) => setCommissionedAt(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Stato lifecycle</label>
                    <select
                      value={lifecycleState}
                      onChange={(e) => setLifecycleState(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
                    >
                      {lifecycleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {orgType === "customer" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Stabilimento</label>
                        <select
                          value={plantId}
                          onChange={(e) => {
                            setPlantId(e.target.value);
                            setProductionLineId("");
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
                        >
                          <option value="">Non assegnato</option>
                          {plants.map((plant) => (
                            <option key={plant.id} value={plant.id}>
                              {plant.name ?? plant.code ?? "Stabilimento"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Linea</label>
                        <select
                          value={productionLineId}
                          onChange={(e) => setProductionLineId(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
                        >
                          <option value="">Non assegnata</option>
                          {filteredLines.map((line) => (
                            <option key={line.id} value={line.id}>
                              {line.name ?? line.code ?? "Linea"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Posizione</label>
                    <Input value={position} onChange={(e) => setPosition(e.target.value)} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Specifiche tecniche</label>
                    <textarea
                      value={specificationsText}
                      onChange={(e) => setSpecificationsText(e.target.value)}
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Note</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Riepilogo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={<Hash className="w-4 h-4" />} label="Codice" value={internalCode} />
                <InfoRow icon={<Tag className="w-4 h-4" />} label="Categoria" value={category} />
                <InfoRow icon={<Wrench className="w-4 h-4" />} label="Marca" value={brand} />
                <InfoRow icon={<FileText className="w-4 h-4" />} label="Modello" value={model} />
                <InfoRow icon={<Hash className="w-4 h-4" />} label="N. Serie" value={serialNumber} />
                <InfoRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Data Commissione"
                  value={commissionedAt ? new Date(commissionedAt).toLocaleDateString("it-IT") : null}
                />
                <InfoRow
                  icon={<Building2 className="w-4 h-4 text-blue-400" />}
                  label="Stabilimento"
                  value={selectedPlant?.name ?? selectedPlant?.code ?? null}
                  fallback="Non assegnato"
                />
                <InfoRow
                  icon={<Layers3 className="w-4 h-4 text-emerald-400" />}
                  label="Linea"
                  value={selectedLine?.name ?? selectedLine?.code ?? null}
                  fallback="Non assegnata"
                />
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Posizione" value={position} fallback="Non definita" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card className="rounded-2xl border-0 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentManager
                  machineId={machine.id}
                  machineOwnerOrgId={machine.organization_id}
                  currentOrgId={orgId}
                  currentOrgType={orgType}
                  currentUserRole={userRole}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card className="rounded-2xl border-0 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MachineEventTimeline machineId={machine.id} limit={50} showIntegrityCheck={userRole === "admin"} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qr" className="mt-4">
            <div className="max-w-md mx-auto">
              <Card className="rounded-2xl border-0 bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <QRCodeGenerator value={qrValue} size={220} />
                  </div>

                  {!editingQR ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">URL codificato</p>
                      <p className="text-sm text-foreground font-mono break-all bg-muted/50 rounded-lg p-2">
                        {machine.qr_code_token || (typeof window !== "undefined" ? `${window.location.origin}/equipment/${machine.id}` : "")}
                      </p>
                      {canEdit && (
                        <Button variant="outline" size="sm" onClick={() => setEditingQR(true)} className="w-full">
                          <Pencil className="w-3 h-3 mr-2" />
                          Modifica URL QR
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        value={qrUrlDraft}
                        onChange={(e) => setQrUrlDraft(e.target.value)}
                        placeholder="https://esempio.com/manuale.pdf"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveQR} disabled={!canEdit || savingQR} className="flex-1 bg-green-600 hover:bg-green-700">
                          {savingQR ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                          Salva
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingQR(false);
                            setQrUrlDraft(machine.qr_code_token ?? "");
                          }}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Annulla
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-xs text-blue-400 font-medium mb-1">💡 Suggerimento</p>
                    <p className="text-xs text-blue-300">
                      Puoi usare il link diretto alla scheda macchina oppure impostare un URL personalizzato.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}