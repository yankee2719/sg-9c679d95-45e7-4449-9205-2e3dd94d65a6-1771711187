import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Building2, FileText, History, Loader2, Pencil, Trash2, MapPin, Route } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import DocumentManager from "@/components/documents/DocumentManager";
import { MachinePhotoUpload } from "@/components/Equipment/MachinePhotoUpload";
import { MachineEventTimeline } from "@/components/MachineEventTimeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/services/apiClient";
import { getMachineSnapshot } from "@/lib/machineWorkspaceApi";
import MachineQuickActions from "@/components/Equipment/MachineQuickActions";
import MachineSummaryHero from "@/components/Equipment/MachineSummaryHero";

type OrgType = "manufacturer" | "customer" | "enterprise";

export default function EquipmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { t } = useLanguage();
  const { loading: authLoading, organization, membership } = useAuth() as any;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);

  const resolvedId = useMemo(() => (typeof id === "string" ? id : null), [id]);
  const userRole = membership?.role ?? "technician";
  const orgType = (organization?.type as OrgType | undefined) ?? null;
  const orgId = organization?.id ?? null;

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
        toast({
          title: t("common.error") || "Errore",
          description: error?.message || t("equipment.loadError") || "Errore caricamento macchina",
          variant: "destructive",
        });
        void router.replace("/equipment");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [resolvedId, authLoading, router, t, toast]);

  const handleDeleteMachine = async () => {
    if (!snapshot?.machine) return;

    if (!confirm(`${t("equipment.deleteConfirm") || "Confermi?"} "${snapshot.machine.name || snapshot.machine.id}"`)) {
      return;
    }

    setDeleting(true);

    try {
      await apiFetch(`/api/machines/${snapshot.machine.id}/delete`, { method: "DELETE" });
      toast({
        title: t("equipment.movedToTrash") || "Macchina spostata nel cestino",
        description: snapshot.machine.name || snapshot.machine.id,
      });
      void router.push("/equipment");
    } catch (error: any) {
      console.error(error);
      toast({
        title: t("common.error") || "Errore",
        description: error?.message || "Delete error",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <OrgContextGuard>
        <MainLayout userRole={userRole as any}>
          <SEO title={`${t("machines.title") || "Macchine"} - MACHINA`} />
          <div className="mx-auto max-w-7xl px-4 py-8">
            <Card className="rounded-2xl">
              <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("machines.loading") || "Caricamento..."}
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      </OrgContextGuard>
    );
  }

  if (!snapshot?.machine) {
    return (
      <OrgContextGuard>
        <MainLayout userRole={userRole as any}>
          <SEO title={`${t("machines.title") || "Macchine"} - MACHINA`} />
          <div className="mx-auto max-w-7xl px-4 py-8">
            <Card className="rounded-2xl">
              <CardContent className="py-10 text-muted-foreground">
                {t("machines.noResults") || "Nessun risultato"}
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      </OrgContextGuard>
    );
  }

  const machine = snapshot.machine;
  const assignedCustomerName = snapshot.assignedCustomerName || null;
  const plantName = snapshot.plant?.name || snapshot.plant?.code || null;
  const areaValue = machine.area || snapshot.line?.name || snapshot.line?.code || null;
  const missingContext = orgType === "manufacturer" && assignedCustomerName && !plantName;

  return (
    <OrgContextGuard>
      <MainLayout userRole={userRole as any}>
        <SEO title={`${machine.name ?? (t("machines.title") || "Macchine")} - MACHINA`} />

        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Button variant="outline" onClick={() => router.push("/equipment")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("nav.equipment") || "Macchine"}
            </Button>

            <div className="flex flex-wrap gap-2">
              {snapshot.can_edit_machine && (
                <Link href={`/equipment/${machine.id}/edit`}>
                  <Button variant="outline">
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("equipment.editMachine") || "Modifica macchina"}
                  </Button>
                </Link>
              )}

              {snapshot.can_delete_machine && (
                <Button variant="destructive" onClick={handleDeleteMachine} disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {t("equipment.moveToTrash") || "Sposta nel cestino"}
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
            orgType={orgType as any}
            ownerOrganizationName={snapshot.ownerOrganization?.name ?? organization?.name ?? null}
            assignedCustomerName={assignedCustomerName}
            plantName={plantName}
            lineName={areaValue}
            createdAt={machine.created_at}
          />

          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <div className="space-y-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>{t("equipment.photo") || "Foto"}</CardTitle>
                  <CardDescription>{t("equipment.photoDesc") || "Foto macchina"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <MachinePhotoUpload
                    machineId={machine.id}
                    currentPhotoUrl={machine.photo_url ?? null}
                    onPhotoChange={(url) =>
                      setSnapshot((prev: any) => ({
                        ...prev,
                        machine: { ...prev.machine, photo_url: url },
                      }))
                    }
                    readonly={!snapshot.can_edit_machine}
                  />
                </CardContent>
              </Card>

              <MachineQuickActions machineId={machine.id} canEdit={snapshot.can_edit_machine} />

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>{t("equipment.quickInfo") || "Info rapide"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label={t("equipment.internalCode") || "Codice interno"} value={machine.internal_code} />
                  <InfoRow label={t("machines.serialNumber") || "Seriale"} value={machine.serial_number} />
                  <InfoRow label={t("machines.manufacturer") || "Costruttore"} value={machine.brand} />
                  <InfoRow label={t("machines.model") || "Modello"} value={machine.model} />
                  <InfoRow
                    label={orgType === "manufacturer" ? "Cliente" : t("plants.fallbackPlant") || "Stabilimento"}
                    value={assignedCustomerName || plantName}
                  />
                  <InfoRow
                    label={orgType === "manufacturer" ? "Stabilimento cliente" : t("plants.fallbackPlant") || "Stabilimento"}
                    value={plantName}
                  />
                  <InfoRow label="Area / linea" value={areaValue} />
                  <InfoRow label={t("equipment.owner") || "Owner"} value={snapshot.ownerOrganization?.name || organization?.name} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>{t("equipment.machineContext") || "Contesto macchina"}</CardTitle>
                  <CardDescription>
                    {orgType === "manufacturer"
                      ? "Per il costruttore il contesto operativo dipende da cliente assegnato, stabilimento cliente e area/linea della macchina."
                      : "Contesto operativo della macchina nello stabilimento aziendale."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <ContextCard
                    icon={<Building2 className="h-5 w-5" />}
                    title={orgType === "manufacturer" ? "Cliente assegnato" : "Stabilimento"}
                    value={assignedCustomerName || "—"}
                    tone="blue"
                  />
                  <ContextCard
                    icon={<MapPin className="h-5 w-5" />}
                    title={orgType === "manufacturer" ? "Stabilimento cliente" : "Plant"}
                    value={plantName || "—"}
                    tone="orange"
                  />
                  <ContextCard
                    icon={<Route className="h-5 w-5" />}
                    title="Area / linea"
                    value={areaValue || "—"}
                    tone="blue"
                  />
                </CardContent>
              </Card>

              {missingContext && (
                <Card className="rounded-2xl border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/20">
                  <CardHeader>
                    <CardTitle className="text-base">Contesto cliente incompleto</CardTitle>
                    <CardDescription>
                      La macchina è assegnata a un cliente ma non ha ancora uno stabilimento cliente associato. Puoi completarlo da{" "}
                      <strong>Assegnazioni</strong> oppure dal dettaglio <strong>Cliente</strong> creando prima almeno uno
                      stabilimento cliente.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>{t("equipment.notes") || "Note"}</CardTitle>
                  <CardDescription>{t("equipment.notesDesc") || "Note macchina"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-foreground">
                    {machine.notes || (t("equipment.noNotes") || "Nessuna nota")}
                  </div>
                </CardContent>
              </Card>

              <section id="machine-timeline">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      {t("equipment.timeline") || "Timeline"}
                    </CardTitle>
                    <CardDescription>{t("equipment.timelineDesc") || "Eventi macchina"}</CardDescription>
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
                      {t("documents.title") || "Documenti"}
                    </CardTitle>
                    <CardDescription>{t("equipment.docsDesc") || "Documentazione tecnica"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DocumentManager
                      machineId={machine.id}
                      machineOwnerOrgId={machine.organization_id}
                      currentOrgId={orgId}
                      currentOrgType={orgType as any}
                      currentUserRole={userRole}
                    />
                  </CardContent>
                </Card>
              </section>
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
      <div className="max-w-[60%] break-words text-right text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

function ContextCard({
  icon,
  title,
  value,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  tone: "orange" | "blue";
}) {
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