import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Wrench, User, CalendarDays, ClipboardList } from "lucide-react";
import { PageLoader } from "@/components/feedback/PageLoader";
import { createWorkOrder } from "@/services/workOrderApi";
import {
    getWorkOrderCreateContext,
    type WorkOrderCreateContextAssignee,
    type WorkOrderCreateContextMachine,
} from "@/lib/workOrderCreateApi";

type WorkType = "preventive" | "corrective" | "predictive" | "inspection" | "emergency";
type WorkStatus = "draft" | "scheduled" | "in_progress" | "pending_review" | "completed" | "cancelled";
type WorkPriority = "low" | "medium" | "high" | "critical";

export default function WorkOrderCreatePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { loading: authLoading, membership, user } = useAuth();
    const { t } = useLanguage();

    const tr = (key: string, fallback: string) => {
        const value = t(key);
        return value && value !== key ? value : fallback;
    };

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [machines, setMachines] = useState < WorkOrderCreateContextMachine[] > ([]);
    const [assignees, setAssignees] = useState < WorkOrderCreateContextAssignee[] > ([]);

    const workTypeFromQuery = useMemo < WorkType > (() => {
        const raw = router.query.work_type;
        if (typeof raw !== "string") return "preventive";

        return ["preventive", "corrective", "predictive", "inspection", "emergency"].includes(raw)
            ? (raw as WorkType)
            : "preventive";
    }, [router.query.work_type]);

    const preselectedMachineId = useMemo(() => {
        const raw = router.query.machine_id;
        return typeof raw === "string" ? raw : null;
    }, [router.query.machine_id]);

    const maintenancePlanId = useMemo(() => {
        const raw = router.query.maintenance_plan_id;
        return typeof raw === "string" ? raw : null;
    }, [router.query.maintenance_plan_id]);

    const planTitle = useMemo(() => {
        const raw = router.query.plan_title;
        return typeof raw === "string" ? decodeURIComponent(raw) : null;
    }, [router.query.plan_title]);

    const planPriority = useMemo < WorkPriority | null > (() => {
        const raw = router.query.plan_priority;
        return typeof raw === "string" && ["low", "medium", "high", "critical"].includes(raw)
            ? (raw as WorkPriority)
            : null;
    }, [router.query.plan_priority]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [workType, setWorkType] = useState < WorkType > (workTypeFromQuery);
    const [status, setStatus] = useState < WorkStatus > ("draft");
    const [priority, setPriority] = useState < WorkPriority > ("medium");
    const [dueDate, setDueDate] = useState("");
    const [machineId, setMachineId] = useState < string > (preselectedMachineId ?? "none");
    const [assignedTo, setAssignedTo] = useState < string > ("none");

    const userRole = membership?.role ?? "viewer";
    const canCreate = ["owner", "admin", "supervisor", "technician"].includes(userRole);

    useEffect(() => {
        setWorkType(workTypeFromQuery);
    }, [workTypeFromQuery]);

    useEffect(() => {
        if (preselectedMachineId) {
            setMachineId(preselectedMachineId);
        }
    }, [preselectedMachineId]);

    useEffect(() => {
        if (planTitle && !title.trim()) {
            setTitle(planTitle);
        }
    }, [planTitle, title]);

    useEffect(() => {
        if (planPriority) {
            setPriority(planPriority);
        }
    }, [planPriority]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (authLoading) return;

            try {
                setLoading(true);
                const data = await getWorkOrderCreateContext();
                if (!active) return;
                setMachines(data.machines ?? []);
                setAssignees(data.assignees ?? []);
            } catch (error: any) {
                console.error(error);
                toast({
                    title: tr("common.error", "Errore"),
                    description: error?.message ?? tr("workOrders.errorLoadPage", "Errore caricamento pagina"),
                    variant: "destructive",
                });
                void router.push("/work-orders");
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [authLoading, router, toast]);

    const selectedMachine = useMemo(
        () => machines.find((machine) => machine.id === machineId) ?? null,
        [machines, machineId]
    );

    const handleSave = async () => {
        if (!canCreate) {
            toast({
                title: tr("workOrders.permissionDenied", "Permesso negato"),
                description: tr("workOrders.onlyAdminCreate", "Non hai i permessi per creare work order."),
                variant: "destructive",
            });
            return;
        }

        if (!title.trim()) {
            toast({
                title: tr("common.error", "Errore"),
                description: tr("workOrders.errorTitleRequired", "Inserisci il titolo."),
                variant: "destructive",
            });
            return;
        }

        if (machineId === "none") {
            toast({
                title: tr("common.error", "Errore"),
                description: tr("workOrders.errorSelectMachine", "Seleziona una macchina."),
                variant: "destructive",
            });
            return;
        }

        if (!selectedMachine?.plant_id) {
            toast({
                title: tr("common.error", "Errore"),
                description: tr(
                    "workOrders.errorNoPlant",
                    "La macchina selezionata non ha uno stabilimento associato.",
                ),
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            const data = await createWorkOrder({
                title: title.trim(),
                description: description.trim() || null,
                work_type: workType,
                status,
                priority,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                machine_id: selectedMachine.id,
                plant_id: selectedMachine.plant_id,
                assigned_to: assignedTo === "none" ? null : assignedTo,
                created_by: user?.id ?? null,
                maintenance_plan_id: maintenancePlanId,
            });

            toast({
                title: "OK",
                description: tr("workOrders.created", "Work order creato"),
            });
            void router.push(`/work-orders/${data.id}`);
        } catch (error: any) {
            console.error(error);
            toast({
                title: tr("common.error", "Errore"),
                description: error?.message ?? tr("workOrders.errorCreate", "Errore creazione work order"),
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const pageTitle = tr("workOrders.createTitle", "Nuovo work order");

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${pageTitle} - MACHINA`} />
                    <PageLoader
                        title={pageTitle}
                        description={tr("workOrders.createLoading", "Stiamo preparando il contesto operativo...")}
                    />
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${pageTitle} - MACHINA`} />

                <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {tr("common.back", "Indietro")}
                    </Button>

                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader>
                            <CardTitle>{pageTitle}</CardTitle>
                            <CardDescription>
                                {maintenancePlanId
                                    ? "Questo ordine di lavoro nasce da un piano di manutenzione attivo."
                                    : tr(
                                        "workOrders.createDesc",
                                        "Il work order appartiene sempre all'organizzazione attiva.",
                                    )}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {maintenancePlanId && (
                                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-foreground">
                                    <div className="flex items-start gap-3">
                                        <ClipboardList className="mt-0.5 h-4 w-4 text-orange-500" />
                                        <div className="space-y-1">
                                            <div className="font-medium">Origine: piano di manutenzione</div>
                                            <div className="text-muted-foreground">
                                                {planTitle || "Piano collegato"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>{tr("workOrders.titleLabel", "Titolo")}</Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={tr(
                                            "workOrders.titlePlaceholder",
                                            "es. Sostituzione cuscinetto lato motore",
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Wrench className="h-4 w-4" />
                                        {tr("workOrders.equipmentLabel", "Macchina")}
                                    </Label>
                                    <Select value={machineId} onValueChange={setMachineId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={tr("workOrders.selectMachine", "Seleziona macchina...")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                {tr("workOrders.selectMachine", "Seleziona macchina")}
                                            </SelectItem>
                                            {machines.map((machine) => (
                                                <SelectItem key={machine.id} value={machine.id}>
                                                    {machine.name || tr("workOrders.machineFallback", "Macchina")}
                                                    {machine.internal_code ? ` · ${machine.internal_code}` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        {tr("workOrders.assignedTo", "Assegna a")}
                                    </Label>
                                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={tr("workOrders.unassigned", "Non assegnato")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                {tr("workOrders.unassigned", "Non assegnato")}
                                            </SelectItem>
                                            {assignees.map((profile) => (
                                                <SelectItem key={profile.id} value={profile.id}>
                                                    {profile.display_name || profile.email || tr("users.user", "Utente")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{tr("workOrders.typeLabel", "Tipo attività")}</Label>
                                    <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="preventive">{tr("workOrders.typePreventive", "Preventiva")}</SelectItem>
                                            <SelectItem value="corrective">{tr("workOrders.typeCorrective", "Correttiva")}</SelectItem>
                                            <SelectItem value="predictive">{tr("workOrders.typePredictive", "Predittiva")}</SelectItem>
                                            <SelectItem value="inspection">{tr("workOrders.typeInspection", "Ispezione")}</SelectItem>
                                            <SelectItem value="emergency">{tr("workOrders.typeEmergency", "Emergenza")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{tr("workOrders.statusLabel", "Stato")}</Label>
                                    <Select value={status} onValueChange={(v) => setStatus(v as WorkStatus)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">{tr("workOrders.statusDraft", "Bozza")}</SelectItem>
                                            <SelectItem value="scheduled">{tr("workOrders.statusScheduled", "Pianificato")}</SelectItem>
                                            <SelectItem value="in_progress">{tr("workOrders.statusInProgress", "In corso")}</SelectItem>
                                            <SelectItem value="pending_review">{tr("workOrders.statusPendingReview", "In revisione")}</SelectItem>
                                            <SelectItem value="completed">{tr("workOrders.statusCompleted", "Completato")}</SelectItem>
                                            <SelectItem value="cancelled">{tr("workOrders.statusCancelled", "Annullato")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{tr("workOrders.priorityLabel", "Priorità")}</Label>
                                    <Select value={priority} onValueChange={(v) => setPriority(v as WorkPriority)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">{tr("workOrders.priorityLow", "Bassa")}</SelectItem>
                                            <SelectItem value="medium">{tr("workOrders.priorityMedium", "Media")}</SelectItem>
                                            <SelectItem value="high">{tr("workOrders.priorityHigh", "Alta")}</SelectItem>
                                            <SelectItem value="critical">{tr("workOrders.priorityCritical", "Critica")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4" />
                                        {tr("workOrders.dueDate", "Scadenza")}
                                    </Label>
                                    <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label>{tr("workOrders.descriptionLabel", "Descrizione")}</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={5}
                                        placeholder={tr(
                                            "workOrders.descriptionPlaceholder",
                                            "Descrizione intervento, sintomi, note operative...",
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={saving} className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]">
                                    {saving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    {saving
                                        ? tr("common.saving", "Salvataggio...")
                                        : tr("workOrders.saveWorkOrder", "Salva work order")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
