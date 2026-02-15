import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
    full_name: string | null;
    role: string | null;
}

// Helper function to fetch profile data - adapted for new schema
export async function getProfileData(userId: string): Promise<ProfileData | null> {
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name, default_organization_id")
        .eq("id", userId)
        .maybeSingle();

    if (error || !profile) return null;

    const full_name = profile.display_name
        || [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        || null;

    let role: string | null = null;
    if (profile.default_organization_id) {
        const { data: membership } = await supabase
            .from("organization_memberships")
            .select("role")
            .eq("user_id", userId)
            .eq("organization_id", profile.default_organization_id)
            .eq("is_active", true)
            .maybeSingle();

        role = membership?.role || null;
    }

    return { full_name, role };
}

// Helper function to fetch notification count - adapted for new schema
export async function getNotificationCount(userId: string): Promise<number> {
    const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    return count || 0;
}