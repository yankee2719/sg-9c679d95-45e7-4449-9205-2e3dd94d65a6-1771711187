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
import { exportMachinePassport, exportTechnicalSheet, exportMaintenanceReport, type MachineData, type MaintenanceReportData } from "@/services/pdfExportService";
import {
    ArrowLeft, Wrench, Building2, MapPin, Calendar, Hash, Tag,
    QrCode, FileText, ClipboardList, Pencil, Save, X, Factory, Lock,
    ChevronRight, CheckCircle2, AlertCircle, Loader2, History, Download, Camera,
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
    active: { label: "Attivo", className: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" },
    commissioned: { label: "Attivo", className: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" },
    inactive: { label: "Inattivo", className: "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30" },
    under_maintenance: { label: "In Manutenzione", className: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30" },
    decommissioned: { label: "Dismesso", className: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30" },
};

const woStatusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Bozza", color: "bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-300" },
    scheduled: { label: "Programmato", color: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-300" },
    assigned: { label: "Assegnato", color: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-300" },
    in_progress: { label: "In Corso", color: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300" },
    paused: { label: "In Pausa", color: "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-300" },
    completed: { label: "Completato", color: "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-300" },
    approved: { label: "Approvato", color: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300" },
    cancelled: { label: "Annullato", color: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-300" },
};

const priorityConfig: Record<string, { label: string; color: string; border: string }> = {
    critical: { label: "Critica", color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300", border: "border-l-red-600" },
    high: { label: "Alta", color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300", border: "border-l-red-500" },
    medium: { label: "Media", color: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300", border: "border-l-amber-500" },
    low: { label: "Bassa", color: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300", border: "border-l-green-500" },
};

const getFrequencyLabel = (type: string | null, value: number | null) => {
    if (!type) return null;
    const labels: Record<string, string> = {
        daily: "Giornaliera", weekly: "Settimanale", biweekly: "Bisettimanale",
        monthly: "Mensile", quarterly: "Trimestrale", semiannual: "Semestrale",
        annual: "Annuale", yearly: "Annuale",
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

    const [machine, setMachine] = useState<Machine | null>(null);
    const [plantName, setPlantName] = useState<string | null>(null);
    const [manufacturerName, setManufacturerName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [ctx, setCtx] = useState<UserContext | null>(null);
    const [editingQR, setEditingQR] = useState(false);
    const [qrUrlDraft, setQrUrlDraft] = useState("");
    const [savingQR, setSavingQR] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

    // Maintenance data
    const [plans, setPlans] = useState<MaintenancePlan[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loadingMaint, setLoadingMaint] = useState(false);

    // Permissions
    const perms = ctx ? getPermissions({ role: ctx.role, orgType: ctx.orgType as any }) : null;
    const isAssigned = machine && ctx ? machine.organization_id !== ctx.orgId : false;
    const canEdit = perms ? perms.canEditIfOwner(machine?.organization_id || null, ctx?.orgId || null) : false;
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

            const { data, error } = await supabase.from("machines").select("*").eq("id", machineId).single();
            if (error) throw error;
            setMachine(data);
            setQrUrlDraft(data.qr_code_token || "");

            if (data.plant_id) {
                const { data: plant } = await supabase.from("plants").select("name").eq("id", data.plant_id).single();
                if (plant) setPlantName(plant.name);
            }

            if (userCtx && data.organization_id && data.organization_id !== userCtx.orgId) {
                const { data: mfrOrg } = await supabase.from("organizations").select("name").eq("id", data.organization_id).single();
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
                supabase.from("maintenance_plans").select("id, title, description, frequency_type, frequency_value, next_due_date, priority, is_active")
                    .eq("machine_id", machineId).order("next_due_date", { ascending: true, nullsFirst: false }),
                supabase.from("work_orders").select("id, title, wo_number, status, priority, wo_type, work_type, scheduled_start, scheduled_date, created_at")
                    .eq("machine_id", machineId).order("created_at", { ascending: false }),
            ]);
            if (plansRes.data) setPlans(plansRes.data);
            if (woRes.data) setWorkOrders(woRes.data);
        } catch (err) {
            console.error("Error loading maintenance:", err);
        } finally {
            setLoadingMaint(false);
        }
    }

    // =========================================================================
    // QR HANDLERS
    // =========================================================================

    const handleSaveQR = async () => {
        if (!machine) return;
        setSavingQR(true);
        try {
            const { error } = await supabase.from("machines")
                .update({ qr_code_token: qrUrlDraft.trim() || null })
                .eq("id", machine.id);
            if (error) throw error;
            setMachine({ ...machine, qr_code_token: qrUrlDraft.trim() || null });
            setEditingQR(false);
            toast({ title: "Salvato", description: "URL QR Code aggiornato" });
        } catch {
            toast({ title: "Errore", description: "Impossibile salvare", variant: "destructive" });
        } finally {
            setSavingQR(false);
        }
    };

    // =========================================================================
    // RENDER
    // =========================================================================

    if (loading) return <MainLayout><div className="container mx-auto py-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-64 bg-muted rounded" /></div></div></MainLayout>;

    if (!machine) return (
        <MainLayout>
            <div className="container mx-auto py-6 text-center">
                <p className="text-red-400 text-lg">Macchina non trovata</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/equipment")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Torna alla lista
                </Button>
            </div>
        </MainLayout>
    );

    const status = statusConfig[machine.lifecycle_state || "active"] || statusConfig.active;
    const qrValue = machine.qr_code_token || `${typeof window !== "undefined" ? window.location.origin : ""}/equipment/${machine.id}`;
    const specsText = machine.specifications
        ? (typeof machine.specifications === "string" ? machine.specifications : machine.specifications?.text || JSON.stringify(machine.specifications))
        : null;

    const activePlans = plans.filter(p => p.is_active);
    const overdueCount = activePlans.filter(p => p.next_due_date && new Date(p.next_due_date) < new Date()).length;
    const activeWOs = workOrders.filter(wo => !["completed", "approved", "cancelled"].includes(wo.status));

    return (
        <MainLayout>
            <div className="container mx-auto py-6 space-y-6 max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/equipment")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{machine.name}</h1>
                            <p className="text-sm text-muted-foreground">{machine.internal_code}</p>
                        </div>
                        <Badge className={status.className}>{status.label}</Badge>
                        {isAssigned && (
                            <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30 flex items-center gap-1">
                                <Factory className="w-3 h-3" /> {manufacturerName || "Costruttore"}
                            </Badge>
                        )}
                    </div>
                    {canEdit && (
                        <Button onClick={() => router.push(`/equipment/edit/${machine.id}`)} className="bg-blue-600 hover:bg-blue-700">
                            <Pencil className="mr-2 h-4 w-4" /> Modifica
                        </Button>
                    )}
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" title="Scheda Tecnica PDF" onClick={() => {
                            exportTechnicalSheet({ ...machine, plant_name: plantName, organization_name: manufacturerName } as MachineData);
                        }}>
                            <Download className="w-4 h-4 mr-1" /> Scheda
                        </Button>
                        <Button variant="outline" size="sm" title="Passaporto Macchina PDF" onClick={() => {
                            exportMachinePassport({ ...machine, plant_name: plantName, organization_name: manufacturerName } as MachineData);
                        }}>
                            <Download className="w-4 h-4 mr-1" /> Passaporto
                        </Button>
                        <Button variant="outline" size="sm" title="Report Manutenzione PDF" onClick={() => {
                            exportMaintenanceReport({
                                machine: { ...machine, plant_name: plantName, organization_name: manufacturerName } as MachineData,
                                plans: plans,
                                workOrders: workOrders.map(wo => ({ ...wo, assignee_name: null })),
                                checklistExecutions: [],
                            });
                        }}>
                            <Download className="w-4 h-4 mr-1" /> Report
                        </Button>
                    </div>
                </div>

                {isAssigned && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-100 dark:bg-purple-500/10 border border-purple-500/30">
                        <Lock className="w-5 h-5 text-purple-400 shrink-0" />
                        <div>
                            <p className="text-foreground font-medium">Macchina fornita da {manufacturerName || "costruttore"}</p>
                            <p className="text-muted-foreground text-sm">Documentazione e specifiche gestite dal costruttore. Puoi creare manutenzioni e checklist.</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-5 max-w-3xl">
                        <TabsTrigger value="general" className="gap-1.5">
                            <Wrench className="w-4 h-4" />
                            <span className="hidden sm:inline">Generale</span>
                        </TabsTrigger>
                        <TabsTrigger value="maintenance" className="gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span className="hidden sm:inline">Manutenzione</span>
                            {(overdueCount > 0 || activeWOs.length > 0) && (
                                <Badge className="ml-1 h-5 min-w-[20px] p-0 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs">
                                    {activeWOs.length + overdueCount}
                                </Badge>
                            )}
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

                    {/* ============================================================ */}
                    {/* TAB: GENERALE                                                */}
                    {/* ============================================================ */}
                    <TabsContent value="general" className="space-y-6 mt-4">
                        {/* Photo */}
                        <Card className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-primary" /> Foto Macchina
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MachinePhotoUpload
                                    machineId={machine.id}
                                    currentPhotoUrl={machine.photo_url}
                                    onPhotoChange={(url) => setMachine(prev => prev ? { ...prev, photo_url: url } : null)}
                                    readonly={!canEdit}
                                />
                            </CardContent>
                        </Card>

                        {/* Info */}
                        <Card className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-primary" /> Informazioni Generali
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow icon={<Hash className="w-4 h-4" />} label="Codice" value={machine.internal_code} />
                                <InfoRow icon={<Tag className="w-4 h-4" />} label="Categoria" value={machine.category} />
                                <InfoRow icon={<Wrench className="w-4 h-4" />} label="Marca" value={machine.brand} />
                                <InfoRow icon={<FileText className="w-4 h-4" />} label="Modello" value={machine.model} />
                                <InfoRow icon={<Hash className="w-4 h-4" />} label="N. Serie" value={machine.serial_number} />
                                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Anno Fabbricazione" value={machine.year_of_manufacture?.toString()} />
                                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Data Commissione" value={machine.commissioned_at ? new Date(machine.commissioned_at).toLocaleDateString("it-IT") : null} />
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" /> Ubicazione
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow icon={<Building2 className="w-4 h-4 text-blue-400" />} label="Stabilimento" value={plantName} fallback="Non assegnato" />
                                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Posizione" value={machine.position} />
                                {isAssigned && manufacturerName && (
                                    <InfoRow icon={<Factory className="w-4 h-4 text-purple-400" />} label="Costruttore" value={manufacturerName} />
                                )}
                            </CardContent>
                        </Card>

                        {specsText && (
                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-primary" /> Specifiche Tecniche
                                    </CardTitle>
                                </CardHeader>
                                <CardContent><p className="text-muted-foreground whitespace-pre-wrap">{specsText}</p></CardContent>
                            </Card>
                        )}

                        {machine.notes && (
                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" /> Note
                                    </CardTitle>
                                </CardHeader>
                                <CardContent><p className="text-muted-foreground whitespace-pre-wrap">{machine.notes}</p></CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ============================================================ */}
                    {/* TAB: MANUTENZIONE                                            */}
                    {/* ============================================================ */}
                    <TabsContent value="maintenance" className="space-y-6 mt-4">
                        {loadingMaint ? (
                            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        ) : (
                            <>
                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: "Piani attivi", value: activePlans.length, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
                                        { label: "Scaduti", value: overdueCount, color: overdueCount > 0 ? "text-red-600" : "text-gray-400", bg: overdueCount > 0 ? "bg-red-50 dark:bg-red-500/10" : "bg-gray-50 dark:bg-gray-500/10" },
                                        { label: "WO attivi", value: activeWOs.length, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
                                        { label: "WO totali", value: workOrders.length, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-500/10" },
                                    ].map((s) => (
                                        <Card key={s.label} className="rounded-2xl border-0 bg-card shadow-sm">
                                            <CardContent className="p-4 flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                                                    <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                                                </div>
                                                <span className="text-sm text-muted-foreground">{s.label}</span>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Plans */}
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Piani di Manutenzione ({activePlans.length})</h3>
                                    {activePlans.length === 0 ? (
                                        <Card className="rounded-2xl border-0 bg-card shadow-sm p-8 text-center">
                                            <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                                            <p className="text-muted-foreground">Nessun piano attivo per questa macchina</p>
                                        </Card>
                                    ) : (
                                        <div className="space-y-2">
                                            {activePlans.map(plan => {
                                                const prio = priorityConfig[plan.priority || "medium"] || priorityConfig.medium;
                                                const isOverdue = plan.next_due_date && new Date(plan.next_due_date) < new Date();
                                                const freq = getFrequencyLabel(plan.frequency_type, plan.frequency_value);
                                                return (
                                                    <Card key={plan.id}
                                                        className={`rounded-2xl border-0 border-l-4 ${prio.border} bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                                                        onClick={() => router.push(`/maintenance/${plan.id}`)}>
                                                        <CardContent className="p-3 flex items-center justify-between">
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-50 dark:bg-red-500/10" : "bg-orange-50 dark:bg-orange-500/10"}`}>
                                                                    <Calendar className={`w-4 h-4 ${isOverdue ? "text-red-500" : "text-orange-500"}`} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-foreground font-medium truncate">{plan.title}</p>
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                                        {plan.next_due_date && (
                                                                            <span className={isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                                                                                {new Date(plan.next_due_date).toLocaleDateString("it-IT")}
                                                                            </span>
                                                                        )}
                                                                        {freq && <span>• {freq}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${prio.color}`}>{prio.label}</Badge>
                                                                {isOverdue && <Badge className="rounded-full px-2 py-0.5 text-xs font-semibold bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300">Scaduto</Badge>}
                                                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Work Orders */}
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ordini di Lavoro ({workOrders.length})</h3>
                                    {workOrders.length === 0 ? (
                                        <Card className="rounded-2xl border-0 bg-card shadow-sm p-8 text-center">
                                            <Wrench className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                                            <p className="text-muted-foreground">Nessun ordine di lavoro per questa macchina</p>
                                        </Card>
                                    ) : (
                                        <div className="space-y-2">
                                            {workOrders.slice(0, 20).map(wo => {
                                                const wSt = woStatusConfig[wo.status] || woStatusConfig.draft;
                                                const prio = priorityConfig[wo.priority] || priorityConfig.medium;
                                                const isClosed = ["completed", "approved", "cancelled"].includes(wo.status);
                                                const sched = wo.scheduled_start || wo.scheduled_date;
                                                return (
                                                    <Card key={wo.id}
                                                        className={`rounded-2xl border-0 border-l-4 ${prio.border} bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group ${isClosed ? "opacity-60" : ""}`}
                                                        onClick={() => router.push(`/work-orders/${wo.id}`)}>
                                                        <CardContent className="p-3 flex items-center justify-between">
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-500/10">
                                                                    {isClosed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-blue-500" />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-foreground font-medium truncate">{wo.title}</p>
                                                                        {wo.wo_number && <span className="text-xs font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded shrink-0">{wo.wo_number}</span>}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                                        {sched && <span>{new Date(sched).toLocaleDateString("it-IT")}</span>}
                                                                        <span>• {wo.wo_type || wo.work_type || "—"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${wSt.color}`}>{wSt.label}</Badge>
                                                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                            {workOrders.length > 20 && (
                                                <p className="text-center text-sm text-muted-foreground py-2">+{workOrders.length - 20} altri</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </TabsContent>

                    {/* ============================================================ */}
                    {/* TAB: DOCUMENTI                                               */}
                    {/* ============================================================ */}
                    <TabsContent value="documents" className="space-y-6 mt-4">
                        <DocumentUpload equipmentId={machine.id} />
                    </TabsContent>

                    {/* ============================================================ */}
                    {/* TAB: TIMELINE                                                */}
                    {/* ============================================================ */}
                    <TabsContent value="timeline" className="mt-4">
                        <Card className="rounded-2xl border-0 bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <History className="w-5 h-5 text-primary" /> Cronologia Eventi
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MachineEventTimeline
                                    machineId={machine.id}
                                    limit={50}
                                    showIntegrityCheck={isAdmin}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ============================================================ */}
                    {/* TAB: QR CODE                                                 */}
                    {/* ============================================================ */}
                    <TabsContent value="qr" className="mt-4">
                        <div className="max-w-md mx-auto">
                            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <QrCode className="w-5 h-5 text-primary" /> QR Code
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-center">
                                        <QRCodeGenerator value={qrValue} size={220} />
                                    </div>

                                    <div className="space-y-2">
                                        {!editingQR ? (
                                            <>
                                                <p className="text-xs text-muted-foreground">URL codificato:</p>
                                                <p className="text-sm text-foreground font-mono break-all bg-muted/50 rounded-lg p-2">
                                                    {machine.qr_code_token || <span className="text-muted-foreground italic">Default: link alla scheda</span>}
                                                </p>
                                                {canEdit && (
                                                    <Button variant="outline" size="sm" onClick={() => { setEditingQR(true); setQrUrlDraft(machine.qr_code_token || ""); }} className="w-full mt-2">
                                                        <Pencil className="w-3 h-3 mr-2" />
                                                        {machine.qr_code_token ? "Modifica URL" : "Imposta URL personalizzato"}
                                                    </Button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-xs text-muted-foreground">Inserisci l'URL da codificare nel QR:</p>
                                                <Input value={qrUrlDraft} onChange={(e) => setQrUrlDraft(e.target.value)}
                                                    placeholder="https://esempio.com/manuale.pdf"
                                                    className="bg-muted border-border text-foreground text-sm" />
                                                <p className="text-xs text-muted-foreground">Lascia vuoto per usare il link alla scheda</p>
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleSaveQR} disabled={savingQR} className="flex-1 bg-green-600 hover:bg-green-700">
                                                        <Save className="w-3 h-3 mr-1" />{savingQR ? "..." : "Salva"}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => { setEditingQR(false); setQrUrlDraft(machine.qr_code_token || ""); }}>
                                                        <X className="w-3 h-3 mr-1" /> Annulla
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
                                        <p className="text-xs text-blue-400 font-medium mb-1">💡 Suggerimento</p>
                                        <p className="text-xs text-blue-300">Stampa il QR Code e applicalo sulla macchina. I tecnici potranno scansionarlo per accedere alla documentazione.</p>
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

// =============================================================================
// INFO ROW
// =============================================================================

function InfoRow({ icon, label, value, fallback = "\u2014" }: { icon: React.ReactNode; label: string; value: string | null | undefined; fallback?: string }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{icon}</span>
            <span className="text-muted-foreground w-36 shrink-0">{label}</span>
            <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>{value || fallback}</span>
        </div>
    );
}

