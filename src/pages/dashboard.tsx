import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import DashboardCharts from "@/components/dashboard/DashboardCharts";

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

// ─── CACHE: evita di rifare 7 query se i dati hanno meno di 30 secondi ───
interface DashboardCache {
    kpis: DashboardKpis;
    recentMachines: RecentMachineRow[];
    recentActivity: RecentActivityRow[];
    orgId: string;
    orgType: OrgType;
    timestamp: number;
}

const STALE_TIME = 30_000;

// ─── i18n COMPLETO: UI + activity log + urgent issues ───
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
        loadingDashboard: "Caricamento dashboard...",
        updatedAt: "Aggiornata",
        defaultMachineName: "Macchina",
        activity_machine_create: "Macchina creata",
        activity_machine_restore: "Macchina ripristinata",
        activity_machine_soft_delete: "Macchina nel cestino",
        activity_organization_create: "Cliente creato",
        activity_organization_restore: "Cliente ripristinato",
        activity_organization_soft_delete: "Cliente nel cestino",
        activity_document_create: "Documento creato",
        activity_document_restore: "Documento ripristinato",
        activity_document_soft_delete: "Documento nel cestino",
        activity_user_membership_create: "Utente aggiunto",
        activity_user_membership_update: "Utente aggiornato",
        urgentOverdueTitle: "work orders in ritardo",
        urgentOverdueDesc:
            "Ci sono ordini di lavoro oltre la scadenza. Questo è il primo punto da sistemare in demo e in uso reale.",
        urgentOverdueCta: "Apri work orders",
        urgentNoCustomersTitle: "Nessun cliente caricato",
        urgentNoCustomersDesc:
            "Se vuoi vendere MACHINA, senza clienti demo la piattaforma sembra ancora vuota.",
        urgentNoCustomersCta: "Crea cliente",
        urgentNoMachinesTitle: "Nessuna macchina presente",
        urgentNoMachinesDesc:
            "La scheda macchina è il cuore del prodotto. Va popolata subito con un dataset credibile.",
        urgentNoMachinesCta: "Crea macchina",
        urgentNoDocsTitle: "Archivio documentale vuoto",
        urgentNoDocsDesc:
            "Senza documenti la piattaforma perde subito credibilità in demo.",
        urgentNoDocsCta: "Apri documenti",
        urgentNoChecklistsTitle: "Nessun template checklist attivo",
        urgentNoChecklistsDesc:
            "Aggiungi almeno un template per mostrare operatività reale e controllo processi.",
        urgentNoChecklistsCta: "Apri checklist",
        urgentSecurityTitle: "Verifica il setup sicurezza degli utenti chiave",
        urgentSecurityDesc:
            "Per una demo forte, conviene mostrare MFA attiva almeno sugli account amministrativi.",
        urgentSecurityCta: "Apri sicurezza",
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
        loadingDashboard: "Loading dashboard...",
        updatedAt: "Updated",
        defaultMachineName: "Machine",
        activity_machine_create: "Machine created",
        activity_machine_restore: "Machine restored",
        activity_machine_soft_delete: "Machine trashed",
        activity_organization_create: "Customer created",
        activity_organization_restore: "Customer restored",
        activity_organization_soft_delete: "Customer trashed",
        activity_document_create: "Document created",
        activity_document_restore: "Document restored",
        activity_document_soft_delete: "Document trashed",
        activity_user_membership_create: "User added",
        activity_user_membership_update: "User updated",
        urgentOverdueTitle: "overdue work orders",
        urgentOverdueDesc:
            "There are work orders past their due date. This should be the first thing to fix.",
        urgentOverdueCta: "Open work orders",
        urgentNoCustomersTitle: "No customers loaded",
        urgentNoCustomersDesc:
            "Without demo customers the platform looks empty.",
        urgentNoCustomersCta: "Create customer",
        urgentNoMachinesTitle: "No machines found",
        urgentNoMachinesDesc:
            "The machine card is the core of the product. It should be populated with credible data.",
        urgentNoMachinesCta: "Create machine",
        urgentNoDocsTitle: "Empty document archive",
        urgentNoDocsDesc:
            "Without documents the platform loses credibility in demos.",
        urgentNoDocsCta: "Open documents",
        urgentNoChecklistsTitle: "No active checklist templates",
        urgentNoChecklistsDesc:
            "Add at least one template to show real operational control.",
        urgentNoChecklistsCta: "Open checklists",
        urgentSecurityTitle: "Review security setup for key users",
        urgentSecurityDesc:
            "For a strong demo, MFA should be active on admin accounts.",
        urgentSecurityCta: "Open security",
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
        noActivityTitle: "Aucune activité pour l'instant",
        noActivityDescription:
            "L'activité récente apparaîtra ici lorsque les work orders, documents et checklists seront utilisés.",
        loadingDashboard: "Chargement du tableau de bord...",
        updatedAt: "Mise à jour",
        defaultMachineName: "Machine",
        activity_machine_create: "Machine créée",
        activity_machine_restore: "Machine restaurée",
        activity_machine_soft_delete: "Machine mise à la corbeille",
        activity_organization_create: "Client créé",
        activity_organization_restore: "Client restauré",
        activity_organization_soft_delete: "Client mis à la corbeille",
        activity_document_create: "Document créé",
        activity_document_restore: "Document restauré",
        activity_document_soft_delete: "Document mis à la corbeille",
        activity_user_membership_create: "Utilisateur ajouté",
        activity_user_membership_update: "Utilisateur mis à jour",
        urgentOverdueTitle: "ordres de travail en retard",
        urgentOverdueDesc:
            "Il y a des ordres de travail au-delà de l'échéance.",
        urgentOverdueCta: "Ouvrir les ordres",
        urgentNoCustomersTitle: "Aucun client chargé",
        urgentNoCustomersDesc:
            "Sans clients démo, la plateforme semble encore vide.",
        urgentNoCustomersCta: "Créer un client",
        urgentNoMachinesTitle: "Aucune machine présente",
        urgentNoMachinesDesc:
            "La fiche machine est le cœur du produit.",
        urgentNoMachinesCta: "Créer une machine",
        urgentNoDocsTitle: "Archive documentaire vide",
        urgentNoDocsDesc:
            "Sans documents, la plateforme perd en crédibilité.",
        urgentNoDocsCta: "Ouvrir les documents",
        urgentNoChecklistsTitle: "Aucun modèle de checklist actif",
        urgentNoChecklistsDesc:
            "Ajoutez au moins un modèle pour montrer un contrôle opérationnel réel.",
        urgentNoChecklistsCta: "Ouvrir les checklists",
        urgentSecurityTitle: "Vérifiez la sécurité des utilisateurs clés",
        urgentSecurityDesc:
            "Pour une démo solide, le MFA doit être actif sur les comptes administrateurs.",
        urgentSecurityCta: "Ouvrir la sécurité",
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
        loadingDashboard: "Cargando dashboard...",
        updatedAt: "Actualizada",
        defaultMachineName: "Máquina",
        activity_machine_create: "Máquina creada",
        activity_machine_restore: "Máquina restaurada",
        activity_machine_soft_delete: "Máquina en papelera",
        activity_organization_create: "Cliente creado",
        activity_organization_restore: "Cliente restaurado",
        activity_organization_soft_delete: "Cliente en papelera",
        activity_document_create: "Documento creado",
        activity_document_restore: "Documento restaurado",
        activity_document_soft_delete: "Documento en papelera",
        activity_user_membership_create: "Usuario añadido",
        activity_user_membership_update: "Usuario actualizado",
        urgentOverdueTitle: "work orders atrasadas",
        urgentOverdueDesc:
            "Hay órdenes de trabajo fuera de plazo.",
        urgentOverdueCta: "Abrir work orders",
        urgentNoCustomersTitle: "Ningún cliente cargado",
        urgentNoCustomersDesc:
            "Sin clientes demo la plataforma parece vacía.",
        urgentNoCustomersCta: "Crear cliente",
        urgentNoMachinesTitle: "No hay máquinas",
        urgentNoMachinesDesc:
            "La ficha de máquina es el corazón del producto.",
        urgentNoMachinesCta: "Crear máquina",
        urgentNoDocsTitle: "Archivo documental vacío",
        urgentNoDocsDesc:
            "Sin documentos la plataforma pierde credibilidad.",
        urgentNoDocsCta: "Abrir documentos",
        urgentNoChecklistsTitle: "Ninguna plantilla checklist activa",
        urgentNoChecklistsDesc:
            "Añade al menos una plantilla para mostrar control operativo real.",
        urgentNoChecklistsCta: "Abrir checklists",
        urgentSecurityTitle: "Verifica la seguridad de los usuarios clave",
        urgentSecurityDesc:
            "Para una demo fuerte, el MFA debe estar activo en las cuentas de administrador.",
        urgentSecurityCta: "Abrir seguridad",
    },
} as const;

