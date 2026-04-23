import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Calendar, Users, Package, Loader2, AlertCircle, ShieldAlert } from "lucide-react";

interface BillingOrganization {
    id: string;
    name: string;
    subscription_plan: string | null;
    subscription_status: string | null;
    max_users: number | null;
    max_machines: number | null;
    settings: Record<string, unknown> | null;
}

interface UsageStats {
    currentUsers: number;
    currentMachines: number;
}

const copy = {
    it: {
        title: "Fatturazione e abbonamento",
        subtitle: "Stato piano e limiti del contesto organizzativo attivo.",
        accessTitle: "Accesso limitato",
        accessDescription: "Solo admin e supervisor possono consultare questa sezione.",
        currentPlan: "Piano attuale",
        usage: "Utilizzo",
        limits: "Limiti inclusi",
        renewal: "Rinnovo / scadenza",
        paymentNoticeTitle: "Portale pagamenti non collegato",
        paymentNoticeDescription: "Nel modello organizations corrente questa pagina è stata riallineata in sola lettura. Il collegamento Stripe legacy basato su tenants non è stato mantenuto qui per evitare errori di schema.",
        status: {
            active: "Attivo",
            trial: "Trial",
            suspended: "Sospeso",
            cancelled: "Cancellato",
            unknown: "Non disponibile",
        },
        plan: {
            starter: "Starter",
            professional: "Professional",
            enterprise: "Enterprise",
            free: "Free",
            fallback: "Piano non definito",
        },
        metrics: {
            users: "Utenti",
            machines: "Macchine",
        },
        labels: {
            includedUsers: "Utenti inclusi",
            includedMachines: "Macchine incluse",
            currentOrg: "Organizzazione attiva",
            openSettings: "Apri impostazioni",
            currentPeriodEnd: "Fine periodo corrente",
            trial: "Trial",
        },
        dateNotAvailable: "Non disponibile",
    },
    en: {
        title: "Billing and subscription",
        subtitle: "Plan status and limits for the active organization context.",
        accessTitle: "Restricted access",
        accessDescription: "Only admins and supervisors can view this section.",
        currentPlan: "Current plan",
        usage: "Usage",
        limits: "Included limits",
        renewal: "Renewal / expiry",
        paymentNoticeTitle: "Payments portal not connected",
        paymentNoticeDescription: "In the current organizations model this page has been realigned as read-only. The legacy Stripe flow based on tenants was not kept here to avoid schema errors.",
        status: {
            active: "Active",
            trial: "Trial",
            suspended: "Suspended",
            cancelled: "Cancelled",
            unknown: "Unavailable",
        },
        plan: {
            starter: "Starter",
            professional: "Professional",
            enterprise: "Enterprise",
            free: "Free",
            fallback: "Plan not defined",
        },
        metrics: {
            users: "Users",
            machines: "Machines",
        },
        labels: {
            includedUsers: "Included users",
            includedMachines: "Included machines",
            currentOrg: "Active organization",
            openSettings: "Open settings",
            currentPeriodEnd: "Current period end",
            trial: "Trial",
        },
        dateNotAvailable: "Unavailable",
    },
    fr: {
        title: "Facturation et abonnement",
        subtitle: "État du plan et limites du contexte organisationnel actif.",
        accessTitle: "Accès limité",
        accessDescription: "Seuls les admins et superviseurs peuvent voir cette section.",
        currentPlan: "Plan actuel",
        usage: "Utilisation",
        limits: "Limites incluses",
        renewal: "Renouvellement / expiration",
        paymentNoticeTitle: "Portail de paiement non connecté",
        paymentNoticeDescription: "Dans le modèle organizations actuel, cette page a été réalignée en lecture seule. Le flux Stripe legacy basé sur tenants n’a pas été conservé ici pour éviter les erreurs de schéma.",
        status: {
            active: "Actif",
            trial: "Essai",
            suspended: "Suspendu",
            cancelled: "Annulé",
            unknown: "Indisponible",
        },
        plan: {
            starter: "Starter",
            professional: "Professional",
            enterprise: "Enterprise",
            free: "Free",
            fallback: "Plan non défini",
        },
        metrics: {
            users: "Utilisateurs",
            machines: "Machines",
        },
        labels: {
            includedUsers: "Utilisateurs inclus",
            includedMachines: "Machines incluses",
            currentOrg: "Organisation active",
            openSettings: "Ouvrir les paramètres",
            currentPeriodEnd: "Fin de période actuelle",
            trial: "Essai",
        },
        dateNotAvailable: "Indisponible",
    },
    es: {
        title: "Facturación y suscripción",
        subtitle: "Estado del plan y límites del contexto organizativo activo.",
        accessTitle: "Acceso limitado",
        accessDescription: "Solo admins y supervisores pueden ver esta sección.",
        currentPlan: "Plan actual",
        usage: "Uso",
        limits: "Límites incluidos",
        renewal: "Renovación / vencimiento",
        paymentNoticeTitle: "Portal de pagos no conectado",
        paymentNoticeDescription: "En el modelo actual de organizations esta página se ha reajustado en modo solo lectura. El flujo Stripe legacy basado en tenants no se mantuvo aquí para evitar errores de esquema.",
        status: {
            active: "Activo",
            trial: "Trial",
            suspended: "Suspendido",
            cancelled: "Cancelado",
            unknown: "No disponible",
        },
        plan: {
            starter: "Starter",
            professional: "Professional",
            enterprise: "Enterprise",
            free: "Free",
            fallback: "Plan no definido",
        },
        metrics: {
            users: "Usuarios",
            machines: "Máquinas",
        },
        labels: {
            includedUsers: "Usuarios incluidos",
            includedMachines: "Máquinas incluidas",
            currentOrg: "Organización activa",
            openSettings: "Abrir configuración",
            currentPeriodEnd: "Fin del periodo actual",
            trial: "Trial",
        },
        dateNotAvailable: "No disponible",
    },
} as const;

