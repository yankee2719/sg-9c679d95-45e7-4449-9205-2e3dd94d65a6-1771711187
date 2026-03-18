import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Activity,
    Building2,
    ClipboardList,
    Factory,
    FileText,
    PackageCheck,
    Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QuickActionsPanel from "@/components/dashboard/QuickActionsPanel";
import UrgentIssuesPanel, {
    type UrgentIssue,
} from "@/components/dashboard/UrgentIssuesPanel";
import QuickExportPanel from "@/components/dashboard/QuickExportPanel";
import EmptyState from "@/components/feedback/EmptyState";

type OrgType = "manufacturer" | "customer" | null;

interface DashboardKpis {
    machineCount: number;
    customerCount: number;
    activeAssignments: number;
    openWorkOrders: number;
    overdueWorkOrders: number;
    activeChecklists: number;
    activeDocuments: number;
}

interface RecentActivityRow {
    id: string;
    entity_type: string | null;
    action: string | null;
    created_at: string;
    entity_id: string | null;
    machine_id: string | null;
    metadata?: any;
}

interface RecentMachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    lifecycle_state: string | null;
    updated_at: string | null;
    photo_url?: string | null;
}

const copy = {
    it: {
        seo: "Dashboard - MACHINA",
        subtitleManufacturer:
            "Panoramica operativa del costruttore: clienti, macchine, assegnazioni e attività recenti.",
        subtitleCustomer:
            "Panoramica operativa del cliente finale: macchine, documenti, manutenzione e attività recenti.",
        machineCount: "Macchine",
        customerCount: "Clienti",
        activeAssignments: "Assegnazioni attive",
        openWorkOrders: "Work orders aperti",
        overdueWorkOrders: "Work orders in ritardo",
        activeChecklists: "Template checklist attivi",
        activeDocuments: "Documenti attivi",
        recentMachines: "Macchine recenti",
        recentActivity: "Attività recente",
        openEquipment: "Apri macchine",
        openCustomers: "Apri clienti",
        noMachinesTitle: "Nessuna macchina presente",
        noMachinesDescription:
            "Aggiungi la prima macchina per iniziare a costruire il digital passport operativo.",
        createMachine: "Crea macchina",
        noActivityTitle: "Ancora nessuna attività",
        noActivityDescription:
            "Le attività recenti compariranno qui quando inizierai a usare work orders, documenti e checklist.",
    },
    en: {
        seo: "Dashboard - MACHINA",
        subtitleManufacturer:
            "Manufacturer operational overview: customers, machines, assignments and recent activity.",
        subtitleCustomer:
            "Customer operational overview: machines, documents, maintenance and recent activity.",
        machineCount: "Machines",
        customerCount: "Customers",
        activeAssignments: "Active assignments",
        openWorkOrders: "Open work orders",
        overdueWorkOrders: "Overdue work orders",
        activeChecklists: "Active checklist templates",
        activeDocuments: "Active documents",
        recentMachines: "Recent machines",
        recentActivity: "Recent activity",
        openEquipment: "Open machines",
        openCustomers: "Open customers",
        noMachinesTitle: "No machines found",
        noMachinesDescription:
            "Add your first machine to start building the operational digital passport.",
        createMachine: "Create machine",
        noActivityTitle: "No activity yet",
        noActivityDescription:
            "Recent activity will appear here when work orders, documents and checklists start moving.",
    },
    fr: {
        seo: "Tableau de bord - MACHINA",
        subtitleManufacturer:
            "Vue opérationnelle du constructeur : clients, machines, affectations et activité récente.",
        subtitleCustomer:
            "Vue opérationnelle du client final : machines, documents, maintenance et activité récente.",
        machineCount: "Machines",
        customerCount: "Clients",
        activeAssignments: "Affectations actives",
        openWorkOrders: "Ordres de travail ouverts",
        overdueWorkOrders: "Ordres en retard",
        activeChecklists: "Modèles de checklist actifs",
        activeDocuments: "Documents actifs",
        recentMachines: "Machines récentes",
        recentActivity: "Activité récente",
        openEquipment: "Ouvrir les machines",
        openCustomers: "Ouvrir les clients",
        noMachinesTitle: "Aucune machine présente",
        noMachinesDescription:
            "Ajoutez la première machine pour démarrer le passeport numérique opérationnel.",
        createMachine: "Créer une machine",
        noActivityTitle: "Aucune activité pour l’instant",
        noActivityDescription:
            "L’activité récente apparaîtra ici lorsque les work orders, documents et checklists seront utilisés.",
    },
    es: {
        seo: "Dashboard - MACHINA",
        subtitleManufacturer:
            "Resumen operativo del fabricante: clientes, máquinas, asignaciones y actividad reciente.",
        subtitleCustomer:
            "Resumen operativo del cliente final: máquinas, documentos, mantenimiento y actividad reciente.",
        machineCount: "Máquinas",
        customerCount: "Clientes",
        activeAssignments: "Asignaciones activas",
        openWorkOrders: "Work orders abiertas",
        overdueWorkOrders: "Work orders atrasadas",
        activeChecklists: "Plantillas checklist activas",
        activeDocuments: "Documentos activos",
        recentMachines: "Máquinas recientes",
        recentActivity: "Actividad reciente",
        openEquipment: "Abrir máquinas",
        openCustomers: "Abrir clientes",
        noMachinesTitle: "No hay máquinas",
        noMachinesDescription:
            "Añade la primera máquina para empezar a construir el digital passport operativo.",
        createMachine: "Crear máquina",
        noActivityTitle: "Todavía no hay actividad",
        noActivityDescription:
            "La actividad reciente aparecerá aquí cuando empieces a usar work orders, documentos y checklists.",
    },
} as const;

