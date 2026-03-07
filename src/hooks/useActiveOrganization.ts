// src/hooks/useActiveOrganization.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";

export type ActiveOrganizationType = "manufacturer" | "customer";

export interface MembershipOrganization {
    organization_id: string;
    role: string;
    is_active: boolean;
    organization: {
        id: string;
        name: string;
        type: ActiveOrganizationType;
    } | null;
}

export interface ActiveOrganizationState {
    loading: boolean;
    saving: boolean;
    userId: string | null;
    activeOrgId: string | null;
    activeOrgType: ActiveOrganizationType | null;
    activeRole: string | null;
    memberships: MembershipOrganization[];
    error: string | null;
    reload: () => Promise<void>;
    setActiveOrganization: (organizationId: string) => Promise<void>;
}

function normalizeOrgType(value: unknown): ActiveOrganizationType | null {
    const raw = String(value ?? "").toLowerCase();
    if (raw === "manufacturer") return "manufacturer";
    if (raw === "customer") return "customer";
    return null;
}

export function useActiveOrganization(): ActiveOrganizationState {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState < string | null > (null);
    const [activeOrgId, setActiveOrgId] = useState < string | null > (null);
    const [activeOrgType, setActiveOrgType] = useState < ActiveOrganizationType | null > (null);
    const [activeRole, setActiveRole] = useState < string | null > (null);
    const [memberships, setMemberships] = useState < MembershipOrganization[] > ([]);
    const [error, setError] = useState < string | null > (null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const ctx = await getUserContext();

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) throw userError;

            if (!user) {
                setUserId(null);
                setActiveOrgId(null);
                setActiveOrgType(null);
                setActiveRole(null);
                setMemberships([]);
                return;
            }

            setUserId(user.id);

            const { data, error: membershipsError } = await supabase
                .from("organization_memberships")
                .select(`
          organization_id,
          role,
          is_active,
          organization:organizations (
            id,
            name,
            type
          )
        `)
                .eq("user_id", user.id)
                .eq("is_active", true)
                .order("organization_id", { ascending: true });

            if (membershipsError) throw membershipsError;

            const rows = ((data ?? []) as any[])
                .map((row) => ({
                    organization_id: row.organization_id,
                    role: row.role ?? "technician",
                    is_active: !!row.is_active,
                    organization: row.organization
                        ? {
                            id: row.organization.id,
                            name: row.organization.name,
                            type: normalizeOrgType(row.organization.type) ?? "customer",
                        }
                        : null,
                }))
                .filter((row) => !!row.organization_id);

            setMemberships(rows);

            setActiveOrgId(ctx?.orgId ?? null);
            setActiveOrgType((ctx?.orgType as ActiveOrganizationType | null) ?? null);
            setActiveRole(ctx?.role ?? null);
        } catch (e: any) {
            console.error(e);
            setError(e?.message ?? "Errore caricamento organizzazioni attive.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setActiveOrganization = useCallback(
        async (organizationId: string) => {
            if (!userId) {
                throw new Error("Utente non autenticato.");
            }

            const membership = memberships.find((m) => m.organization_id === organizationId);
            if (!membership) {
                throw new Error("L'organizzazione selezionata non appartiene alle tue membership attive.");
            }

            setSaving(true);
            setError(null);

            try {
                const { error: updateError } = await supabase
                    .from("profiles")
                    .update({ default_organization_id: organizationId })
                    .eq("id", userId);

                if (updateError) throw updateError;

                setActiveOrgId(organizationId);
                setActiveOrgType(membership.organization?.type ?? null);
                setActiveRole(membership.role ?? "technician");
            } catch (e: any) {
                console.error(e);
                setError(e?.message ?? "Errore aggiornamento organizzazione attiva.");
                throw e;
            } finally {
                setSaving(false);
            }
        },
        [memberships, userId]
    );

    return {
        loading,
        saving,
        userId,
        activeOrgId,
        activeOrgType,
        activeRole,
        memberships,
        error,
        reload: load,
        setActiveOrganization,
    };
}

export default useActiveOrganization;
