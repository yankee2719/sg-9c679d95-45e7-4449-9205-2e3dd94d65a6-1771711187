import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionInfo {
    plan: "starter" | "professional" | "enterprise" | null;
    status: "trialing" | "active" | "past_due" | "canceled" | null;
    period: "monthly" | "yearly" | null;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    isTrialing: boolean;
    isActive: boolean;
    isPastDue: boolean;
    isCanceled: boolean;
    trialDaysLeft: number;
    canAddUser: boolean;
    canAddEquipment: boolean;
    maxUsers: number;
    maxEquipment: number;
    currentUsers: number;
    currentEquipment: number;
    tenantId: string | null;
    tenantName: string | null;
}

const PLAN_LIMITS: Record<string, { maxUsers: number; maxEquipment: number }> = {
    starter: { maxUsers: 6, maxEquipment: 100 },
    professional: { maxUsers: 19, maxEquipment: 500 },
    enterprise: { maxUsers: 9999, maxEquipment: 9999 },
};

const defaultSubscription: SubscriptionInfo = {
    plan: null, status: null, period: null, trialEndsAt: null, currentPeriodEnd: null,
    isTrialing: false, isActive: false, isPastDue: false, isCanceled: false,
    trialDaysLeft: 0, canAddUser: false, canAddEquipment: false,
    maxUsers: 0, maxEquipment: 0, currentUsers: 0, currentEquipment: 0,
    tenantId: null, tenantName: null,
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

            const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
            if (!profile?.tenant_id) { setSubscription(defaultSubscription); return; }

            const { data: tenant, error: tenantError } = await supabase.from("tenants").select("*").eq("id", profile.tenant_id).single();
            if (tenantError || !tenant) { setError("Could not load subscription info"); return; }

            const [usersResult, equipmentResult] = await Promise.all([
                supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
                supabase.from("equipment").select("id", { count: "exact", head: true }).eq("tenant_id", profile.tenant_id),
            ]);

            const currentUsers = usersResult.count || 0;
            const currentEquipment = equipmentResult.count || 0;

            let trialDaysLeft = 0;
            if (tenant.trial_ends_at) {
                const trialEnd = new Date(tenant.trial_ends_at);
                trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            }

            const planLimits = PLAN_LIMITS[tenant.subscription_plan || "starter"] || PLAN_LIMITS.starter;
            const maxUsers = tenant.max_users || planLimits.maxUsers;
            const maxEquipment = tenant.max_equipment || planLimits.maxEquipment;

            setSubscription({
                plan: tenant.subscription_plan,
                status: tenant.subscription_status,
                period: tenant.subscription_period,
                trialEndsAt: tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null,
                currentPeriodEnd: tenant.current_period_end ? new Date(tenant.current_period_end) : null,
                isTrialing: tenant.subscription_status === "trialing",
                isActive: tenant.subscription_status === "active",
                isPastDue: tenant.subscription_status === "past_due",
                isCanceled: tenant.subscription_status === "canceled",
                trialDaysLeft,
                canAddUser: currentUsers < maxUsers,
                canAddEquipment: currentEquipment < maxEquipment,
                maxUsers, maxEquipment, currentUsers, currentEquipment,
                tenantId: tenant.id,
                tenantName: tenant.name,
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
        if (!subscription.tenantId) throw new Error("No tenant ID found");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const response = await fetch("/api/stripe/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenantId: subscription.tenantId, userId: user.id, plan, period }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create checkout session");
        return data;
    };

    const openCustomerPortal = async () => {
        if (!subscription.tenantId) throw new Error("No tenant ID found");
        const response = await fetch("/api/stripe/create-portal-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenantId: subscription.tenantId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create portal session");
        return data;
    };

    return { ...subscription, loading, error, refresh: fetchSubscription, createCheckoutSession, openCustomerPortal };
}