type CopyLang = (typeof copy)[keyof typeof copy];

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

// ─── FIX PUNTO 9: activityLabel usa le traduzioni invece di stringhe hardcoded ───
function activityLabel(row: RecentActivityRow, text: CopyLang) {
    const entity = row.entity_type || "entity";
    const action = row.action || "update";
    const key = `activity_${entity}_${action}` as keyof CopyLang;

    if (key in text) {
        return text[key] as string;
    }

    return `${entity} · ${action}`;
}

function KpiCard({
    icon,
    title,
    value,
    tone = "orange",
}: {
    icon: React.ReactNode;
    title: string;
    value: number;
    tone?: "orange" | "blue" | "emerald" | "violet" | "amber" | "rose" | "slate";
}) {
    const toneMap = {
        orange: "bg-orange-500/12 text-orange-500",
        blue: "bg-blue-500/12 text-blue-500",
        emerald: "bg-emerald-500/12 text-emerald-500",
        violet: "bg-violet-500/12 text-violet-500",
        amber: "bg-amber-500/12 text-amber-500",
        rose: "bg-rose-500/12 text-rose-500",
        slate: "bg-slate-500/12 text-slate-500",
    } as const;

    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[tone]}`}
                >
                    {icon}
                </div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { language } = useLanguage();
    const text = copy[(language as keyof typeof copy) || "it"] ?? copy.it;
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

    const cacheRef = useRef < DashboardCache | null > (null);

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

            // ─── CACHE CHECK ───
            const cached = cacheRef.current;
            if (
                cached &&
                cached.orgId === orgId &&
                cached.orgType === orgType &&
                Date.now() - cached.timestamp < STALE_TIME
            ) {
                if (active) {
                    setKpis(cached.kpis);
                    setRecentMachines(cached.recentMachines);
                    setRecentActivity(cached.recentActivity);
                    setLoading(false);
                }
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

                let nextKpis: DashboardKpis;
                let nextMachines: RecentMachineRow[];
                let nextActivity: RecentActivityRow[];

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

                    nextKpis = {
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
                    };

                    nextMachines = (machineRes.data ?? []) as RecentMachineRow[];
                    nextActivity = (auditRes.data ?? []) as RecentActivityRow[];
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

                    nextKpis = {
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
                    };

                    nextMachines = mergedMachines.slice(0, 6);
                    nextActivity = (auditRes.data ?? []) as RecentActivityRow[];
                }

                setKpis(nextKpis);
                setRecentMachines(nextMachines);
                setRecentActivity(nextActivity);

                cacheRef.current = {
                    kpis: nextKpis,
                    recentMachines: nextMachines,
                    recentActivity: nextActivity,
                    orgId,
                    orgType,
                    timestamp: Date.now(),
                };
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
                title: `${kpis.overdueWorkOrders} ${text.urgentOverdueTitle}`,
                description: text.urgentOverdueDesc,
                href: "/work-orders",
                tone: "high",
                ctaLabel: text.urgentOverdueCta,
            });
        }

        if (orgType === "manufacturer" && kpis.customerCount === 0) {
            result.push({
                id: "no-customers",
                title: text.urgentNoCustomersTitle,
                description: text.urgentNoCustomersDesc,
                href: "/customers/new",
                tone: "medium",
                ctaLabel: text.urgentNoCustomersCta,
            });
        }

        if (kpis.machineCount === 0) {
            result.push({
                id: "no-machines",
                title: text.urgentNoMachinesTitle,
                description: text.urgentNoMachinesDesc,
                href: "/equipment/new",
                tone: "high",
                ctaLabel: text.urgentNoMachinesCta,
            });
        }

        if (kpis.activeDocuments === 0) {
            result.push({
                id: "no-documents",
                title: text.urgentNoDocsTitle,
                description: text.urgentNoDocsDesc,
                href: "/documents",
                tone: "info",
                ctaLabel: text.urgentNoDocsCta,
            });
        }

        if (kpis.activeChecklists === 0) {
            result.push({
                id: "no-checklists",
                title: text.urgentNoChecklistsTitle,
                description: text.urgentNoChecklistsDesc,
                href: "/checklists/templates",
                tone: "info",
                ctaLabel: text.urgentNoChecklistsCta,
            });
        }

        if (canManage && shouldEnforceMfa) {
            result.push({
                id: "security-review",
                title: text.urgentSecurityTitle,
                description: text.urgentSecurityDesc,
                href: "/settings/security",
                tone: "info",
                ctaLabel: text.urgentSecurityCta,
            });
        }

        return result.slice(0, 4);
    }, [kpis, orgType, canManage, shouldEnforceMfa, text]);

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
                                {text.loadingDashboard}
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
                            tone="violet"
                        />

                        {orgType === "manufacturer" ? (
                            <KpiCard
                                icon={<Building2 className="h-5 w-5" />}
                                title={text.customerCount}
                                value={kpis.customerCount}
                                tone="blue"
                            />
                        ) : (
                            <KpiCard
                                icon={<PackageCheck className="h-5 w-5" />}
                                title={text.activeAssignments}
                                value={kpis.activeAssignments}
                                tone="blue"
                            />
                        )}

                        <KpiCard
                            icon={<ClipboardList className="h-5 w-5" />}
                            title={text.openWorkOrders}
                            value={kpis.openWorkOrders}
                            tone="emerald"
                        />

                        <KpiCard
                            icon={<Wrench className="h-5 w-5" />}
                            title={text.overdueWorkOrders}
                            value={kpis.overdueWorkOrders}
                            tone={kpis.overdueWorkOrders > 0 ? "amber" : "slate"}
                        />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <KpiCard
                            icon={<PackageCheck className="h-5 w-5" />}
                            title={text.activeChecklists}
                            value={kpis.activeChecklists}
                            tone="blue"
                        />

                        <KpiCard
                            icon={<FileText className="h-5 w-5" />}
                            title={text.activeDocuments}
                            value={kpis.activeDocuments}
                            tone="rose"
                        />

                        <KpiCard
                            icon={<Activity className="h-5 w-5" />}
                            title={text.activeAssignments}
                            value={kpis.activeAssignments}
                            tone="orange"
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
                                                                {machine.name || text.defaultMachineName}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {machine.internal_code || "—"}
                                                            </div>
                                                            <div className="mt-2 text-xs text-muted-foreground">
                                                                {text.updatedAt}:{" "}
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
                                                            {activityLabel(row, text)}
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
