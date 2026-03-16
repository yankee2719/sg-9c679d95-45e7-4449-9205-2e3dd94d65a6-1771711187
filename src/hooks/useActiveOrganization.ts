import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    const { user, organization, membership, loading: authLoading, switchOrganization, refresh } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [memberships, setMemberships] = useState < MembershipOrganization[] > ([]);
    const [error, setError] = useState < string | null > (null);

    const load = useCallback(async () => {
        setError(null);

        if (authLoading) {
            setLoading(true);
            return;
        }

        if (!user) {
            setMemberships([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
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
        } catch (e: any) {
            console.error(e);
            setError(e?.message ?? "Errore caricamento organizzazioni attive.");
        } finally {
            setLoading(false);
        }
    }, [authLoading, user]);

    useEffect(() => {
        void load();
    }, [load]);

    const setActiveOrganization = useCallback(
        async (organizationId: string) => {
            if (!user) {
                throw new Error("Utente non autenticato.");
            }

            const selectedMembership = memberships.find((m) => m.organization_id === organizationId);
            if (!selectedMembership) {
                throw new Error("L'organizzazione selezionata non appartiene alle tue membership attive.");
            }

            setSaving(true);
            setError(null);

            try {
                await switchOrganization(organizationId);
                await refresh();
                await load();
            } catch (e: any) {
                console.error(e);
                setError(e?.message ?? "Errore aggiornamento organizzazione attiva.");
                throw e;
            } finally {
                setSaving(false);
            }
        },
        [load, memberships, refresh, switchOrganization, user]
    );

    return {
        loading: authLoading || loading,
        saving,
        userId: user?.id ?? null,
        activeOrgId: organization?.id ?? null,
        activeOrgType: (normalizeOrgType(organization?.type) as ActiveOrganizationType | null) ?? null,
        activeRole: membership?.role ?? null,
        memberships,
        error,
        reload: load,
        setActiveOrganization,
    };
}

export default useActiveOrganization;