function formatDate(value: string | null, locale: string, fallback: string) {
    if (!value) return fallback;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;

    return parsed.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getSettingsDate(settings: Record<string, unknown> | null | undefined, keys: string[]) {
    if (!settings || typeof settings !== "object") return null;

    for (const key of keys) {
        const value = settings[key];
        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }

    return null;
}

export default function BillingSettings() {
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);
    const { organization, membership, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [billing, setBilling] = useState < BillingOrganization | null > (null);
    const [usage, setUsage] = useState < UsageStats > ({ currentUsers: 0, currentMachines: 0 });

    useEffect(() => {
        const load = async () => {
            if (!organization?.id) {
                setLoading(false);
                return;
            }

            try {
                const [
                    { data: orgData, error: orgError },
                    { count: usersCount },
                    { count: machinesCount },
                ] = await Promise.all([
                    supabase
                        .from("organizations")
                        .select("id, name, subscription_plan, subscription_status, max_users, max_machines, settings")
                        .eq("id", organization.id)
                        .maybeSingle(),
                    supabase
                        .from("organization_memberships")
                        .select("*", { count: "exact", head: true })
                        .eq("organization_id", organization.id)
                        .eq("is_active", true),
                    supabase
                        .from("machines")
                        .select("*", { count: "exact", head: true })
                        .eq("organization_id", organization.id)
                        .eq("is_archived", false),
                ]);

                if (orgError) throw orgError;

                setBilling((orgData as BillingOrganization | null) ?? null);
                setUsage({
                    currentUsers: usersCount || 0,
                    currentMachines: machinesCount || 0,
                });
            } catch (error: any) {
                console.error("Error loading billing data:", error);
                toast({
                    title: "Error",
                    description: error?.message || "Unable to load billing data",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [organization?.id, toast]);

    const isAllowed = membership?.role === "admin" || membership?.role === "supervisor";

    const locale = language === "it" ? "it-IT" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-GB";
    const statusKey = (billing?.subscription_status as keyof typeof text.status) || "unknown";
    const statusLabel = text.status[statusKey] || text.status.unknown;
    const planKey = (billing?.subscription_plan as keyof typeof text.plan) || "fallback";
    const planLabel = text.plan[planKey] || text.plan.fallback;
    const currentPeriodEnd = getSettingsDate(billing?.settings, ["current_period_end", "renewal_date"]);
    const trialEndsAt = getSettingsDate(billing?.settings, ["trial_ends_at", "trial_end"]);

    const getStatusBadgeClass = (status: string | null | undefined) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300";
            case "trial":
                return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300";
            case "suspended":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300";
            case "cancelled":
                return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300";
            default:
                return "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300";
        }
    };

    if (authLoading || loading) {
        return (
            <MainLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    if (!isAllowed) {
        return (
            <MainLayout>
                <div className="flex h-[60vh] items-center justify-center px-4">
                    <Card className="max-w-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                {text.accessTitle}
                            </CardTitle>
                            <CardDescription>{text.accessDescription}</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
                <div>
                    <h1 className="text-2xl font-bold">{text.title}</h1>
                    <p className="text-muted-foreground">{text.subtitle}</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                {text.currentPlan}
                            </CardTitle>
                            <CardDescription>
                                {text.labels.currentOrg}: {billing?.name || organization?.name || "-"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-lg font-semibold">{planLabel}</div>
                                    <div className="text-sm text-muted-foreground">{text.renewal}</div>
                                </div>
                                <Badge className={getStatusBadgeClass(billing?.subscription_status)}>{statusLabel}</Badge>
                            </div>
                            <Separator />
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl border p-4">
                                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                                        <Users className="h-4 w-4" />
                                        {text.metrics.users}
                                    </div>
                                    <div className="text-2xl font-semibold">
                                        {usage.currentUsers} / {billing?.max_users ?? "-"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{text.labels.includedUsers}</div>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                                        <Package className="h-4 w-4" />
                                        {text.metrics.machines}
                                    </div>
                                    <div className="text-2xl font-semibold">
                                        {usage.currentMachines} / {billing?.max_machines ?? "-"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{text.labels.includedMachines}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                {text.renewal}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <div className="text-sm text-muted-foreground">{text.labels.currentPeriodEnd}</div>
                                <div className="font-medium">
                                    {formatDate(currentPeriodEnd, locale, text.dateNotAvailable)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">{text.labels.trial}</div>
                                <div className="font-medium">
                                    {formatDate(trialEndsAt, locale, text.dateNotAvailable)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5" />
                            {text.paymentNoticeTitle}
                        </CardTitle>
                        <CardDescription>{text.paymentNoticeDescription}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" disabled>
                            {text.labels.openSettings}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
