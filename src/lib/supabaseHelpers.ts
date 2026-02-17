import { supabase } from "@/integrations/supabase/client";

export interface UserContext {
    userId: string;
    orgId: string | null;
    orgType: string | null;
    role: string;
    displayName: string;
    email: string;
}

export async function getUserContext(): Promise<UserContext | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("default_organization_id, display_name, email, first_name, last_name")
        .eq("id", user.id)
        .single();

    const orgId = profile?.default_organization_id || null;
    let role = "technician";
    let orgType: string | null = null;

    if (orgId) {
        const { data: membership } = await supabase
            .from("organization_memberships")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", orgId)
            .eq("is_active", true)
            .single();

        if (membership?.role) role = membership.role;

        const { data: org } = await supabase
            .from("organizations")
            .select("type")
            .eq("id", orgId)
            .single();

        if (org?.type) orgType = org.type;
    }

    return {
        userId: user.id,
        orgId,
        orgType,
        role,
        displayName: profile?.display_name || profile?.first_name || user.email?.split("@")[0] || "User",
        email: profile?.email || user.email || "",
    };
}

export async function getProfileData(userId: string) {
    const { data } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name, default_organization_id, email")
        .eq("id", userId)
        .single();

    if (!data) return null;

    // Get role from membership
    let role = "technician";
    if (data.default_organization_id) {
        const { data: membership } = await supabase
            .from("organization_memberships")
            .select("role")
            .eq("user_id", userId)
            .eq("organization_id", data.default_organization_id)
            .eq("is_active", true)
            .single();

        if (membership?.role) role = membership.role;
    }

    return {
        full_name: data.display_name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || null,
        role,
        tenant_id: data.default_organization_id,
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
