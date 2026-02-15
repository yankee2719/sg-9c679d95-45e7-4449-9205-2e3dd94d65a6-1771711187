import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
    full_name: string | null;
    role: string | null;
    organizationId: string | null;
}

/**
 * Fetch profile data adapted for new schema.
 * Handles the case where default_organization_id might be null
 * by falling back to the first active membership.
 */
export async function getProfileData(userId: string): Promise<ProfileData | null> {
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name, default_organization_id")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        console.error("getProfileData: error fetching profile:", error);
        return null;
    }

    if (!profile) {
        console.warn("getProfileData: no profile found for", userId);
        return null;
    }

    const full_name = profile.display_name
        || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        || null;

    // ── Get role from organization_memberships ───────────────────
    let role: string | null = null;
    let organizationId: string | null = profile.default_organization_id;

    if (organizationId) {
        // Try default org first
        const { data: membership, error: memErr } = await supabase
            .from("organization_memberships")
            .select("role")
            .eq("user_id", userId)
            .eq("organization_id", organizationId)
            .eq("is_active", true)
            .maybeSingle();

        if (memErr) {
            console.error("getProfileData: membership query error:", memErr);
        }

        role = membership?.role || null;
    }

    // Fallback: if no default org or no membership found, try ANY active membership
    if (!role) {
        const { data: anyMembership, error: anyErr } = await supabase
            .from("organization_memberships")
            .select("role, organization_id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("accepted_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (anyErr) {
            console.error("getProfileData: fallback membership error:", anyErr);
        }

        if (anyMembership) {
            role = anyMembership.role;
            organizationId = anyMembership.organization_id;

            // Auto-fix: set default_organization_id so this doesn't happen again
            if (!profile.default_organization_id && organizationId) {
                supabase
                    .from("profiles")
                    .update({ default_organization_id: organizationId })
                    .eq("id", userId)
                    .then(({ error: updateErr }) => {
                        if (updateErr) {
                            console.warn("getProfileData: could not auto-fix default_organization_id:", updateErr);
                        } else {
                            console.log("getProfileData: auto-fixed default_organization_id →", organizationId);
                        }
                    });
            }
        }
    }

    console.log("getProfileData:", { userId, full_name, role, organizationId });

    return { full_name, role, organizationId };
}

/**
 * Fetch unread notification count.
 */
export async function getNotificationCount(userId: string): Promise<number> {
    const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    return count || 0;
}