function formatDate(value: string | null | undefined, locale: string) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString(locale, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
}

function getLocale(language: string) {
    switch (language) {
        case "it":
            return "it-IT";
        case "fr":
            return "fr-FR";
        case "es":
            return "es-ES";
        default:
            return "en-GB";
    }
}

function activityLabel(row: RecentActivityRow) {
    const entity = row.entity_type || "entity";
    const action = row.action || "update";

    if (entity === "machine" && action === "create") return "Macchina creata";
    if (entity === "machine" && action === "restore") return "Macchina ripristinata";
    if (entity === "machine" && action === "soft_delete") return "Macchina nel cestino";
    if (entity === "organization" && action === "create") return "Cliente creato";
    if (entity === "organization" && action === "restore") return "Cliente ripristinato";
    if (entity === "organization" && action === "soft_delete")
        return "Cliente nel cestino";
    if (entity === "document" && action === "create") return "Documento creato";
    if (entity === "document" && action === "restore") return "Documento ripristinato";
    if (entity === "document" && action === "soft_delete")
        return "Documento nel cestino";
    if (entity === "user_membership" && action === "create") return "Utente aggiunto";
    if (entity === "user_membership" && action === "update")
        return "Utente aggiornato";

    return `${entity} · ${action}`;
}

function KpiCard({
    icon,
    title,
    value,
    tone = "default",
}: {
    icon: React.ReactNode;
    title: string;
    value: number;
    tone?: "default" | "warning";
}) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div
                    className={`mt-2 text-sm ${tone === "warning"
                            ? "text-amber-600 dark:text-amber-300"
                            : "text-muted-foreground"
                        }`}
                >
                    {title}
                </div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { language } = useLanguage();
    const text = copy[language as keyof typeof copy] ?? copy.en;
    const locale = getLocale(language);

    const {
        loading: authLoading,
        organization,
        membership,
        shouldEnforceMfa,
    } = useAuth();

    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState < DashboardKpis > ({
        machineCount: 0,
        customerCount: 0,
        activeAssignments: 0,
        openWorkOrders: 0,
        overdueWorkOrders: 0,
        activeChecklists: 0,
        activeDocuments: 0,
    });
    const [recentMachines, setRecentMachines] = useState < RecentMachineRow[] > ([]);
    const [recentActivity, setRecentActivity] = useState < RecentActivityRow[] > ([]);

    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";

    const canManage = ["owner", "admin", "supervisor"].includes(userRole);
    const canOperate = ["owner", "admin", "supervisor", "technician"].includes(
        userRole
    );

    useEffect(() => {
        let active = true;

        const loadDashboard = async () => {
            if (authLoading) return;

            if (!orgId || !orgType) {
                if (active) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const nowIso = new Date().toISOString();

                const machineBaseQuery = supabase
                    .from("machines")
                    .select(
                        "id, name, internal_code, lifecycle_state, updated_at, photo_url",
                        { count: "exact" }
                    )
                    .eq("is_archived", false)
                    .or("is_deleted.is.null,is_deleted.eq.false")
                    .order("updated_at", { ascending: false })
                    .limit(6);

                const assignmentsQuery = supabase
                    .from("machine_assignments")
                    .select(
                        "machine_id, customer_org_id, manufacturer_org_id, is_active",
                        { count: "exact" }
                    )
                    .eq("is_active", true);

                const checklistQuery = supabase
                    .from("checklist_templates")
                    .select("id", { count: "exact", head: true })
                    .eq("organization_id", orgId)
                    .eq("is_active", true);

                const documentsQuery = supabase
                    .from("documents")
                    .select("id", { count: "exact", head: true })
                    .eq("organization_id", orgId)
                    .eq("is_archived", false);

                const auditQuery = supabase
                    .from("audit_logs")
                    .select(
                        "id, entity_type, action, created_at, entity_id, machine_id, metadata"
                    )
                    .eq("organization_id", orgId)
                    .order("created_at", { ascending: false })
                    .limit(8);

                const workOrdersQuery = supabase
                    .from("work_orders")
                    .select("id, title, status, due_date, machine_id", { count: "exact" })
                    .eq("organization_id", orgId)
                    .order("due_date", { ascending: true })
                    .limit(12);

                if (orgType === "manufacturer") {
                    const [
                        machineRes,
                        assignmentRes,
                        checklistRes,
                        documentsRes,
                        auditRes,
                        workOrdersRes,
                        customerRes,
                    ] = await Promise.all([
                        machineBaseQuery.eq("organization_id", orgId),
                        assignmentsQuery.eq("manufacturer_org_id", orgId),
                        checklistQuery,
                        documentsQuery,
                        auditQuery,
                        workOrdersQuery,
                        supabase
                            .from("organizations")
                            .select("id", { count: "exact", head: true })
                            .eq("manufacturer_org_id", orgId)
                            .eq("type", "customer")
                            .or("is_deleted.is.null,is_deleted.eq.false"),
                    ]);

                    if (machineRes.error) throw machineRes.error;
                    if (assignmentRes.error) throw assignmentRes.error;
                    if (checklistRes.error) throw checklistRes.error;
                    if (documentsRes.error) throw documentsRes.error;
                    if (auditRes.error) throw auditRes.error;
                    if (workOrdersRes.error) throw workOrdersRes.error;
                    if (customerRes.error) throw customerRes.error;

                    const overdueWorkOrders = (workOrdersRes.data ?? []).filter((row: any) => {
                        const status = String(row.status ?? "").toLowerCase();
                        const dueDate = row.due_date
                            ? new Date(row.due_date).toISOString()
                            : null;
                        return (
                            !!dueDate &&
                            dueDate < nowIso &&
                            !["completed", "closed", "cancelled"].includes(status)
                        );
                    }).length;

                    if (!active) return;

                    setKpis({
                        machineCount: machineRes.count ?? 0,
                        customerCount: customerRes.count ?? 0,
                        activeAssignments: assignmentRes.count ?? 0,
                        openWorkOrders: (workOrdersRes.data ?? []).filter((row: any) => {
                            const status = String(row.status ?? "").toLowerCase();
                            return !["completed", "closed", "cancelled"].includes(status);
                        }).length,
                        overdueWorkOrders,
                        activeChecklists: checklistRes.count ?? 0,
                        activeDocuments: documentsRes.count ?? 0,
                    });

                    setRecentMachines((machineRes.data ?? []) as RecentMachineRow[]);
                    setRecentActivity((auditRes.data ?? []) as RecentActivityRow[]);
                } else {
                    const [
                        ownMachinesRes,
                        assignmentsRes,
                        checklistRes,
                        documentsRes,
                        auditRes,
                        workOrdersRes,
                    ] = await Promise.all([
                        machineBaseQuery.eq("organization_id", orgId),
                        assignmentsQuery.eq("customer_org_id", orgId),
                        checklistQuery,
                        documentsQuery,
                        auditQuery,
                        workOrdersQuery,
                    ]);

                    if (ownMachinesRes.error) throw ownMachinesRes.error;
                    if (assignmentsRes.error) throw assignmentsRes.error;
                    if (checklistRes.error) throw checklistRes.error;
                    if (documentsRes.error) throw documentsRes.error;
                    if (auditRes.error) throw auditRes.error;
                    if (workOrdersRes.error) throw workOrdersRes.error;

                    const assignedMachineIds = Array.from(
                        new Set(
                            (assignmentsRes.data ?? [])
                                .map((x: any) => x.machine_id)
                                .filter(Boolean)
                        )
                    );

                    let assignedMachinesRows: any[] = [];
                    if (assignedMachineIds.length > 0) {
                        const assignedMachinesRes = await supabase
                            .from("machines")
                            .select(
                                "id, name, internal_code, lifecycle_state, updated_at, photo_url"
                            )
                            .in("id", assignedMachineIds)
                            .eq("is_archived", false)
                            .or("is_deleted.is.null,is_deleted.eq.false")
                            .order("updated_at", { ascending: false });

                        if (assignedMachinesRes.error) throw assignedMachinesRes.error;
                        assignedMachinesRows = assignedMachinesRes.data ?? [];
                    }

                    const mergedMachinesMap = new Map < string, RecentMachineRow> ();
                    for (const row of ownMachinesRes.data ?? []) {
                        mergedMachinesMap.set(row.id, row as RecentMachineRow);
                    }
                    for (const row of assignedMachinesRows) {
                        mergedMachinesMap.set(row.id, row as RecentMachineRow);
                    }

                    const mergedMachines = Array.from(mergedMachinesMap.values()).sort(
                        (a, b) => {
                            const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                            const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                            return db - da;
                        }
                    );

                    const overdueWorkOrders = (workOrdersRes.data ?? []).filter((row: any) => {
                        const status = String(row.status ?? "").toLowerCase();
                        const dueDate = row.due_date
                            ? new Date(row.due_date).toISOString()
                            : null;
                        return (
                            !!dueDate &&
                            dueDate < nowIso &&
                            !["completed", "closed", "cancelled"].includes(status)
                        );
                    }).length;

                    if (!active) return;

                    setKpis({
                        machineCount: mergedMachines.length,
                        customerCount: 0,
                        activeAssignments: assignmentsRes.count ?? 0,
                        openWorkOrders: (workOrdersRes.data ?? []).filter((row: any) => {
                            const status = String(row.status ?? "").toLowerCase();
                            return !["completed", "closed", "cancelled"].includes(status);
                        }).length,
                        overdueWorkOrders,
                        activeChecklists: checklistRes.count ?? 0,
                        activeDocuments: documentsRes.count ?? 0,
                    });

                    setRecentMachines(mergedMachines.slice(0, 6));
                    setRecentActivity((auditRes.data ?? []) as RecentActivityRow[]);
                }
            } catch (error) {
                console.error("Dashboard load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadDashboard();

        return () => {
            active = false;
        };
    }, [authLoading, orgId, orgType]);

    const issues = useMemo < UrgentIssue[] > (() => {
        const result: UrgentIssue[] = [];

        if (kpis.overdueWorkOrders > 0) {
            result.push({
                id: "overdue-workorders",
                title: `${kpis.overdueWorkOrders} work orders in ritardo`,
                description:
                    "Ci sono ordini di lavoro oltre la scadenza. Questo è il primo punto da sistemare in demo e in uso reale.",
                href: "/work-orders",
                tone: "high",
                ctaLabel: "Apri work orders",
            });
        }

        if (orgType === "manufacturer" && kpis.customerCount === 0) {
            result.push({
                id: "no-customers",
                title: "Nessun cliente caricato",
                description:
                    "Se vuoi vendere MACHINA, senza clienti demo la piattaforma sembra ancora vuota.",
                href: "/customers/new",
                tone: "medium",
                ctaLabel: "Crea cliente",
            });
        }

        if (kpis.machineCount === 0) {
            result.push({
                id: "no-machines",
                title: "Nessuna macchina presente",
                description:
                    "La scheda macchina è il cuore del prodotto. Va popolata subito con un dataset credibile.",
                href: "/equipment/new",
                tone: "high",
                ctaLabel: "Crea macchina",
            });
        }

        if (kpis.activeDocuments === 0) {
            result.push({
                id: "no-documents",
                title: "Archivio documentale vuoto",
                description:
                    "Senza documenti la piattaforma perde subito credibilità in demo.",
                href: "/documents",
                tone: "info",
                ctaLabel: "Apri documenti",
            });
        }

        if (kpis.activeChecklists === 0) {
            result.push({
                id: "no-checklists",
                title: "Nessun template checklist attivo",
                description:
                    "Aggiungi almeno un template per mostrare operatività reale e controllo processi.",
                href: "/checklists/templates",
                tone: "info",
                ctaLabel: "Apri checklist",
            });
        }

        if (canManage && shouldEnforceMfa) {
            result.push({
                id: "security-review",
                title: "Verifica il setup sicurezza degli utenti chiave",
                description:
                    "Per una demo forte, conviene mostrare MFA attiva almeno sugli account amministrativi.",
                href: "/settings/security",
                tone: "info",
                ctaLabel: "Apri sicurezza",
            });
        }

        return result.slice(0, 4);
    }, [kpis, orgType, canManage, shouldEnforceMfa]);

    const dashboardSubtitle =
        orgType === "manufacturer"
            ? text.subtitleManufacturer
            : text.subtitleCustomer;

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={text.seo} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                Caricamento dashboard...
                            </CardContent>
                        </Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={text.seo} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">
                            Dashboard
                        </h1>
                        <p className="text-base text-muted-foreground">
                            {dashboardSubtitle}
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            icon={<Factory className="h-5 w-5" />}
                            title={text.machineCount}
                            value={kpis.machineCount}
                        />

                        {orgType === "manufacturer" ? (
                            <KpiCard
                                icon={<Building2 className="h-5 w-5" />}
                                title={text.customerCount}
                                value={kpis.customerCount}
                            />
                        ) : (
                            <KpiCard
                                icon={<PackageCheck className="h-5 w-5" />}
                                title={text.activeAssignments}
                                value={kpis.activeAssignments}
                            />
                        )}

                        <KpiCard
                            icon={<ClipboardList className="h-5 w-5" />}
                            title={text.openWorkOrders}
                            value={kpis.openWorkOrders}
                        />

                        <KpiCard
                            icon={<Wrench className="h-5 w-5" />}
                            title={text.overdueWorkOrders}
                            value={kpis.overdueWorkOrders}
                            tone={kpis.overdueWorkOrders > 0 ? "warning" : "default"}
                        />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <KpiCard
                            icon={<PackageCheck className="h-5 w-5" />}
                            title={text.activeChecklists}
                            value={kpis.activeChecklists}
                        />

                        <KpiCard
                            icon={<FileText className="h-5 w-5" />}
                            title={text.activeDocuments}
                            value={kpis.activeDocuments}
                        />

                        <KpiCard
                            icon={<Activity className="h-5 w-5" />}
                            title={text.activeAssignments}
                            value={kpis.activeAssignments}
                        />
                    </div>

                    <QuickActionsPanel
                        orgType={orgType}
                        canManage={canManage}
                        canOperate={canOperate}
                    />

                    <QuickExportPanel orgType={orgType} />

                    <UrgentIssuesPanel issues={issues} />

                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <Card className="rounded-2xl">
                            <CardContent className="p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <div className="text-xl font-semibold text-foreground">
                                        {text.recentMachines}
                                    </div>

                                    <Link
                                        href="/equipment"
                                        className="text-sm font-medium text-orange-500 hover:underline"
                                    >
                                        {text.openEquipment}
                                    </Link>
                                </div>

                                {recentMachines.length === 0 ? (
                                    <EmptyState
                                        title={text.noMachinesTitle}
                                        description={text.noMachinesDescription}
                                        icon={<Factory className="h-10 w-10" />}
                                        actionLabel={text.createMachine}
                                        actionHref="/equipment/new"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {recentMachines.map((machine) => (
                                            <Link
                                                key={machine.id}
                                                href={`/equipment/${machine.id}`}
                                                className="block"
                                            >
                                                <div className="rounded-2xl border border-border p-4 transition hover:bg-muted/40">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="truncate font-semibold text-foreground">
                                                                {machine.name || "Macchina"}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {machine.internal_code || "—"}
                                                            </div>
                                                            <div className="mt-2 text-xs text-muted-foreground">
                                                                Aggiornata:{" "}
                                                                {formatDate(
                                                                    machine.updated_at,
                                                                    locale
                                                                )}
                                                            </div>
                                                        </div>

                                                        {machine.lifecycle_state && (
                                                            <Badge variant="outline">
                                                                {machine.lifecycle_state}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl">
                            <CardContent className="p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <div className="text-xl font-semibold text-foreground">
                                        {text.recentActivity}
                                    </div>

                                    {orgType === "manufacturer" ? (
                                        <Link
                                            href="/customers"
                                            className="text-sm font-medium text-orange-500 hover:underline"
                                        >
                                            {text.openCustomers}
                                        </Link>
                                    ) : null}
                                </div>

                                {recentActivity.length === 0 ? (
                                    <EmptyState
                                        title={text.noActivityTitle}
                                        description={text.noActivityDescription}
                                        icon={<Activity className="h-10 w-10" />}
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {recentActivity.map((row) => (
                                            <div
                                                key={row.id}
                                                className="rounded-2xl border border-border p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-foreground">
                                                            {activityLabel(row)}
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {row.entity_type || "entity"} ·{" "}
                                                            {row.action || "update"}
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 text-xs text-muted-foreground">
                                                        {formatDate(row.created_at, locale)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}