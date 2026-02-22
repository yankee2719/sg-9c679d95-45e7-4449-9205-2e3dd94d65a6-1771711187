import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext, UserContext } from "@/lib/supabaseHelpers";
import { getPermissions } from "@/hooks/usePermissions";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { DocumentUpload } from "@/components/Equipment/DocumentUpload";
import { MachinePhotoUpload } from "@/components/Equipment/MachinePhotoUpload";
import { MachineEventTimeline } from "@/components/MachineEventTimeline";
import {
    exportMachinePassport,
    exportTechnicalSheet,
    exportMaintenanceReport,
    type MachineData,
    type MaintenanceReportData,
} from "@/services/pdfExportService";
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
    Pencil,
    Save,
    X,
    Factory,
    Lock,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Loader2,
    History,
    Download,
    Camera,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface Machine {
    id: string;
    name: string;
    internal_code: string;
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
    qr_code_token: string | null;
    photo_url: string | null;
    year_of_manufacture: number | null;
    organization_id: string | null;
}

interface MaintenancePlan {
    id: string;
    title: string;
    description: string | null;
    frequency_type: string | null;
    frequency_value: number | null;
    next_due_date: string | null;
    priority: string | null;
    is_active: boolean;
}

interface WorkOrder {
    id: string;
    title: string;
    wo_number: string | null;
    status: string;
    priority: string;
    wo_type: string | null;
    work_type: string | null;
    scheduled_start: string | null;
    scheduled_date: string | null;
    created_at: string;
}

// =============================================================================
// CONFIGS
// =============================================================================

const statusConfig: Record<string, { label: string; className: string }> = {
    active: {
        label: "Attivo",
        className:
            "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
    },
    commissioned: {
        label: "Attivo",
        className:
            "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
    },
    inactive: {
        label: "Inattivo",
        className:
            "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
    },
    under_maintenance: {
        label: "In Manutenzione",
        className:
            "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30",
    },
    decommissioned: {
        label: "Dismesso",
        className:
            "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30",
    },
};

const woStatusConfig: Record<string, { label: string; color: string }> = {
    draft: {
        label: "Bozza",
        color:
            "bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-300",
    },
    scheduled: {
        label: "Programmato",
        color:
            "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-300",
    },
    assigned: {
        label: "Assegnato",
        color:
            "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-300",
    },
    in_progress: {
        label: "In Corso",
        color:
            "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300",
    },
    paused: {
        label: "In Pausa",
        color:
            "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-300",
    },
    completed: {
        label: "Completato",
        color:
            "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-300",
    },
    approved: {
        label: "Approvato",
        color:
            "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300",
    },
    cancelled: {
        label: "Annullato",
        color:
            "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-300",
    },
};

const priorityConfig: Record<
    string,
    { label: string; color: string; border: string }
> = {
    critical: {
        label: "Critica",
        color:
            "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300",
        border: "border-l-red-600",
    },
    high: {
        label: "Alta",
        color:
            "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300",
        border: "border-l-red-500",
    },
    medium: {
        label: "Media",
        color:
            "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300",
        border: "border-l-amber-500",
    },
    low: {
        label: "Bassa",
        color:
            "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300",
        border: "border-l-green-500",
    },
};

