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
 * Small sleep helper
 */
function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * Robust user context:
 * - Uses getSession() (more reliable after reload)
 * - Retries briefly to avoid "random" null orgId/orgType during session rehydration
 */
export async function getUserContext(): Promise<UserContext | null> {
    // retry window ~1.2s total
    const maxAttempts = 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // 1) Session first (reliable on reload)
        const {
            data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user ?? null;
        if (!user) {
            // session not ready yet -> retry a bit
            if (attempt < maxAttempts) {
                await sleep(200);
                continue;
            }
            return null;
        }

        // 2) Profile (may fail transiently due to timing/RLS)
        const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("default_organization_id, display_name, email, first_name, last_name")
            .eq("id", user.id)
            .maybeSingle();

        if (profileErr) {
            if (attempt < maxAttempts) {
                await sleep(200);
                continue;
            }
            throw profileErr;
        }

        const orgId = (profile as any)?.default_organization_id ?? null;

        // If orgId still null, retry a bit (often the profile row is not returned yet on reload)
        if (!orgId) {
            if (attempt < maxAttempts) {
                await sleep(200);
                continue;
            }
        }

        let role = "technician";
        let orgType: string | null = null;

        if (orgId) {
            const { data: membership, error: memErr } = await supabase
                .from("organization_memberships")
                .select("role")
                .eq("user_id", user.id)
                .eq("organization_id", orgId)
                .eq("is_active", true)
                .maybeSingle();

            if (memErr) {
                if (attempt < maxAttempts) {
                    await sleep(200);
                    continue;
                }
                throw memErr;
            }

            if ((membership as any)?.role) role = (membership as any).role;

            const { data: org, error: orgErr } = await supabase
                .from("organizations")
                .select("type")
                .eq("id", orgId)
                .maybeSingle();

            if (orgErr) {
                if (attempt < maxAttempts) {
                    await sleep(200);
                    continue;
                }
                throw orgErr;
            }

            orgType = (org as any)?.type ?? null;
        }

        return {
            userId: user.id,
            orgId,
            orgType,
            role,
            displayName:
                (profile as any)?.display_name ||
                (profile as any)?.first_name ||
                user.email?.split("@")[0] ||
                "User",
            email: (profile as any)?.email || user.email || "",
        };
    }

    return null;
}

export async function getProfileData(userId: string) {
    const { data, error } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name, default_organization_id, email")
        .eq("id", userId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    let role = "technician";
    if ((data as any).default_organization_id) {
        const { data: membership, error: memErr } = await supabase
            .from("organization_memberships")
            .select("role")
            .eq("user_id", userId)
            .eq("organization_id", (data as any).default_organization_id)
            .eq("is_active", true)
            .maybeSingle();

        if (memErr) throw memErr;
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