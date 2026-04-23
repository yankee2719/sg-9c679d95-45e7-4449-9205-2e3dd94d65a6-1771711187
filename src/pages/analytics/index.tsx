import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiFetch } from "@/services/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import QuickExportPanel from "@/components/dashboard/QuickExportPanel";
import UrgentIssuesPanel, { type UrgentIssue } from "@/components/dashboard/UrgentIssuesPanel";
import { hasMinimumRole, normalizeRole } from "@/lib/roles";

type OrgType = "manufacturer" | "customer" | "enterprise" | "enterprise" | null;

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
    organization_id?: string | null;
}

interface DashboardSummaryResponse {
    kpis: DashboardKpis;
    recentMachines: RecentMachineRow[];
    recentActivity: RecentActivityRow[];
    generatedAt: string;
}

const copy = {
    it: {
        seo: "Analytics - MACHINA",
        title: "Analytics",
        subtitle:
            "Vista direzionale dell'operatività: KPI, distribuzione, criticità ed export.",
        loading: "Caricamento analytics...",
        generatedAt: "Dati aggiornati",
        summaryTitle: "Sintesi decisionale",
        summaryTextManufacturer:
            "Questa vista aiuta il costruttore a leggere carico operativo, clienti serviti, documentazione e manutenzione.",
        summaryTextCustomer:
            "Questa vista aiuta il cliente finale a leggere stato operativo, manutenzione, checklist e documentazione.",
        activityLoad: "Caricamento dati analytics in corso.",
        chartOverview: "Panoramica KPI",
        chartDistribution: "Distribuzione operativa",
        urgentOverdueTitle: "work orders in ritardo",
        urgentOverdueDesc: "Ci sono ordini di lavoro oltre la scadenza.",
        urgentOverdueCta: "Apri work orders",
        urgentNoCustomersTitle: "Nessun cliente caricato",
        urgentNoCustomersDesc: "Senza clienti demo la piattaforma sembra vuota.",
        urgentNoCustomersCta: "Crea cliente",
        urgentNoMachinesTitle: "Nessuna macchina presente",
        urgentNoMachinesDesc: "La scheda macchina è il cuore del prodotto.",
        urgentNoMachinesCta: "Crea macchina",
        urgentNoDocsTitle: "Archivio documentale vuoto",
        urgentNoDocsDesc: "Senza documenti la piattaforma perde credibilità in demo.",
        urgentNoDocsCta: "Apri documenti",
        urgentNoChecklistsTitle: "Nessun template checklist attivo",
        urgentNoChecklistsDesc: "Aggiungi almeno un template per mostrare operatività reale.",
        urgentNoChecklistsCta: "Apri checklist",
        urgentSecurityTitle: "Verifica il setup sicurezza",
        urgentSecurityDesc: "MFA attiva almeno sugli account amministrativi.",
        urgentSecurityCta: "Apri sicurezza",
        machineCount: "Macchine",
        customerCount: "Clienti",
        activeAssignments: "Assegnazioni attive",
        openWorkOrders: "Work orders aperti",
        overdueWorkOrders: "Work orders in ritardo",
        activeChecklists: "Template checklist attivi",
        activeDocuments: "Documenti attivi",
    },
    en: {
        seo: "Analytics - MACHINA",
        title: "Analytics",
        subtitle:
            "Decision view of operations: KPI, distribution, issues and export.",
        loading: "Loading analytics...",
        generatedAt: "Data updated",
        summaryTitle: "Decision summary",
        summaryTextManufacturer:
            "This view helps the manufacturer read operational load, served customers, documentation and maintenance.",
        summaryTextCustomer:
            "This view helps the customer read operational status, maintenance, checklists and documentation.",
        activityLoad: "Loading analytics data.",
        chartOverview: "KPI overview",
        chartDistribution: "Operational distribution",
        urgentOverdueTitle: "overdue work orders",
        urgentOverdueDesc: "There are work orders past their due date.",
        urgentOverdueCta: "Open work orders",
        urgentNoCustomersTitle: "No customers loaded",
        urgentNoCustomersDesc: "Without demo customers the platform looks empty.",
        urgentNoCustomersCta: "Create customer",
        urgentNoMachinesTitle: "No machines found",
        urgentNoMachinesDesc: "The machine card is the core of the product.",
        urgentNoMachinesCta: "Create machine",
        urgentNoDocsTitle: "Empty document archive",
        urgentNoDocsDesc: "Without documents the platform loses credibility.",
        urgentNoDocsCta: "Open documents",
        urgentNoChecklistsTitle: "No active checklist templates",
        urgentNoChecklistsDesc: "Add at least one template to show real operational control.",
        urgentNoChecklistsCta: "Open checklists",
        urgentSecurityTitle: "Review security setup",
        urgentSecurityDesc: "MFA should be active on admin accounts.",
        urgentSecurityCta: "Open security",
        machineCount: "Machines",
        customerCount: "Customers",
        activeAssignments: "Active assignments",
        openWorkOrders: "Open work orders",
        overdueWorkOrders: "Overdue work orders",
        activeChecklists: "Active checklist templates",
        activeDocuments: "Active documents",
    },
} as const;

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

export default function AnalyticsPage() {
    const { language } = useLanguage();
    const text = copy[(language as keyof typeof copy) || "it"] ?? copy.it;
    const locale = getLocale(language);

    const { loading: authLoading, organization, membership, shouldEnforceMfa } = useAuth();

    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = normalizeRole(membership?.role ?? null);
    const canManage = hasMinimumRole(userRole, "supervisor");

    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState<DashboardKpis>({
        machineCount: 0,
        customerCount: 0,
        activeAssignments: 0,
        openWorkOrders: 0,
        overdueWorkOrders: 0,
        activeChecklists: 0,
        activeDocuments: 0,
    });
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const data = await apiFetch<DashboardSummaryResponse>("/api/dashboard/summary");
                if (!active) return;

                setKpis(data.kpis);
                setGeneratedAt(data.generatedAt);
            } catch (error) {
                console.error("Analytics load error:", error);
            } finally {
                if (active) setLoading(false);
            }
        };

        if (!authLoading) {
            void load();
        }

        return () => {
            active = false;
        };
    }, [authLoading]);

    const issues = useMemo<UrgentIssue[]>(() => {
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

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={text.seo} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl">
                            <CardContent className="py-10 text-center text-muted-foreground">
                                {text.loading}
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
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                    {text.title}
                                </h1>
                                <p className="text-base text-muted-foreground">{text.subtitle}</p>
                            </div>
                        </div>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                {text.summaryTitle}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {orgType === "manufacturer"
                                    ? text.summaryTextManufacturer
                                    : text.summaryTextCustomer}
                            </p>
                            <div className="text-xs text-muted-foreground">
                                {text.generatedAt}: {formatDate(generatedAt, locale)}
                            </div>
                        </CardContent>
                    </Card>

                    <DashboardCharts
                        kpis={kpis}
                        orgType={orgType}
                        text={{
                            machineCount: text.machineCount,
                            customerCount: text.customerCount,
                            activeAssignments: text.activeAssignments,
                            openWorkOrders: text.openWorkOrders,
                            overdueWorkOrders: text.overdueWorkOrders,
                            activeChecklists: text.activeChecklists,
                            activeDocuments: text.activeDocuments,
                            chartOverview: text.chartOverview,
                            chartDistribution: text.chartDistribution,
                        }}
                    />

                    <UrgentIssuesPanel issues={issues} />

                    <QuickExportPanel orgType={orgType} />
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}