const getFrequencyLabel = (type: string | null, value: number | null) => {
    if (!type) return null;
    const labels: Record<string, string> = {
        daily: "Giornaliera",
        weekly: "Settimanale",
        biweekly: "Bisettimanale",
        monthly: "Mensile",
        quarterly: "Trimestrale",
        semiannual: "Semestrale",
        annual: "Annuale",
        yearly: "Annuale",
    };
    const label = labels[type] || type;
    return value && value > 1 ? `${label} (ogni ${value})` : label;
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();
    const { id, tab } = router.query;

    const [machine, setMachine] = useState < Machine | null > (null);
    const [plantName, setPlantName] = useState < string | null > (null);
    const [manufacturerName, setManufacturerName] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);
    const [ctx, setCtx] = useState < UserContext | null > (null);
    const [editingQR, setEditingQR] = useState(false);
    const [qrUrlDraft, setQrUrlDraft] = useState("");
    const [savingQR, setSavingQR] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    // Hydration safety: compute browser-only values after mount
    const [mounted, setMounted] = useState(false);
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined") {
            setOrigin(window.location.origin);
        }
    }, []);

    // Maintenance data
    const [plans, setPlans] = useState < MaintenancePlan[] > ([]);
    const [workOrders, setWorkOrders] = useState < WorkOrder[] > ([]);
    const [loadingMaint, setLoadingMaint] = useState(false);

    // Permissions
    const perms = ctx
        ? getPermissions({ role: ctx.role, orgType: ctx.orgType as any })
        : null;
    const isAssigned = machine && ctx ? machine.organization_id !== ctx.orgId : false;
    const canEdit = perms
        ? perms.canEditIfOwner(machine?.organization_id || null, ctx?.orgId || null)
        : false;
    const isAdmin = perms?.isAdminOrSupervisor ?? false;

    // Handle tab from URL query
    useEffect(() => {
        if (tab && typeof tab === "string") setActiveTab(tab);
    }, [tab]);

    // =========================================================================
    // LOAD
    // =========================================================================

    useEffect(() => {
        if (id) loadAll(id as string);
    }, [id]);

    async function loadAll(machineId: string) {
        try {
            const userCtx = await getUserContext();
            if (userCtx) setCtx(userCtx);

            const { data, error } = await supabase
                .from("machines")
                .select("*")
                .eq("id", machineId)
                .single();
            if (error) throw error;

            setMachine(data);
            setQrUrlDraft(data.qr_code_token || "");

            if (data.plant_id) {
                const { data: plant } = await supabase
                    .from("plants")
                    .select("name")
                    .eq("id", data.plant_id)
                    .single();
                if (plant) setPlantName(plant.name);
            }

            if (userCtx && data.organization_id && data.organization_id !== userCtx.orgId) {
                const { data: mfrOrg } = await supabase
                    .from("organizations")
                    .select("name")
                    .eq("id", data.organization_id)
                    .single();
                if (mfrOrg) setManufacturerName(mfrOrg.name);
            }

            await loadMaintenanceData(machineId);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadMaintenanceData(machineId: string) {
        setLoadingMaint(true);
        try {
            const [plansRes, woRes] = await Promise.all([
                supabase
                    .from("maintenance_plans")
                    .select(
                        "id, title, description, frequency_type, frequency_value, next_due_date, priority, is_active"
                    )
                    .eq("machine_id", machineId)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("work_orders")
                    .select(
                        "id, title, wo_number, status, priority, wo_type, work_type, scheduled_start, scheduled_date, created_at"
                    )
                    .eq("machine_id", machineId)
                    .order("created_at", { ascending: false }),
            ]);

            if (plansRes.error) throw plansRes.error;
            if (woRes.error) throw woRes.error;

            setPlans((plansRes.data as any) || []);
            setWorkOrders((woRes.data as any) || []);
        } catch (err) {
            console.error("Error loading maintenance data:", err);
        } finally {
            setLoadingMaint(false);
        }
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================

    async function saveQrToken() {
        if (!machine) return;
        setSavingQR(true);
        try {
            const { error } = await supabase
                .from("machines")
                .update({ qr_code_token: qrUrlDraft || null })
                .eq("id", machine.id);
            if (error) throw error;

            setMachine((prev) => (prev ? { ...prev, qr_code_token: qrUrlDraft || null } : prev));
            setEditingQR(false);

            toast({
                title: t("common.success") || "Salvato",
                description: "QR token aggiornato correttamente.",
            });
        } catch (err) {
            console.error(err);
            toast({
                title: t("common.error") || "Errore",
                description: "Impossibile salvare il QR token.",
                variant: "destructive",
            });
        } finally {
            setSavingQR(false);
        }
    }

    async function handleExportMachinePassport() {
        if (!machine) return;
        try {
            const payload: MachineData = {
                machine: machine as any,
                plantName: plantName || null,
                manufacturerName: manufacturerName || null,
            };
            await exportMachinePassport(payload);
        } catch (err) {
            console.error(err);
            toast({
                title: t("common.error") || "Errore",
                description: "Impossibile esportare il Machine Passport.",
                variant: "destructive",
            });
        }
    }

    async function handleExportTechnicalSheet() {
        if (!machine) return;
        try {
            const payload: MachineData = {
                machine: machine as any,
                plantName: plantName || null,
                manufacturerName: manufacturerName || null,
            };
            await exportTechnicalSheet(payload);
        } catch (err) {
            console.error(err);
            toast({
                title: t("common.error") || "Errore",
                description: "Impossibile esportare la Scheda Tecnica.",
                variant: "destructive",
            });
        }
    }

    async function handleExportMaintenanceReport() {
        if (!machine) return;
        try {
            const payload: MaintenanceReportData = {
                machine: machine as any,
                plans: plans as any,
                workOrders: workOrders as any,
                plantName: plantName || null,
                manufacturerName: manufacturerName || null,
            };
            await exportMaintenanceReport(payload);
        } catch (err) {
            console.error(err);
            toast({
                title: t("common.error") || "Errore",
                description: "Impossibile esportare il Report Manutenzione.",
                variant: "destructive",
            });
        }
    }

    // =========================================================================
    // RENDER
    // =========================================================================

    if (loading) {
        return (
            <MainLayout>
                <div className="container mx-auto p-6">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Caricamento...</span>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!machine) {
        return (
            <MainLayout>
                <div className="container mx-auto p-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Macchina non trovata</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" onClick={() => router.push("/equipment")}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Torna all’elenco
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    const status =
        statusConfig[machine.lifecycle_state || "active"] || statusConfig.active;

    // SSR-safe: origin is empty on first render (server + first client render), then set after mount
    const qrValue = machine.qr_code_token || (origin ? `${origin}/equipment/${machine.id}` : "");

    const specsText = machine.specifications
        ? typeof machine.specifications === "string"
            ? machine.specifications
            : machine.specifications?.text || JSON.stringify(machine.specifications)
        : null;

    const activePlans = plans.filter((p) => p.is_active);
    const overdueCount = mounted
        ? activePlans.filter(
            (p) => p.next_due_date && new Date(p.next_due_date) < new Date()
        ).length
        : 0;

    const activeWOs = workOrders.filter(
        (wo) => !["completed", "approved", "cancelled"].includes(wo.status)
    );

    return (
        <MainLayout>
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Button
                            variant="ghost"
                            className="px-0"
                            onClick={() => router.push("/equipment")}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Indietro
                        </Button>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold">{machine.name}</h1>
                            <Badge className={status.className}>{status.label}</Badge>
                            {isAssigned && (
                                <Badge
                                    variant="outline"
                                    className="border-amber-300 text-amber-700 dark:text-amber-300"
                                >
                                    <Lock className="h-3 w-3 mr-1" />
                                    Assegnata
                                </Badge>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                <span>{machine.internal_code}</span>
                            </div>

                            {plantName && (
                                <div className="flex items-center gap-2">
                                    <Factory className="h-4 w-4" />
                                    <span>{plantName}</span>
                                </div>
                            )}

                            {machine.position && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{machine.position}</span>
                                </div>
                            )}

                            {machine.serial_number && (
                                <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4" />
                                    <span>SN: {machine.serial_number}</span>
                                </div>
                            )}

                            {machine.commissioned_at && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        Avviata:{" "}
                                        {new Date(machine.commissioned_at).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {!!manufacturerName && (
                            <div className="text-sm text-muted-foreground">
                                Produttore: <span className="font-medium">{manufacturerName}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Button variant="outline" onClick={handleExportMachinePassport}>
                            <Download className="h-4 w-4 mr-2" />
                            Machine Passport
                        </Button>
                        <Button variant="outline" onClick={handleExportTechnicalSheet}>
                            <FileText className="h-4 w-4 mr-2" />
                            Scheda Tecnica
                        </Button>
                        <Button variant="outline" onClick={handleExportMaintenanceReport}>
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Report Manutenzione
                        </Button>

                        {canEdit && (
                            <Button
                                onClick={() => router.push(`/equipment/edit/${machine.id}`)}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Modifica
                            </Button>
                        )}
                    </div>
                </div>

                {/* KPI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-blue-600">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Piani attivi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-semibold">
                            {activePlans.length}
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Scadenze (overdue)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-semibold">
                            {overdueCount}
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-600">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Work Orders attivi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-2xl font-semibold">
                            {activeWOs.length}
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start flex-wrap">
                        <TabsTrigger value="general">
                            <Building2 className="h-4 w-4 mr-2" />
                            Generale
                        </TabsTrigger>
                        <TabsTrigger value="qr">
                            <QrCode className="h-4 w-4 mr-2" />
                            QR
                        </TabsTrigger>
                        <TabsTrigger value="documents">
                            <FileText className="h-4 w-4 mr-2" />
                            Documenti
                        </TabsTrigger>
                        <TabsTrigger value="maintenance">
                            <Wrench className="h-4 w-4 mr-2" />
                            Manutenzione
                        </TabsTrigger>
                        <TabsTrigger value="history">
                            <History className="h-4 w-4 mr-2" />
                            Storico
                        </TabsTrigger>
                        <TabsTrigger value="photo">
                            <Camera className="h-4 w-4 mr-2" />
                            Foto
                        </TabsTrigger>
                    </TabsList>

                    {/* GENERAL */}
                    <TabsContent value="general" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dettagli</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-muted-foreground">Brand</div>
                                        <div className="font-medium">{machine.brand || "-"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Model</div>
                                        <div className="font-medium">{machine.model || "-"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            Categoria
                                        </div>
                                        <div className="font-medium">{machine.category || "-"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Anno</div>
                                        <div className="font-medium">
                                            {machine.year_of_manufacture || "-"}
                                        </div>
                                    </div>
                                </div>

                                {specsText && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            Specifiche
                                        </div>
                                        <div className="whitespace-pre-wrap text-sm">{specsText}</div>
                                    </div>
                                )}

                                {machine.notes && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">Note</div>
                                        <div className="whitespace-pre-wrap text-sm">
                                            {machine.notes}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* QR */}
                    <TabsContent value="qr" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>QR Code</CardTitle>
                                {canEdit && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setEditingQR((v) => !v)}
                                    >
                                        {editingQR ? (
                                            <>
                                                <X className="h-4 w-4 mr-2" />
                                                Annulla
                                            </>
                                        ) : (
                                            <>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Modifica
                                            </>
                                        )}
                                    </Button>
                                )}
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="shrink-0">
                                        <QRCodeGenerator value={qrValue} />
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div className="text-sm text-muted-foreground">
                                            Valore QR (URL/Token)
                                        </div>

                                        {!editingQR ? (
                                            <div className="rounded-md border p-3 text-sm break-all">
                                                {machine.qr_code_token || qrValue}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <Input
                                                    value={qrUrlDraft}
                                                    onChange={(e) => setQrUrlDraft(e.target.value)}
                                                    placeholder="Inserisci token o URL..."
                                                />
                                                <Button onClick={saveQrToken} disabled={savingQR}>
                                                    {savingQR ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Salvataggio...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="h-4 w-4 mr-2" />
                                                            Salva
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* DOCUMENTS */}
                    <TabsContent value="documents" className="space-y-4">
                        <DocumentUpload machineId={machine.id} />
                    </TabsContent>

                    {/* MAINTENANCE */}
                    <TabsContent value="maintenance" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Piani di manutenzione</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingMaint ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Caricamento...</span>
                                    </div>
                                ) : activePlans.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                        Nessun piano attivo.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activePlans.map((p) => (
                                            <div
                                                key={p.id}
                                                className={`rounded-md border p-4 border-l-4 ${priorityConfig[p.priority || "low"]?.border ||
                                                    "border-l-slate-400"
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="font-medium">{p.title}</div>
                                                        {p.description && (
                                                            <div className="text-sm text-muted-foreground">
                                                                {p.description}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-muted-foreground">
                                                            {getFrequencyLabel(p.frequency_type, p.frequency_value) ||
                                                                "-"}
                                                            {p.next_due_date
                                                                ? ` • Next due: ${new Date(
                                                                    p.next_due_date
                                                                ).toLocaleDateString()}`
                                                                : ""}
                                                        </div>
                                                    </div>

                                                    <Badge
                                                        className={
                                                            priorityConfig[p.priority || "low"]?.color ||
                                                            "bg-slate-100 text-slate-700"
                                                        }
                                                    >
                                                        {priorityConfig[p.priority || "low"]?.label ||
                                                            p.priority ||
                                                            "—"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Work Orders</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingMaint ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Caricamento...</span>
                                    </div>
                                ) : activeWOs.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                        Nessun work order attivo.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activeWOs.map((wo) => (
                                            <div key={wo.id} className="rounded-md border p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="font-medium">{wo.title}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {wo.wo_number ? `WO: ${wo.wo_number} • ` : ""}
                                                            {wo.scheduled_date
                                                                ? `Scheduled: ${new Date(
                                                                    wo.scheduled_date
                                                                ).toLocaleDateString()} • `
                                                                : ""}
                                                            {wo.created_at
                                                                ? `Created: ${new Date(
                                                                    wo.created_at
                                                                ).toLocaleDateString()}`
                                                                : ""}
                                                        </div>
                                                    </div>

                                                    <Badge className={woStatusConfig[wo.status]?.color || ""}>
                                                        {woStatusConfig[wo.status]?.label || wo.status}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.push(`/work-orders/${wo.id}`)}
                                                    >
                                                        <ChevronRight className="h-4 w-4 mr-2" />
                                                        Apri
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* HISTORY */}
                    <TabsContent value="history" className="space-y-4">
                        <MachineEventTimeline machineId={machine.id} />
                    </TabsContent>

                    {/* PHOTO */}
                    <TabsContent value="photo" className="space-y-4">
                        <MachinePhotoUpload machineId={machine.id} currentUrl={machine.photo_url} />
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
}