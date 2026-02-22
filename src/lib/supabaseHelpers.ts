import { supabase } from "@/integrations/supabase/client";

export interface UserContext {
    userId: string;
    orgId: string | null;
    orgType: string | null;
    role: string;
    displayName: string;
    email: string;
}

/**
 * Ensure a profiles row exists (some projects miss the signup trigger).
 * Safe with RLS if user can upsert their own profile row.
 */
async function ensureProfileRow(userId: string, email: string) {
    const { data: existing, error: readErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

    // If RLS blocks reading, we can't know; just return.
    if (readErr) return;

    if (!existing) {
        await supabase.from("profiles").upsert(
            {
                id: userId,
                email,
                display_name: null,
                first_name: null,
                last_name: null,
                default_organization_id: null,
            } as any,
            { onConflict: "id" }
        );
    }
}

async function getOrgType(orgId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from("organizations")
        .select("type")
        .eq("id", orgId)
        .maybeSingle();

    if (error) return null;
    return (data as any)?.type ?? null;
}

async function getRoleForOrg(userId: string, orgId: string): Promise<string> {
    const { data, error } = await supabase
        .from("organization_memberships")
        .select("role")
        .eq("user_id", userId)
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .maybeSingle();

    if (error) return "technician";
    return (data as any)?.role ?? "technician";
}

/**
 * If default_organization_id is missing, fallback to any active membership.
 * Prefer a manufacturer org if the user has one (important for your UX).
 */
async function resolveOrgId(userId: string, defaultOrgId: string | null) {
    if (defaultOrgId) return defaultOrgId;

    const { data: memberships, error } = await supabase
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("is_active", true);

    if (error || !memberships || memberships.length === 0) return null;

    const orgIds = memberships.map((m: any) => m.organization_id).filter(Boolean);
    if (orgIds.length === 0) return null;

    // Load org types and prefer manufacturer
    const { data: orgs } = await supabase
        .from("organizations")
        .select("id,type")
        .in("id", orgIds);

    const manufacturer = (orgs ?? []).find((o: any) => o.type === "manufacturer");
    return (manufacturer?.id ?? orgIds[0]) as string;
}

export async function getUserContext(): Promise<UserContext | null> {
    const {
        data: { user },
        error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return null;

    const email = user.email || "";

    // Make sure profile exists (if your DB trigger failed)
    await ensureProfileRow(user.id, email);

    const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("default_organization_id, display_name, email, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

    // If RLS blocks profile read, we still can try memberships fallback
    const defaultOrgId = (profile as any)?.default_organization_id ?? null;

    const orgId = await resolveOrgId(user.id, defaultOrgId);
    const role = orgId ? await getRoleForOrg(user.id, orgId) : "technician";
    const orgType = orgId ? await getOrgType(orgId) : null;

    const displayName =
        (profile as any)?.display_name ||
        (profile as any)?.first_name ||
        email.split("@")[0] ||
        "User";

    return {
        userId: user.id,
        orgId,
        orgType,
        role,
        displayName,
        email: (profile as any)?.email || email,
    };
}

export async function getProfileData(userId: string) {
    const { data, error } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name, default_organization_id, email")
        .eq("id", userId)
        .maybeSingle();

    if (error || !data) return null;

    let role = "technician";
    if ((data as any).default_organization_id) {
        const { data: membership } = await supabase
            .from("organization_memberships")
            .select("role")
            .eq("user_id", userId)
            .eq("organization_id", (data as any).default_organization_id)
            .eq("is_active", true)
            .maybeSingle();

        if ((membership as any)?.role) role = (membership as any).role;
    }

    return {
        full_name:
            (data as any).display_name ||
            `${(data as any).first_name || ""} ${(data as any).last_name || ""}`.trim() ||
            null,
        role,
        tenant_id: (data as any).default_organization_id,
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