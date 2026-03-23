import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, Loader2 } from "lucide-react";

interface SubscriptionGuardProps {
    children: React.ReactNode;
    requiredPlan?: "starter" | "professional" | "enterprise";
    feature?: "users" | "equipment" | "api" | "reports";
}

interface OrganizationLimits {
    subscription_plan: string;
    subscription_status: string;
    max_users: number;
    max_equipment: number;
    trial_ends_at: string | null;
}

const PLAN_HIERARCHY: Record<string, number> = {
    starter: 1,
    professional: 2,
    enterprise: 3,
};

const FEATURE_REQUIREMENTS: Record<string, string> = {
    api: "enterprise",
    reports: "professional",
};

export function SubscriptionGuard({
    children,
    requiredPlan,
    feature,
}: SubscriptionGuardProps) {
    const router = useRouter();
    const { organization } = useAuth();
    const [loading, setLoading] = useState(true);
    const [orgLimits, setOrgLimits] = useState<OrganizationLimits | null>(
        null
    );
    const [hasAccess, setHasAccess] = useState(false);
    const [reason, setReason] = useState<string>("");

    useEffect(() => {
        if (organization?.id) {
            checkAccess();
        }
    }, [organization?.id, requiredPlan, feature]);

    const checkAccess = async () => {
        try {
            const { data, error } = await supabase
                .from("organizations")
                .select(
                    "subscription_plan, subscription_status, max_users, max_equipment, trial_ends_at"
                )
                .eq("id", organization!.id)
                .single();

            if (error) throw error;
            setOrgLimits(data);

            // Check subscription status
            if (data.subscription_status === "canceled") {
                setHasAccess(false);
                setReason(
                    "Il tuo abbonamento è stato cancellato. Riattivalo per continuare."
                );
                return;
            }

            if (data.subscription_status === "past_due") {
                setHasAccess(false);
                setReason(
                    "Il pagamento è in ritardo. Aggiorna il metodo di pagamento per continuare."
                );
                return;
            }

            // Check trial expiration
            if (
                data.subscription_status === "trialing" &&
                data.trial_ends_at
            ) {
                const trialEnd = new Date(data.trial_ends_at);
                if (trialEnd < new Date()) {
                    setHasAccess(false);
                    setReason(
                        "Il periodo di prova è terminato. Scegli un piano per continuare."
                    );
                    return;
                }
            }

            // Check plan requirements
            if (requiredPlan) {
                const currentLevel =
                    PLAN_HIERARCHY[data.subscription_plan] || 0;
                const requiredLevel =
                    PLAN_HIERARCHY[requiredPlan] || 0;
                if (currentLevel < requiredLevel) {
                    setHasAccess(false);
                    setReason(
                        `Questa funzionalità richiede il piano ${requiredPlan}. Effettua l'upgrade per accedere.`
                    );
                    return;
                }
            }

            // Check feature requirements
            if (feature && FEATURE_REQUIREMENTS[feature]) {
                const requiredForFeature =
                    FEATURE_REQUIREMENTS[feature];
                const currentLevel =
                    PLAN_HIERARCHY[data.subscription_plan] || 0;
                const requiredLevel =
                    PLAN_HIERARCHY[requiredForFeature] || 0;
                if (currentLevel < requiredLevel) {
                    setHasAccess(false);
                    setReason(
                        `Questa funzionalità richiede il piano ${requiredForFeature}. Effettua l'upgrade per accedere.`
                    );
                    return;
                }
            }

            setHasAccess(true);
        } catch (error) {
            console.error("Error checking subscription:", error);
            setHasAccess(false);
            setReason("Errore nel verificare l'abbonamento.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center h-[60vh] p-4">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {orgLimits?.subscription_status ===
                            "past_due" ? (
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            ) : (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                            )}
                            Accesso limitato
                        </CardTitle>
                        <CardDescription>{reason}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            onClick={() =>
                                router.push("/settings/billing")
                            }
                            className="w-full"
                        >
                            Gestisci abbonamento
                        </Button>
                        <Button
                            onClick={() => router.back()}
                            variant="outline"
                            className="w-full"
                        >
                            Torna indietro
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}

// Hook per controllare i limiti
export function useSubscriptionLimits() {
    const { organization } = useAuth();
    const [limits, setLimits] = useState<OrganizationLimits | null>(null);
    const [usage, setUsage] = useState({ users: 0, equipment: 0 });

    useEffect(() => {
        if (organization?.id) {
            loadLimits();
        }
    }, [organization?.id]);

    const loadLimits = async () => {
        const { data: orgData } = await supabase
            .from("organizations")
            .select(
                "subscription_plan, subscription_status, max_users, max_equipment, trial_ends_at"
            )
            .eq("id", organization!.id)
            .single();

        if (orgData) setLimits(orgData);

        // Count users in this organization via memberships
        const { count: usersCount } = await supabase
            .from("organization_memberships")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organization!.id)
            .eq("is_active", true);

        // Count equipment (machines) in this organization
        const { count: equipmentCount } = await supabase
            .from("machines")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organization!.id);

        setUsage({
            users: usersCount || 0,
            equipment: equipmentCount || 0,
        });
    };

    const canAddUser = () => limits && usage.users < limits.max_users;
    const canAddEquipment = () =>
        limits && usage.equipment < limits.max_equipment;
    const isPlanAtLeast = (plan: string) => {
        if (!limits) return false;
        return (
            (PLAN_HIERARCHY[limits.subscription_plan] || 0) >=
            (PLAN_HIERARCHY[plan] || 0)
        );
    };

    return {
        limits,
        usage,
        canAddUser,
        canAddEquipment,
        isPlanAtLeast,
        isActive:
            limits?.subscription_status === "active" ||
            limits?.subscription_status === "trialing",
    };
}
