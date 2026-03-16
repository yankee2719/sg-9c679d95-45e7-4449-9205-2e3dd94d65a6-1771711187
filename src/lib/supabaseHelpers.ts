import { supabase } from "@/integrations/supabase/client";

export interface UserContext {
    userId: string;
    orgId: string | null;
    orgType: "manufacturer" | "customer" | null;
    role: string;
    displayName: string;
    email: string;
}

export interface ProfileData {
    full_name: string | null;
    display_name: string | null;
    role: string;
    organizationId: string | null;
    tenant_id: string | null;
    email: string;
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

type OrgType = "manufacturer" | "customer";

type MembershipRow = {
    organization_id: string;
    role: string | null;
    is_active: boolean;
};

type OrgRow = {
    id: string;
    type: OrgType | string | null;
    name?: string | null;
};

function normalizeOrgType(raw: unknown): OrgType | null {
    const t = String(raw ?? "").toLowerCase();
    if (t === "manufacturer") return "manufacturer";
    if (t === "customer") return "customer";
    return null;
}

function selectActiveOrganization(
    memberships: MembershipRow[],
    orgMap: Map<string, OrgRow>,
    defaultOrgId: string | null
): { orgId: string | null; orgType: OrgType | null; role: string } {
    const activeMemberships = memberships.filter(
        (m) => m.is_active && !!m.organization_id
    );

    if (activeMemberships.length === 0) {
        return {
            orgId: defaultOrgId ?? null,
            orgType: null,
            role: "technician",
        };
    }

    if (defaultOrgId) {
        const defaultMembership = activeMemberships.find(
            (m) => m.organization_id === defaultOrgId
        );

        if (defaultMembership) {
            const org = orgMap.get(defaultOrgId) ?? null;
            return {
                orgId: defaultOrgId,
                orgType: normalizeOrgType(org?.type),
                role: defaultMembership.role || "technician",
            };
        }
    }

    const first = activeMemberships[0];
    const org = orgMap.get(first.organization_id) ?? null;

    return {
        orgId: first.organization_id,
        orgType: normalizeOrgType(org?.type),
        role: first.role || "technician",
    };
}

async function loadProfileAndMemberships(userId: string) {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("default_organization_id, display_name, email, first_name, last_name")
        .eq("id", userId)
        .maybeSingle();

    if (profileError) throw profileError;

    const { data: membershipRows, error: membershipError } = await supabase
        .from("organization_memberships")
        .select("organization_id, role, is_active")
        .eq("user_id", userId)
        .eq("is_active", true);

    if (membershipError) throw membershipError;

    const memberships = (membershipRows ?? []) as MembershipRow[];
    const defaultOrgId = (profile as any)?.default_organization_id ?? null;

    const orgIds = Array.from(
        new Set(memberships.map((m) => m.organization_id).filter(Boolean))
    );

    if (defaultOrgId && !orgIds.includes(defaultOrgId)) {
        orgIds.push(defaultOrgId);
    }

    const orgMap = new Map < string, OrgRow> ();

    if (orgIds.length > 0) {
        const { data: orgRows, error: orgError } = await supabase
            .from("organizations")
            .select("id, type, name")
            .in("id", orgIds);

        if (orgError) throw orgError;

        for (const row of orgRows ?? []) {
            orgMap.set((row as any).id, row as OrgRow);
        }
    }

    return {
        profile,
        memberships,
        selected: selectActiveOrganization(memberships, orgMap, defaultOrgId),
    };
}

export async function getUserContext(): Promise<UserContext | null> {
    const maxAttempts = 8;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            const user = session?.user ?? null;
            if (!user) {
                if (attempt < maxAttempts) {
                    await sleep(200);
                    continue;
                }
                return null;
            }

            const { profile, selected } = await loadProfileAndMemberships(user.id);

            let resolvedOrgType = selected.orgType;

            if (!resolvedOrgType && selected.orgId) {
                const { data: orgRow, error: orgError } = await supabase
                    .from("organizations")
                    .select("type")
                    .eq("id", selected.orgId)
                    .maybeSingle();

                if (orgError) throw orgError;

                resolvedOrgType = normalizeOrgType((orgRow as any)?.type);
            }

            if (selected.orgId && !resolvedOrgType) {
                throw new Error(
                    "orgType non risolto: organizations.type mancante o non accessibile via RLS"
                );
            }

            const displayName =
                (profile as any)?.display_name ||
                (profile as any)?.first_name ||
                user.email?.split("@")[0] ||
                "User";

            return {
                userId: user.id,
                orgId: selected.orgId,
                orgType: resolvedOrgType,
                role: selected.role || "technician",
                displayName,
                email: (profile as any)?.email || user.email || "",
            };
        } catch (error) {
            if (attempt < maxAttempts) {
                await sleep(200);
                continue;
            }
            throw error;
        }
    }

    return null;
}

export async function getProfileData(userId: string): Promise<ProfileData | null> {
    const { profile, selected } = await loadProfileAndMemberships(userId);

    if (!profile) return null;

    const fullName =
        (profile as any).display_name ||
        `${(profile as any).first_name || ""} ${(profile as any).last_name || ""}`.trim() ||
        null;

    return {
        full_name: fullName,
        display_name: (profile as any).display_name || fullName,
        role: selected.role || "technician",
        organizationId: selected.orgId,
        tenant_id: selected.orgId,
        email: (profile as any).email || "",
    };
}

export async function getNotificationCount(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (error) return 0;
    return count || 0;
}
