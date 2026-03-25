import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import DocumentManager from "@/components/documents/DocumentManager";
import { MachinePhotoUpload } from "@/components/Equipment/MachinePhotoUpload";
import { MachineEventTimeline } from "@/components/MachineEventTimeline";
import MachineSummaryHero from "@/components/Equipment/MachineSummaryHero";
import MachineQuickActions from "@/components/Equipment/MachineQuickActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, FileText, Factory, History, Loader2, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type OrgType = "manufacturer" | "customer";
interface MachineRow { id: string; name: string | null; internal_code: string | null; serial_number: string | null; model: string | null; brand: string | null; notes: string | null; lifecycle_state: string | null; organization_id: string | null; plant_id: string | null; production_line_id: string | null; is_archived: boolean | null; is_deleted?: boolean | null; photo_url?: string | null; created_at?: string | null; }
interface PlantRow { id: string; name: string | null; code?: string | null; }
interface LineRow { id: string; name: string | null; code?: string | null; }
interface OrganizationRow { id: string; name: string | null; }
interface ActiveAssignmentRow { id: string; customer_org_id: string | null; organizations?: { id: string; name: string | null; } | null; }

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { id } = router.query;
    const { loading: authLoading, organization, membership, session } = useAuth();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [machine, setMachine] = useState < MachineRow | null > (null);
    const [plant, setPlant] = useState < PlantRow | null > (null);
    const [line, setLine] = useState < LineRow | null > (null);
    const [ownerOrganization, setOwnerOrganization] = useState < OrganizationRow | null > (null);
    const [assignedCustomerName, setAssignedCustomerName] = useState < string | null > (null);

    const userRole = membership?.role ?? "technician";
    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const canEdit = userRole === "owner" || userRole === "admin" || userRole === "supervisor";
    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);
    const ownsMachine = useMemo(() => {
        if (!machine || !orgId) return false;
        return machine.organization_id === orgId;
    }, [machine, orgId]);
    const canEditMachine = canEdit && ownsMachine;
    const canDeleteMachine = canEdit && ownsMachine;

    const getAccessToken = async () => {
        const accessToken = session?.access_token ?? (await supabase.auth.getSession()).data.session?.access_token;
        if (!accessToken) throw new Error("Session expired");
        return accessToken;
    };

    const handleDeleteMachine = async () => {
        if (!machine) return;
        if (!confirm(`${t("equipment.deleteConfirm")} "${machine.name || machine.id}"`)) return;
        setDeleting(true);
        try {
            const accessToken = await getAccessToken();
            const response = await fetch(`/api/machines/${machine.id}/delete`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Delete error");
            toast({ title: t("equipment.movedToTrash"), description: machine.name || machine.id });
            void router.push("/equipment");
        } catch (err: any) {
            console.error(err);
            toast({
                title: t("common.error"),
                description: err?.message || "Delete error",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!resolvedId || authLoading) return;
            if (!orgId || !orgType) {
                if (active) setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const { data: machineRow, error: machineError } = await supabase
                    .from("machines")
                    .select("*")
                    .eq("id", resolvedId)
                    .eq("is_archived", false)
                    .or("is_deleted.is.null,is_deleted.eq.false")
                    .maybeSingle();

                if (machineError) throw machineError;
                if (!machineRow) {
                    toast({
                        title: t("equipment.notFound"),
                        description: t("equipment.notFoundDesc"),
                        variant: "destructive",
                    });
                    void router.replace("/equipment");
                    return;
                }

                const machineData = machineRow as MachineRow;
                let allowed = false;

                if (orgType === "manufacturer") {
                    allowed = machineData.organization_id === orgId;
                } else {
                    if (machineData.organization_id === orgId) {
                        allowed = true;
                    } else {
                        const { data: assignmentRow, error: assignmentError } = await supabase
                            .from("machine_assignments")
                            .select("id")
                            .eq("machine_id", machineData.id)
                            .eq("customer_org_id", orgId)
                            .eq("is_active", true)
                            .maybeSingle();
                        if (assignmentError) throw assignmentError;
                        allowed = !!assignmentRow;
                    }
                }

                if (!allowed) {
                    toast({
                        title: t("equipment.accessDenied"),
                        description: t("equipment.accessDeniedDesc"),
                        variant: "destructive",
                    });
                    void router.replace("/equipment");
                    return;
                }

                if (!active) return;
                setMachine(machineData);

                const asyncCalls: Promise<any>[] = [];
                if (machineData.plant_id) {
                    asyncCalls.push(
                        supabase
                            .from("plants")
                            .select("id, name, code")
                            .eq("id", machineData.plant_id)
                            .maybeSingle()
                            .then(({ data }) => {
                                if (active) setPlant((data as PlantRow) ?? null);
                            }),
                    );
                } else {
                    setPlant(null);
                }

                if (machineData.production_line_id) {
                    asyncCalls.push(
                        supabase
                            .from("production_lines")
                            .select("id, name, code")
                            .eq("id", machineData.production_line_id)
                            .maybeSingle()
                            .then(({ data }) => {
                                if (active) setLine((data as LineRow) ?? null);
                            }),
                    );
                } else {
                    setLine(null);
                }

                if (machineData.organization_id) {
                    asyncCalls.push(
                        supabase
                            .from("organizations")
                            .select("id, name")
                            .eq("id", machineData.organization_id)
                            .maybeSingle()
                            .then(({ data }) => {
                                if (active) setOwnerOrganization((data as OrganizationRow) ?? null);
                            }),
                    );
                } else {
                    setOwnerOrganization(null);
                }

                asyncCalls.push(
                    supabase
                        .from("machine_assignments")
                        .select("id, customer_org_id, organizations:customer_org_id(id, name)")
                        .eq("machine_id", machineData.id)
                        .eq("is_active", true)
                        .maybeSingle()
                        .then(({ data }) => {
                            const row = data as unknown as ActiveAssignmentRow | null;
                            if (!active) return;
                            setAssignedCustomerName(row?.organizations?.name ?? null);
                        }),
                );

                await Promise.all(asyncCalls);
            } catch (error: any) {
                console.error(error);
                toast({
                    title: t("common.error"),
                    description: error?.message ?? t("equipment.loadError"),
                    variant: "destructive",
                });
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [resolvedId, authLoading, orgId, orgType, router, toast, t]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole as any}>
                    <SEO title={`${t("machines.title")} - MACHINA`} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {t("machines.loading")}
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!machine) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole as any}>
                    <SEO title={`${t("machines.title")} - MACHINA`} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-muted-foreground">{t("machines.noResults")}</CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole as any}>
                <SEO title={`${machine.name ?? t("machines.title")} - MACHINA`} />
                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <Button variant="outline" onClick={() => router.push("/equipment")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t("nav.equipment")}
                        </Button>
                        <div className="flex flex-wrap gap-2">
                            {canEditMachine && (
                                <Link href={`/equipment/${machine.id}/edit`}>
                                    <Button variant="outline">
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {t("equipment.editMachine")}
                                    </Button>
                                </Link>
                            )}
                            {canDeleteMachine && (
                                <Button variant="destructive" onClick={handleDeleteMachine} disabled={deleting}>
                                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    {t("equipment.moveToTrash")}
                                </Button>
                            )}
                        </div>
                    </div>

                    <MachineSummaryHero
                        name={machine.name}
                        internalCode={machine.internal_code}
                        serialNumber={machine.serial_number}
                        brand={machine.brand}
                        model={machine.model}
                        lifecycleState={machine.lifecycle_state}
                        orgType={orgType}
                        ownerOrganizationName={ownerOrganization?.name ?? organization?.name ?? null}
                        assignedCustomerName={assignedCustomerName}
                        plantName={plant?.name || plant?.code || null}
                        lineName={line?.name || line?.code || null}
                        createdAt={machine.created_at}
                    />

                    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>{t("equipment.photo")}</CardTitle>
                                    <CardDescription>{t("equipment.photoDesc")}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <MachinePhotoUpload
                                        machineId={machine.id}
                                        currentPhotoUrl={machine.photo_url ?? null}
                                        onPhotoChange={(url) => setMachine((prev) => (prev ? { ...prev, photo_url: url } : prev))}
                                        readonly={!canEditMachine}
                                    />
                                </CardContent>
                            </Card>
                            <MachineQuickActions machineId={machine.id} canEdit={canEditMachine} />
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>{t("equipment.quickInfo")}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <InfoRow label={t("equipment.internalCode")} value={machine.internal_code} />
                                    <InfoRow label={t("machines.serialNumber")} value={machine.serial_number} />
                                    <InfoRow label={t("machines.manufacturer")} value={machine.brand} />
                                    <InfoRow label={t("machines.model")} value={machine.model} />
                                    <InfoRow label={t("plants.fallbackPlant")} value={plant?.name || plant?.code} />
                                    <InfoRow label={t("plants.line")} value={line?.name || line?.code} />
                                    <InfoRow label={t("equipment.assignedCustomer")} value={assignedCustomerName} />
                                    <InfoRow label={t("equipment.owner")} value={ownerOrganization?.name || organization?.name} />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>{t("equipment.notes")}</CardTitle>
                                    <CardDescription>{t("equipment.notesDesc")}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-foreground">
                                        {machine.notes || t("equipment.noNotes")}
                                    </div>
                                </CardContent>
                            </Card>
                            <section id="machine-timeline">
                                <Card className="rounded-2xl">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <History className="h-4 w-4" />
                                            {t("equipment.timeline")}
                                        </CardTitle>
                                        <CardDescription>{t("equipment.timelineDesc")}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <MachineEventTimeline machineId={machine.id} limit={50} showIntegrityCheck={true} />
                                    </CardContent>
                                </Card>
                            </section>
                            <section id="machine-documents">
                                <Card className="rounded-2xl">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            {t("documents.title")}
                                        </CardTitle>
                                        <CardDescription>{t("equipment.docsDesc")}</CardDescription>
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
                            </section>
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>{t("equipment.machineContext")}</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
                                    <ContextCard
                                        icon={<Factory className="h-5 w-5" />}
                                        title={t("equipment.ownerContext")}
                                        value={ownerOrganization?.name || "—"}
                                        tone="orange"
                                    />
                                    <ContextCard
                                        icon={<Building2 className="h-5 w-5" />}
                                        title={t("equipment.assignmentContext")}
                                        value={assignedCustomerName || t("equipment.notAssigned")}
                                        tone="blue"
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined; }) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="max-w-[60%] text-right text-sm font-medium text-foreground">{value || "—"}</div>
        </div>
    );
}

function ContextCard({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value: string; tone: "orange" | "blue"; }) {
    const toneClasses = tone === "orange" ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500";
    return (
        <div className="rounded-2xl border border-border p-4">
            <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses}`}>{icon}</div>
                <div>
                    <div className="text-sm text-muted-foreground">{title}</div>
                    <div className="mt-1 font-semibold text-foreground">{value}</div>
                </div>
            </div>
        </div>
    );
}
