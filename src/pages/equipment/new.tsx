import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    Factory,
    Lock,
    Loader2,
    History,
    Camera,
    Layers3,
} from "lucide-react";

type OrgType = "manufacturer" | "customer";

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

const statusPreviewConfig: Record<string, { label: string; className: string }> = {
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
        label:
            "In Manutenzione",
        className:
            "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30",
    },
    inactive: {
        label: "Inattivo",
        className:
            "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
    },
};

function DisabledPanel({ title, description }: { title: string; description: string }) {
    return (
        <Card className="rounded-2xl border-0 bg-card shadow-sm">
            <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                    <p className="text-foreground font-medium mb-2">Disponibile dopo il primo salvataggio</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

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

export default function NewEquipmentPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    const [userRole, setUserRole] = useState("technician");
    const [orgId, setOrgId] = useState<string | null>(null);
    const [orgType, setOrgType] = useState<OrgType | null>(null);

    const [plants, setPlants] = useState<PlantRow[]>([]);
    const [lines, setLines] = useState<ProductionLineRow[]>([]);

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

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId || !ctx?.orgType) return;

                setUserRole(ctx.role ?? "technician");
                setOrgId(ctx.orgId);
                setOrgType(ctx.orgType as OrgType);

                if (ctx.orgType === "customer") {
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
                }
            } catch (error) {
                console.error("Equipment new load error:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const filteredLines = useMemo(() => {
        if (!plantId) return lines;
        return lines.filter((line) => line.plant_id === plantId);
    }, [lines, plantId]);

    const pageTitle =
        orgType === "manufacturer" ? "Nuova Macchina Costruttore" : "Nuova Macchina";

    const pageSubtitle =
        orgType === "manufacturer"
            ? "Crea una nuova macchina nel catalogo del costruttore attivo."
            : "Crea una nuova macchina e collegala a stabilimento e linea del cliente finale.";

    const statusPreview =
        statusPreviewConfig[lifecycleState] ?? statusPreviewConfig.active;

    const canSave = !!orgId && !!name.trim();

    const qrPreviewValue =
        typeof window !== "undefined" ? `${window.location.origin}/equipment/[nuova-macchina]` : "/equipment/[nuova-macchina]";

    const selectedPlant = plants.find((p) => p.id === plantId);
    const machineCodePreview = internalCode.trim() || "AUTO";
    const machineNamePreview = name.trim() || "Nuova macchina";

    const handleSave = async () => {
        if (!orgId || !name.trim()) return;

        setSaving(true);
        try {
            const payload: Record<string, any> = {
                organization_id: orgId,
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
                is_archived: false,
                qr_code_token: null,
                photo_url: null,
                specifications: specificationsText.trim()
                    ? { text: specificationsText.trim() }
                    : null,
            };

            if (orgType === "customer") {
                payload.plant_id = plantId || null;
                payload.production_line_id = productionLineId || null;
            } else {
                payload.plant_id = null;
                payload.production_line_id = null;
            }

            const { data, error } = await supabase
                .from("machines")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            router.push(`/equipment/${(data as any).id}`);
        } catch (error) {
            console.error("Equipment save error:", error);
        } finally {
            setSaving(false);
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

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${pageTitle} - MACHINA`} />

                <div className="container mx-auto py-6 space-y-6 max-w-5xl">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.push("/equipment")}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>

                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{machineNamePreview}</h1>
                                <p className="text-sm text-muted-foreground">{machineCodePreview}</p>
                            </div>

                            <Badge className={statusPreview.className}>{statusPreview.label}</Badge>

                            {orgType === "manufacturer" ? (
                                <Badge className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/30 flex items-center gap-1">
                                    <Factory className="w-3 h-3" />
                                    Costruttore
                                </Badge>
                            ) : (
                                <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    Cliente finale
                                </Badge>
                            )}
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={!canSave || saving}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {saving ? "Salvataggio..." : "Salva"}
                        </Button>
                    </div>

                    <div
                        className={`flex items-center gap-3 p-4 rounded-xl border ${
                            orgType === "manufacturer"
                                ? "bg-orange-100 dark:bg-orange-500/10 border-orange-500/30"
                                : "bg-blue-100 dark:bg-blue-500/10 border-blue-500/30"
                        }`}
                    >
                        {orgType === "manufacturer" ? (
                            <Factory className="w-5 h-5 shrink-0 text-orange-500" />
                        ) : (
                            <Building2 className="w-5 h-5 shrink-0 text-blue-500" />
                        )}
                        <div>
                            <p className="text-foreground font-medium">
                                {orgType === "manufacturer"
                                    ? "Stai creando una macchina lato costruttore"
                                    : "Stai creando una macchina lato cliente finale"}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {orgType === "manufacturer"
                                    ? "La macchina entrerà nel catalogo del costruttore e potrà essere assegnata successivamente."
                                    : "La macchina verrà creata come macchina propria del cliente e potrà essere collegata a stabilimento e linea."}
                            </p>
                        </div>
                    </div>

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
                                    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                                        <p className="text-foreground font-medium mb-2">
                                            Foto disponibile dopo il primo salvataggio
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Salva la macchina per attivare upload e gestione immagine.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <Wrench className="w-5 h-5 text-primary" />
                                        Informazioni Generali
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium text-foreground">Nome macchina *</label>
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Es. Trituratore TSS 180"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Codice</label>
                                            <Input
                                                value={internalCode}
                                                onChange={(e) => setInternalCode(e.target.value)}
                                                placeholder="Es. MCH-001"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Categoria</label>
                                            <Input
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                placeholder="Es. Trituratore"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Marca</label>
                                            <Input
                                                value={brand}
                                                onChange={(e) => setBrand(e.target.value)}
                                                placeholder="Es. ITR / OMAR"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Modello</label>
                                            <Input
                                                value={model}
                                                onChange={(e) => setModel(e.target.value)}
                                                placeholder="Es. TSS 180"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">N. Serie</label>
                                            <Input
                                                value={serialNumber}
                                                onChange={(e) => setSerialNumber(e.target.value)}
                                                placeholder="Es. SN-2026-001"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Anno fabbricazione</label>
                                            <Input
                                                type="number"
                                                value={yearOfManufacture}
                                                onChange={(e) => setYearOfManufacture(e.target.value)}
                                                placeholder="Es. 2026"
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

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium text-foreground">Specifiche tecniche</label>
                                            <textarea
                                                value={specificationsText}
                                                onChange={(e) => setSpecificationsText(e.target.value)}
                                                rows={4}
                                                placeholder="Inserisci specifiche tecniche, configurazione, dati salienti..."
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium text-foreground">Note</label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={4}
                                                placeholder="Note generali..."
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-primary" />
                                        Ubicazione
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="grid gap-4 md:grid-cols-2">
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
                                            <Input
                                                value={position}
                                                onChange={(e) => setPosition(e.target.value)}
                                                placeholder="Es. Linea 1 lato nord"
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-muted/40 p-4 space-y-3">
                                        <InfoRow
                                            icon={<Building2 className="w-4 h-4 text-blue-400" />}
                                            label="Stabilimento"
                                            value={selectedPlant?.name ?? selectedPlant?.code ?? null}
                                            fallback="Non assegnato"
                                        />
                                        <InfoRow
                                            icon={<Layers3 className="w-4 h-4 text-emerald-400" />}
                                            label="Linea"
                                            value={
                                                filteredLines.find((l) => l.id === productionLineId)?.name ?? null
                                            }
                                            fallback="Non assegnata"
                                        />
                                        <InfoRow
                                            icon={<MapPin className="w-4 h-4" />}
                                            label="Posizione"
                                            value={position}
                                            fallback="Non definita"
                                        />
                                        <InfoRow
                                            icon={
                                                orgType === "manufacturer" ? (
                                                    <Factory className="w-4 h-4 text-orange-400" />
                                                ) : (
                                                    <Building2 className="w-4 h-4 text-blue-400" />
                                                )
                                            }
                                            label="Contesto"
                                            value={
                                                orgType === "manufacturer"
                                                    ? "Macchina costruttore"
                                                    : "Macchina cliente finale"
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-primary" />
                                        Anteprima scheda
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <InfoRow icon={<Hash className="w-4 h-4" />} label="Codice" value={internalCode} fallback="AUTO" />
                                    <InfoRow icon={<Tag className="w-4 h-4" />} label="Categoria" value={category} fallback="—" />
                                    <InfoRow icon={<Wrench className="w-4 h-4" />} label="Marca" value={brand} fallback="—" />
                                    <InfoRow icon={<FileText className="w-4 h-4" />} label="Modello" value={model} fallback="—" />
                                    <InfoRow icon={<Hash className="w-4 h-4" />} label="N. Serie" value={serialNumber} fallback="—" />
                                    <InfoRow icon={<Calendar className="w-4 h-4" />} label="Data Commissione" value={commissionedAt ? new Date(commissionedAt).toLocaleDateString("it-IT") : null} fallback="—" />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="documents" className="mt-4">
                            <DisabledPanel
                                title="Documenti"
                                description="Salva prima la macchina. Dopo il salvataggio potrai caricare manuali, dichiarazioni, schemi e altra documentazione."
                            />
                        </TabsContent>

                        <TabsContent value="timeline" className="mt-4">
                            <DisabledPanel
                                title="Timeline"
                                description="La cronologia eventi sarà disponibile dopo la creazione della macchina."
                            />
                        </TabsContent>

                        <TabsContent value="qr" className="mt-4">
                            <Card className="rounded-2xl border-0 bg-card shadow-sm max-w-md mx-auto">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <QrCode className="w-5 h-5 text-primary" />
                                        QR Code
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                                        <p className="text-foreground font-medium mb-2">QR attivabile dopo il salvataggio</p>
                                        <p className="text-sm text-muted-foreground break-all">{qrPreviewValue}</p>
                                    </div>

                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                        <p className="text-xs text-blue-400 font-medium mb-1">💡 Suggerimento</p>
                                        <p className="text-xs text-blue-300">
                                            Dopo il salvataggio potrai definire un URL personalizzato o usare il link diretto alla scheda macchina.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}