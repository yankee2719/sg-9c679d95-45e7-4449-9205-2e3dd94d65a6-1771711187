import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import MachineSummaryHero from "@/components/Equipment/MachineSummaryHero";
import MachineQuickActions from "@/components/Equipment/MachineQuickActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, FileText, Factory, Loader2, Pencil, Trash2, WifiOff, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/services/apiClient";
import { getEquipmentSnapshot, saveEquipmentSnapshot, type EquipmentSnapshot } from "@/lib/equipmentSnapshotCache";

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { loading: authLoading, membership, session } = useAuth();
    const { t } = useLanguage();
    const resolvedId = useMemo(() => (typeof router.query.id === "string" ? router.query.id : null), [router.query.id]);

    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [snapshot, setSnapshot] = useState < EquipmentSnapshot | null > (null);
    const [isOfflineSnapshot, setIsOfflineSnapshot] = useState(false);

    const userRole = membership?.role ?? "technician";

    const getAccessToken = async () => {
        const accessToken = session?.access_token ?? (await supabase.auth.getSession()).data.session?.access_token;
        if (!accessToken) throw new Error("Session expired");
        return accessToken;
    };

    const handleDeleteMachine = async () => {
        if (!snapshot?.machine) return;
        if (!confirm(`${t("equipment.deleteConfirm")} \"${snapshot.machine.name || snapshot.machine.id}\"`)) return;
        setDeleting(true);
        try {
            const accessToken = await getAccessToken();
            const response = await fetch(`/api/machines/${snapshot.machine.id}/delete`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Delete error");
            toast({ title: t("equipment.movedToTrash"), description: snapshot.machine.name || snapshot.machine.id });
            void router.push("/equipment");
        } catch (err: any) {
            toast({ title: t("common.error"), description: err?.message || "Delete error", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        if (!resolvedId || authLoading) return;
        let active = true;

        async function load() {
            setLoading(true);
            try {
                const payload = await apiFetch < any > (`/api/equipment/${resolvedId}/snapshot`);
                if (!active) return;
                const nextSnapshot = payload?.snapshot as EquipmentSnapshot;
                setSnapshot(nextSnapshot);
                setIsOfflineSnapshot(false);
                saveEquipmentSnapshot(nextSnapshot);
            } catch (error: any) {
                const cached = getEquipmentSnapshot(resolvedId);
                if (!active) return;
                if (cached) {
                    setSnapshot(cached);
                    setIsOfflineSnapshot(true);
                } else {
                    toast({ title: t("common.error"), description: error?.message || t("equipment.loadError"), variant: "destructive" });
                    void router.replace("/equipment");
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void load();
        return () => {
            active = false;
        };
    }, [resolvedId, authLoading, toast, t, router]);

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

    if (!snapshot) {
        return null;
    }

    const machine = snapshot.machine;
    const canEditMachine = snapshot.machineContext.canEdit && !isOfflineSnapshot;
    const canDeleteMachine = snapshot.machineContext.canDelete && !isOfflineSnapshot;

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
                                    <Button variant="outline"><Pencil className="mr-2 h-4 w-4" />{t("equipment.editMachine")}</Button>
                                </Link>
                            )}
                            {canDeleteMachine && (
                                <Button variant="destructive" onClick={() => void handleDeleteMachine()} disabled={deleting}>
                                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    {t("equipment.moveToTrash")}
                                </Button>
                            )}
                        </div>
                    </div>

                    {isOfflineSnapshot ? (
                        <Card className="rounded-2xl border-orange-200 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-500/10">
                            <CardContent className="flex items-center gap-3 p-4 text-sm text-orange-700 dark:text-orange-300">
                                <WifiOff className="h-4 w-4" />
                                Dati macchina offline: vista sola lettura basata sull’ultima snapshot salvata.
                            </CardContent>
                        </Card>
                    ) : null}

                    <MachineSummaryHero
                        name={machine.name}
                        internalCode={machine.internal_code}
                        serialNumber={machine.serial_number}
                        brand={machine.brand}
                        model={machine.model}
                        lifecycleState={machine.lifecycle_state}
                        orgType={snapshot.machineContext.orgType}
                        ownerOrganizationName={snapshot.ownerOrganization?.name ?? null}
                        assignedCustomerName={snapshot.assignedCustomerName}
                        plantName={snapshot.plant?.name || snapshot.plant?.code || null}
                        lineName={snapshot.line?.name || snapshot.line?.code || null}
                        createdAt={machine.created_at}
                    />

                    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                        <div className="space-y-6">
                            {!isOfflineSnapshot ? <MachineQuickActions machineId={machine.id} canEdit={canEditMachine} /> : null}
                            <Card className="rounded-2xl">
                                <CardHeader><CardTitle>{t("equipment.quickInfo")}</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <InfoRow label={t("equipment.internalCode")} value={machine.internal_code} />
                                    <InfoRow label={t("machines.serialNumber")} value={machine.serial_number} />
                                    <InfoRow label={t("machines.manufacturer")} value={machine.brand} />
                                    <InfoRow label={t("machines.model")} value={machine.model} />
                                    <InfoRow label={t("plants.fallbackPlant")} value={snapshot.plant?.name || snapshot.plant?.code} />
                                    <InfoRow label={t("plants.line")} value={snapshot.line?.name || snapshot.line?.code} />
                                    <InfoRow label={t("equipment.assignedCustomer")} value={snapshot.assignedCustomerName} />
                                    <InfoRow label={t("equipment.owner")} value={snapshot.ownerOrganization?.name} />
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

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" />{t("equipment.latestWorkOrders") || "Ultimi work order"}</CardTitle>
                                    <CardDescription>Snapshot rapido utile anche sul campo.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {snapshot.workOrders.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t("equipment.noWorkOrders") || "Nessun work order presente."}</p>
                                    ) : (
                                        snapshot.workOrders.map((workOrder) => (
                                            <Link key={workOrder.id} href={`/work-orders/${workOrder.id}`} className="block rounded-xl border border-border p-4 transition-colors hover:bg-muted/50">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium text-foreground">{workOrder.title}</div>
                                                        <div className="mt-1 text-xs text-muted-foreground">{workOrder.created_at ? new Date(workOrder.created_at).toLocaleString() : "—"}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge variant="outline">{workOrder.status}</Badge>
                                                        <span className="text-xs text-muted-foreground">{workOrder.due_date ? new Date(workOrder.due_date).toLocaleDateString() : "—"}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />{t("documents.title")}</CardTitle>
                                    <CardDescription>Documenti recenti della macchina, con supporto cache offline dal dettaglio.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {snapshot.documents.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t("documents.empty") || "Nessun documento disponibile."}</p>
                                    ) : (
                                        snapshot.documents.map((doc) => (
                                            <Link key={doc.id} href={`/documents/${doc.id}`} className="block rounded-xl border border-border p-4 transition-colors hover:bg-muted/50">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium text-foreground">{doc.title || t("documents.title")}</div>
                                                        <div className="mt-1 text-xs text-muted-foreground">{doc.category || "other"}</div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : "—"}</div>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                    <div className="pt-2">
                                        <Link href={`/documents?machine_id=${machine.id}`}><Button variant="outline">{t("documents.viewAll") || "Vedi tutti i documenti"}</Button></Link>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader><CardTitle>{t("equipment.machineContext")}</CardTitle></CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
                                    <ContextCard icon={<Factory className="h-5 w-5" />} title={t("equipment.ownerContext")} value={snapshot.ownerOrganization?.name || "—"} tone="orange" />
                                    <ContextCard icon={<Building2 className="h-5 w-5" />} title={t("equipment.assignmentContext")} value={snapshot.assignedCustomerName || t("equipment.notAssigned")} tone="blue" />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="max-w-[60%] text-right text-sm font-medium text-foreground">{value || "—"}</div>
        </div>
    );
}

function ContextCard({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value: string; tone: "orange" | "blue" }) {
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
