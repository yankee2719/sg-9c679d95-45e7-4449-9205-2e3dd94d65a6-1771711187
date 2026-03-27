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
import { ArrowLeft, Save, Loader2, Wrench, User, CalendarDays } from "lucide-react";
import { PageLoader } from "@/components/feedback/PageLoader";
import { createWorkOrder } from "@/services/workOrderApi";
import { getWorkOrderCreateContext, type WorkOrderCreateContextAssignee, type WorkOrderCreateContextMachine } from "@/lib/workOrderCreateApi";

type WorkType = "preventive" | "corrective" | "predictive" | "inspection" | "emergency";
type WorkStatus = "draft" | "scheduled" | "in_progress" | "pending_review" | "completed" | "cancelled";
type WorkPriority = "low" | "medium" | "high" | "critical";

export default function WorkOrderCreatePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { loading: authLoading, membership, user } = useAuth();
    const { t } = useLanguage();

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
                    title: t("common.error") || "Errore",
                    description: error?.message ?? t("workOrders.errorLoadPage") || "Errore caricamento pagina",
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
    }, [authLoading, router, t, toast]);

    const handleSave = async () => {
        if (!canCreate) {
            toast({
                title: t("workOrders.permissionDenied") || "Permesso negato",
                description: t("workOrders.onlyAdminCreate") || "Non hai i permessi per creare work order.",
                variant: "destructive",
            });
            return;
        }

        if (!title.trim()) {
            toast({
                title: t("common.error") || "Errore",
                description: t("workOrders.errorTitleRequired") || "Inserisci il titolo.",
                variant: "destructive",
            });
            return;
        }

        if (machineId === "none") {
            toast({
                title: t("common.error") || "Errore",
                description: t("workOrders.errorSelectMachine") || "Seleziona una macchina.",
                variant: "destructive",
            });
            return;
        }

        const selectedMachine = machines.find((machine) => machine.id === machineId);
        if (!selectedMachine) {
            toast({
                title: t("common.error") || "Errore",
                description: t("workOrders.errorInvalidMachine") || "Macchina selezionata non valida.",
                variant: "destructive",
            });
            return;
        }

        if (!selectedMachine.plant_id) {
            toast({
                title: t("common.error") || "Errore",
                description: t("workOrders.errorNoPlant") || "La macchina selezionata non ha uno stabilimento associato.",
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
            });

            toast({ title: "OK", description: t("workOrders.created") || "Work order creato" });
            void router.push(`/work-orders/${data.id}`);
        } catch (error: any) {
            console.error(error);
            toast({
                title: t("common.error") || "Errore",
                description: error?.message ?? t("workOrders.errorCreate") || "Errore creazione work order",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${t("workOrders.createTitle")} - MACHINA`} />
                    <PageLoader
                        title={t("workOrders.createTitle")}
                        description={t("workOrders.createLoading") || "Stiamo preparando il contesto operativo..."}
                    />
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("workOrders.createTitle")} - MACHINA`} />

                <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("common.back")}
                    </Button>

                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardHeader>
                            <CardTitle>{t("workOrders.createTitle")}</CardTitle>
                            <CardDescription>
                                {t("workOrders.createDesc") || "Il work order appartiene sempre all'organizzazione attiva."}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>{t("workOrders.titleLabel")}</Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={t("workOrders.titlePlaceholder") || "es. Sostituzione cuscinetto lato motore"}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Wrench className="h-4 w-4" />
                                        {t("workOrders.equipmentLabel")}
                                    </Label>
                                    <Select value={machineId} onValueChange={setMachineId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("workOrders.selectMachine") || "Seleziona macchina..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t("workOrders.selectMachine") || "Seleziona macchina"}</SelectItem>
                                            {machines.map((machine) => (
                                                <SelectItem key={machine.id} value={machine.id}>
                                                    {machine.name}
                                                    {machine.internal_code ? ` · ${machine.internal_code}` : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        {t("workOrders.assignedTo") || "Assegna a"}
                                    </Label>
                                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("workOrders.unassigned") || "Non assegnato"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t("workOrders.unassigned") || "Non assegnato"}</SelectItem>
                                            {assignees.map((profile) => (
                                                <SelectItem key={profile.id} value={profile.id}>
                                                    {profile.display_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("workOrders.typeLabel")}</Label>
                                    <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="preventive">{t("workOrders.typePreventive")}</SelectItem>
                                            <SelectItem value="corrective">{t("workOrders.typeCorrective")}</SelectItem>
                                            <SelectItem value="predictive">{t("workOrders.typePredictive")}</SelectItem>
                                            <SelectItem value="inspection">{t("workOrders.typeInspection")}</SelectItem>
                                            <SelectItem value="emergency">{t("workOrders.typeEmergency") || "Emergency"}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("workOrders.statusLabel") || "Stato"}</Label>
                                    <Select value={status} onValueChange={(v) => setStatus(v as WorkStatus)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">{t("workOrders.statusDraft") || "Bozza"}</SelectItem>
                                            <SelectItem value="scheduled">{t("workOrders.statusScheduled") || "Pianificato"}</SelectItem>
                                            <SelectItem value="in_progress">{t("workOrders.statusInProgress") || "In corso"}</SelectItem>
                                            <SelectItem value="pending_review">{t("workOrders.statusPendingReview") || "In revisione"}</SelectItem>
                                            <SelectItem value="completed">{t("workOrders.statusCompleted") || "Completato"}</SelectItem>
                                            <SelectItem value="cancelled">{t("workOrders.statusCancelled") || "Annullato"}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("workOrders.priorityLabel")}</Label>
                                    <Select value={priority} onValueChange={(v) => setPriority(v as WorkPriority)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">{t("workOrders.priorityLow") || "Bassa"}</SelectItem>
                                            <SelectItem value="medium">{t("workOrders.priorityMedium") || "Media"}</SelectItem>
                                            <SelectItem value="high">{t("workOrders.priorityHigh") || "Alta"}</SelectItem>
                                            <SelectItem value="critical">{t("workOrders.priorityCritical") || "Critica"}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4" />
                                        {t("workOrders.dueDate") || "Scadenza"}
                                    </Label>
                                    <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label>{t("workOrders.descriptionLabel")}</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={5}
                                        placeholder={t("workOrders.descriptionPlaceholder") || "Descrizione intervento, sintomi, note operative..."}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={saving} className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]">
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    {saving ? t("common.saving") || "Salvataggio..." : t("workOrders.saveWorkOrder") || "Salva work order"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
