import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
    CreditCard,
    Calendar,
    Users,
    Package,
    ArrowUpRight,
    Loader2,
    Check,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface TenantBilling {
    id: string;
    name: string;
    subscription_plan: string;
    subscription_status: string;
    subscription_period: string;
    max_users: number;
    max_equipment: number;
    current_period_end: string | null;
    trial_ends_at: string | null;
}

interface UsageStats {
    currentUsers: number;
    currentEquipment: number;
}

const PLAN_DETAILS: Record<string, { name: string; price: { monthly: number; annual: number }; features: string[] }> = {
    starter: {
        name: "Starter",
        price: { monthly: 29, annual: 290 },
        features: ["Fino a 6 utenti", "100 attrezzature", "Checklist standard", "Report base"],
    },
    professional: {
        name: "Professional",
        price: { monthly: 79, annual: 790 },
        features: ["Fino a 19 utenti", "500 attrezzature", "Checklist personalizzabili", "Report avanzati", "Notifiche email"],
    },
    enterprise: {
        name: "Enterprise",
        price: { monthly: 199, annual: 1990 },
        features: ["Utenti illimitati", "Attrezzature illimitate", "API access", "Support prioritario", "Custom branding"],
    },
};

export default function BillingSettings() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [tenant, setTenant] = useState < TenantBilling | null > (null);
    const [usage, setUsage] = useState < UsageStats > ({ currentUsers: 0, currentEquipment: 0 });
    const [portalLoading, setPortalLoading] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState < string | null > (null);

    useEffect(() => {
        if (user?.tenantId) {
            loadBillingData();
        }
    }, [user?.tenantId]);

    const loadBillingData = async () => {
        try {
            // Load tenant info
            const { data: tenantData, error: tenantError } = await supabase
                .from("tenants")
                .select("id, name, subscription_plan, subscription_status, subscription_period, max_users, max_equipment, current_period_end, trial_ends_at")
                .eq("id", user!.tenantId)
                .single();

            if (tenantError) throw tenantError;
            setTenant(tenantData);

            // Load usage stats
            const { count: usersCount } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("tenant_id", user!.tenantId);

            const { count: equipmentCount } = await supabase
                .from("equipment")
                .select("*", { count: "exact", head: true })
                .eq("tenant_id", user!.tenantId);

            setUsage({
                currentUsers: usersCount || 0,
                currentEquipment: equipmentCount || 0,
            });
        } catch (error: any) {
            console.error("Error loading billing data:", error);
            toast({ title: "Errore", description: "Impossibile caricare i dati di fatturazione", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        try {
            const response = await fetch("/api/stripe/create-portal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenantId: user!.tenantId }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Errore creazione portale");
            }
        } catch (error: any) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
        } finally {
            setPortalLoading(false);
        }
    };

    const handleUpgrade = async (plan: string) => {
        setUpgradeLoading(plan);
        try {
            const response = await fetch("/api/stripe/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenantId: user!.tenantId,
                    plan,
                    period: tenant?.subscription_period || "monthly",
                }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Errore creazione checkout");
            }
        } catch (error: any) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
        } finally {
            setUpgradeLoading(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: "bg-green-100 text-green-800",
            trialing: "bg-blue-100 text-blue-800",
            past_due: "bg-yellow-100 text-yellow-800",
            canceled: "bg-red-100 text-red-800",
        };
        const labels: Record<string, string> = {
            active: "Attivo",
            trialing: "Trial",
            past_due: "Pagamento in ritardo",
            canceled: "Cancellato",
        };
        return <Badge className={styles[status] || "bg-gray-100"}>{labels[status] || status}</Badge>;
    };

    if (!user?.isAdmin) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <Card className="max-w-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                Accesso limitato
                            </CardTitle>
                            <CardDescription>Solo gli amministratori possono gestire l'abbonamento.</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    const currentPlan = PLAN_DETAILS[tenant?.subscription_plan || "starter"];
    const isAnnual = tenant?.subscription_period === "annual";

    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Fatturazione e Abbonamento</h1>
                    <p className="text-muted-foreground">Gestisci il tuo piano e i metodi di pagamento</p>
                </div>

                {/* Current Plan */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Piano attuale: {currentPlan.name}
                                </CardTitle>
                                <CardDescription>
                                    {isAnnual ? "Fatturazione annuale" : "Fatturazione mensile"}
                                </CardDescription>
                            </div>
                            {tenant && getStatusBadge(tenant.subscription_status)}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Utenti</p>
                                    <p className="font-semibold">{usage.currentUsers} / {tenant?.max_users}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <Package className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Attrezzature</p>
                                    <p className="font-semibold">{usage.currentEquipment} / {tenant?.max_equipment}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Prossimo rinnovo</p>
                                    <p className="font-semibold">
                                        {tenant?.current_period_end
                                            ? format(new Date(tenant.current_period_end), "d MMM yyyy", { locale: it })
                                            : tenant?.trial_ends_at
                                                ? `Trial fino al ${format(new Date(tenant.trial_ends_at), "d MMM yyyy", { locale: it })}`
                                                : "N/A"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {tenant?.subscription_status === "active" && (
                            <Button onClick={handleManageSubscription} disabled={portalLoading} variant="outline">
                                {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpRight className="mr-2 h-4 w-4" />}
                                Gestisci abbonamento
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Available Plans */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">Piani disponibili</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(PLAN_DETAILS).map(([key, plan]) => {
                            const isCurrent = tenant?.subscription_plan === key;
                            const price = isAnnual ? plan.price.annual : plan.price.monthly;

                            return (
                                <Card key={key} className={isCurrent ? "border-primary" : ""}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>{plan.name}</CardTitle>
                                            {isCurrent && <Badge>Attuale</Badge>}
                                        </div>
                                        <CardDescription>
                                            <span className="text-2xl font-bold text-foreground">€{price}</span>
                                            <span className="text-muted-foreground">/{isAnnual ? "anno" : "mese"}</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-2 text-sm">
                                                    <Check className="h-4 w-4 text-green-500" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <Separator className="my-4" />
                                        {!isCurrent && (
                                            <Button
                                                className="w-full"
                                                onClick={() => handleUpgrade(key)}
                                                disabled={upgradeLoading === key}
                                            >
                                                {upgradeLoading === key ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : null}
                                                {key === "starter" && tenant?.subscription_plan !== "starter" ? "Downgrade" : "Upgrade"}
                                            </Button>
                                        )}
                                        {isCurrent && (
                                            <Button className="w-full" variant="outline" disabled>
                                                Piano attuale
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}