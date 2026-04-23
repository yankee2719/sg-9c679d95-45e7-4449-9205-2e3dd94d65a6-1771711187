import { useCallback, useMemo, useState } from "react";
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
    const {
        user,
        organization,
        membership,
        memberships: authMemberships,
        loading: authLoading,
        switchOrganization,
        refresh,
    } = useAuth();

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState < string | null > (null);

    const memberships = useMemo < MembershipOrganization[] > (
        () =>
            (authMemberships ?? []).map((row) => ({
                organization_id: row.organization_id,
                role: row.role ?? "technician",
                is_active: row.is_active,
                organization: row.organization
                    ? {
                        id: row.organization.id,
                        name: row.organization.name,
                        type: normalizeOrgType(row.organization.type) ?? "customer",
                    }
                    : null,
            })),
        [authMemberships]
    );

    const setActiveOrganization = useCallback(
        async (organizationId: string) => {
            if (!user) {
                throw new Error("Utente non autenticato.");
            }

            const selectedMembership = memberships.find(
                (item) => item.organization_id === organizationId
            );

            if (!selectedMembership) {
                throw new Error(
                    "L'organizzazione selezionata non appartiene alle tue membership attive."
                );
            }

            setSaving(true);
            setError(null);

            try {
                await switchOrganization(organizationId);
            } catch (e: any) {
                console.error(e);
                setError(e?.message ?? "Errore aggiornamento organizzazione attiva.");
                throw e;
            } finally {
                setSaving(false);
            }
        },
        [memberships, switchOrganization, user]
    );

    const reload = useCallback(async () => {
        setError(null);

        try {
            await refresh();
        } catch (e: any) {
            console.error(e);
            setError(e?.message ?? "Errore caricamento organizzazioni attive.");
            throw e;
        }
    }, [refresh]);

    return {
        loading: authLoading,
        saving,
        userId: user?.id ?? null,
        activeOrgId: organization?.id ?? null,
        activeOrgType: normalizeOrgType(organization?.type),
        activeRole: membership?.role ?? null,
        memberships,
        error,
        reload,
        setActiveOrganization,
    };
}

export default useActiveOrganization;