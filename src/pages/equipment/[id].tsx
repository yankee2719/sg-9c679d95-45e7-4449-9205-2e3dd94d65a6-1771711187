import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
import { apiFetch } from "@/services/apiClient";
import { getMachineSnapshot } from "@/lib/machineWorkspaceApi";

type OrgType = "manufacturer" | "customer";

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { id } = router.query;
    const { loading: authLoading, organization, membership } = useAuth();
    const { t } = useLanguage();
    const tx = (key: string, fallback: string) => {
        const value = t(key);
        return value === key ? fallback : value;
    };

    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [snapshot, setSnapshot] = useState < any > (null);

    const userRole = membership?.role ?? "technician";
    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);

    const handleDeleteMachine = async () => {
        if (!snapshot?.machine) return;
        if (!confirm(`${tx("equipment.deleteConfirm", "Confermi di voler spostare nel cestino la macchina")} "${snapshot.machine.name || snapshot.machine.id}"`)) return;
        setDeleting(true);
        try {
            await apiFetch(`/api/machines/${snapshot.machine.id}/delete`, { method: "DELETE" });
            toast({ title: tx("equipment.movedToTrash", "Macchina spostata nel cestino"), description: snapshot.machine.name || snapshot.machine.id });
            void router.push("/equipment");
        } catch (err: any) {
            console.error(err);
            toast({ title: tx("common.error", "Errore"), description: err?.message || "Delete error", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!resolvedId || authLoading) return;
            try {
                setLoading(true);
                const data = await getMachineSnapshot(resolvedId);
                if (!active) return;
                setSnapshot(data);
            } catch (error: any) {
                console.error(error);
                toast({ title: tx("common.error", "Errore"), description: error?.message ?? tx("equipment.loadError", "Errore durante il caricamento della macchina"), variant: "destructive" });
                void router.replace("/equipment");
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [resolvedId, authLoading, router, toast, t]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole as any}><SEO title={`${t("machines.title")} - MACHINA`} /><div className="mx-auto max-w-7xl px-4 py-8"><Card className="rounded-2xl"><CardContent className="flex items-center gap-3 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{t("machines.loading")}</CardContent></Card></div></MainLayout>
            </OrgContextGuard>
        );
    }

    if (!snapshot?.machine) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole as any}><SEO title={`${t("machines.title")} - MACHINA`} /><div className="mx-auto max-w-7xl px-4 py-8"><Card className="rounded-2xl"><CardContent className="py-10 text-muted-foreground">{t("machines.noResults")}</CardContent></Card></div></MainLayout>
            </OrgContextGuard>
        );
    }

    const machine = snapshot.machine;

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole as any}>
                <SEO title={`${machine.name ?? t("machines.title")} - MACHINA`} />
                <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <Button variant="outline" onClick={() => router.push("/equipment")}><ArrowLeft className="mr-2 h-4 w-4" />{t("nav.equipment")}</Button>
                        <div className="flex flex-wrap gap-2">
                            {snapshot.can_edit_machine && <Link href={`/equipment/${machine.id}/edit`}><Button variant="outline"><Pencil className="mr-2 h-4 w-4" />{tx("equipment.editMachine", "Modifica macchina")}</Button></Link>}
                            {snapshot.can_delete_machine && <Button variant="destructive" onClick={handleDeleteMachine} disabled={deleting}>{deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}{tx("equipment.moveToTrash", "Sposta nel cestino")}</Button>}
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
                        ownerOrganizationName={snapshot.ownerOrganization?.name ?? organization?.name ?? null}
                        assignedCustomerName={snapshot.assignedCustomerName}
                        plantName={snapshot.plant?.name || snapshot.plant?.code || null}
                        lineName={snapshot.line?.name || snapshot.line?.code || null}
                        createdAt={machine.created_at}
                    />
                    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                        <div className="space-y-6">
                            <Card className="rounded-2xl"><CardHeader><CardTitle>{tx("equipment.photo", "Foto macchina")}</CardTitle><CardDescription>{tx("equipment.photoDesc", "Carica o aggiorna una foto identificativa della macchina.")}</CardDescription></CardHeader><CardContent><MachinePhotoUpload machineId={machine.id} currentPhotoUrl={machine.photo_url ?? null} onPhotoChange={(url) => setSnapshot((prev: any) => ({ ...prev, machine: { ...prev.machine, photo_url: url } }))} readonly={!snapshot.can_edit_machine} /></CardContent></Card>
                            <MachineQuickActions machineId={machine.id} canEdit={snapshot.can_edit_machine} />
                            <Card className="rounded-2xl"><CardHeader><CardTitle>{tx("equipment.quickInfo", "Informazioni rapide")}</CardTitle></CardHeader><CardContent className="space-y-3"><InfoRow label={tx("equipment.internalCode", "Codice interno")} value={machine.internal_code} /><InfoRow label={t("machines.serialNumber")} value={machine.serial_number} /><InfoRow label={t("machines.manufacturer")} value={machine.brand} /><InfoRow label={t("machines.model")} value={machine.model} /><InfoRow label={t("plants.fallbackPlant")} value={snapshot.plant?.name || snapshot.plant?.code} /><InfoRow label={tx("plants.line", "Linea")} value={snapshot.line?.name || snapshot.line?.code} /><InfoRow label={tx("equipment.assignedCustomer", "Cliente assegnato")} value={snapshot.assignedCustomerName} /><InfoRow label={tx("equipment.owner", "Organizzazione proprietaria")} value={snapshot.ownerOrganization?.name || organization?.name} /></CardContent></Card>
                        </div>
                        <div className="space-y-6">
                            <Card className="rounded-2xl"><CardHeader><CardTitle>{tx("equipment.notes", "Note")}</CardTitle><CardDescription>{tx("equipment.notesDesc", "Annotazioni operative e informazioni aggiuntive.")}</CardDescription></CardHeader><CardContent><div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-foreground">{machine.notes || tx("equipment.noNotes", "Nessuna nota disponibile.")}</div></CardContent></Card>
                            <section id="machine-timeline"><Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" />{tx("equipment.timeline", "Timeline macchina")}</CardTitle><CardDescription>{tx("equipment.timelineDesc", "Storico eventi e attività collegati alla macchina.")}</CardDescription></CardHeader><CardContent><MachineEventTimeline machineId={machine.id} limit={50} showIntegrityCheck={true} /></CardContent></Card></section>
                            <section id="machine-documents"><Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />{t("documents.title")}</CardTitle><CardDescription>{tx("equipment.docsDesc", "Documentazione tecnica e documenti operativi collegati alla macchina.")}</CardDescription></CardHeader><CardContent><DocumentManager machineId={machine.id} machineOwnerOrgId={machine.organization_id} currentOrgId={orgId} currentOrgType={orgType} currentUserRole={userRole} /></CardContent></Card></section>
                            <Card className="rounded-2xl"><CardHeader><CardTitle>{tx("equipment.machineContext", "Contesto macchina")}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><ContextCard icon={<Factory className="h-5 w-5" />} title={tx("equipment.ownerContext", "Contesto proprietario")} value={snapshot.ownerOrganization?.name || "—"} tone="orange" /><ContextCard icon={<Building2 className="h-5 w-5" />} title={tx("equipment.assignmentContext", "Contesto assegnazione")} value={snapshot.assignedCustomerName || tx("equipment.notAssigned", "Non assegnata")} tone="blue" /></CardContent></Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    return <div className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"><div className="text-sm text-muted-foreground">{label}</div><div className="max-w-[60%] text-right text-sm font-medium text-foreground">{value || "—"}</div></div>;
}

function ContextCard({ icon, title, value, tone }: { icon: React.ReactNode; title: string; value: string; tone: "orange" | "blue" }) {
    const toneClasses = tone === "orange" ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500";
    return <div className="rounded-2xl border border-border p-4"><div className="flex items-start gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses}`}>{icon}</div><div><div className="text-sm text-muted-foreground">{title}</div><div className="mt-1 font-semibold text-foreground">{value}</div></div></div></div>;
}
