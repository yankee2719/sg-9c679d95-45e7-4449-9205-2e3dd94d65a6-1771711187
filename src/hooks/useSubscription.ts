import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionInfo {
    plan: "starter" | "professional" | "enterprise" | null;
    status: "trial" | "active" | "suspended" | "cancelled" | null;
    isTrialing: boolean;
    isActive: boolean;
    isSuspended: boolean;
    isCancelled: boolean;
    canAddUser: boolean;
    canAddMachine: boolean;
    maxUsers: number;
    maxPlants: number;
    maxMachines: number;
    currentUsers: number;
    currentMachines: number;
    organizationId: string | null;
    organizationName: string | null;
}

const PLAN_LIMITS: Record<string, { maxUsers: number; maxPlants: number; maxMachines: number }> = {
    starter: { maxUsers: 6, maxPlants: 2, maxMachines: 100 },
    professional: { maxUsers: 19, maxPlants: 10, maxMachines: 500 },
    enterprise: { maxUsers: 9999, maxPlants: 9999, maxMachines: 9999 },
};

const defaultSubscription: SubscriptionInfo = {
    plan: null, status: null,
    isTrialing: false, isActive: false, isSuspended: false, isCancelled: false,
    canAddUser: false, canAddMachine: false,
    maxUsers: 0, maxPlants: 0, maxMachines: 0,
    currentUsers: 0, currentMachines: 0,
    organizationId: null, organizationName: null,
};

export function useSubscription() {
    const [subscription, setSubscription] = useState < SubscriptionInfo > (defaultSubscription);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < string | null > (null);

    const fetchSubscription = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setSubscription(defaultSubscription); return; }

            // Get user's default organization from profile
            const { data: profile } = await supabase
                .from("profiles")
                .select("default_organization_id")
                .eq("id", user.id)
                .single();

            if (!profile?.default_organization_id) {
                setSubscription(defaultSubscription);
                return;
            }

            const orgId = profile.default_organization_id;

            // Get organization details
            const { data: org, error: orgError } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", orgId)
                .single();

            if (orgError || !org) {
                setError("Could not load subscription info");
                return;
            }

            // Count current users and machines
            const [usersResult, machinesResult] = await Promise.all([
                supabase
                    .from("organization_memberships")
                    .select("id", { count: "exact", head: true })
                    .eq("organization_id", orgId)
                    .eq("is_active", true),
                supabase
                    .from("machines")
                    .select("id", { count: "exact", head: true })
                    .eq("organization_id", orgId)
                    .eq("is_archived", false),
            ]);

            const currentUsers = usersResult.count || 0;
            const currentMachines = machinesResult.count || 0;

            const planLimits = PLAN_LIMITS[org.subscription_plan || "starter"] || PLAN_LIMITS.starter;
            const maxUsers = org.max_users || planLimits.maxUsers;
            const maxPlants = org.max_plants || planLimits.maxPlants;
            const maxMachines = org.max_machines || planLimits.maxMachines;

            setSubscription({
                plan: org.subscription_plan,
                status: org.subscription_status,
                isTrialing: org.subscription_status === "trial",
                isActive: org.subscription_status === "active",
                isSuspended: org.subscription_status === "suspended",
                isCancelled: org.subscription_status === "cancelled",
                canAddUser: currentUsers < maxUsers,
                canAddMachine: currentMachines < maxMachines,
                maxUsers, maxPlants, maxMachines,
                currentUsers, currentMachines,
                organizationId: org.id,
                organizationName: org.name,
            });
        } catch (err: any) {
            console.error("Error fetching subscription:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

    const createCheckoutSession = async (plan: string, period: "monthly" | "yearly") => {
        if (!subscription.organizationId) throw new Error("No organization ID found");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const response = await fetch("/api/stripe/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ organizationId: subscription.organizationId, userId: user.id, plan, period }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create checkout session");
        return data;
    };

    const openCustomerPortal = async () => {
        if (!subscription.organizationId) throw new Error("No organization ID found");
        const response = await fetch("/api/stripe/create-portal-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ organizationId: subscription.organizationId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create portal session");
        return data;
    };

    return { ...subscription, loading, error, refresh: fetchSubscription, createCheckoutSession, openCustomerPortal };
}