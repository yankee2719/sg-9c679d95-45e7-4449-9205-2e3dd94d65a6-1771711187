// ============================================================================
// PLATFORM SERVICE - FIXED
// ============================================================================
// Works with actual database tables:
// - platform_users (created in migration)
// - tenants (existing)
// - profiles (existing)
// Removed references to non-existent: organizations, tenant_health_metrics,
// impersonation_sessions, platform_audit_logs, organization_memberships
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export interface PlatformUser {
    id: string;
    auth_user_id: string;
    email: string;
    full_name: string | null;
    platform_role: "platform_owner" | "platform_admin" | "platform_support";
    can_impersonate: boolean;
    can_modify_tenants: boolean;
    is_active: boolean;
    created_at: string;
}

export interface TenantOverview {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    max_users: number | null;
    created_at: string;
    user_count: number;
    equipment_count: number;
}

export interface PlatformMetrics {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    totalEquipment: number;
}

export const platformService = {
    // =====================================================
    // AUTHENTICATION & AUTHORIZATION
    // =====================================================

    async isPlatformUser(): Promise<boolean> {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return false;

            const { data, error } = await supabase
                .from("platform_users")
                .select("id")
                .eq("auth_user_id", user.id)
                .eq("is_active", true)
                .maybeSingle();

            if (error) {
                // Table might not exist yet
                console.warn("platform_users table may not exist:", error.message);
                return false;
            }

            return !!data;
        } catch {
            return false;
        }
    },

    async getPlatformRole(): Promise<string | null> {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from("platform_users")
                .select("platform_role")
                .eq("auth_user_id", user.id)
                .eq("is_active", true)
                .maybeSingle();

            if (error || !data) return null;
            return data.platform_role;
        } catch {
            return null;
        }
    },

    async getCurrentPlatformUser(): Promise<PlatformUser | null> {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from("platform_users")
                .select("*")
                .eq("auth_user_id", user.id)
                .eq("is_active", true)
                .maybeSingle();

            if (error || !data) return null;
            return data as PlatformUser;
        } catch {
            return null;
        }
    },

    // =====================================================
    // TENANT MANAGEMENT
    // =====================================================

    async getAllTenants(): Promise<TenantOverview[]> {
        try {
            const { data: tenants, error } = await supabase
                .from("tenants")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            if (!tenants) return [];

            // Get user counts per tenant
            const { data: userCounts } = await supabase
                .from("profiles")
                .select("tenant_id");

            // Get equipment counts per tenant
            const { data: eqCounts } = await supabase
                .from("equipment")
                .select("tenant_id");

            return tenants.map((t) => ({
                id: t.id,
                name: t.name,
                slug: t.slug || "",
                is_active: t.is_active ?? true,
                max_users: t.max_users || null,
                created_at: t.created_at,
                user_count: userCounts?.filter((u) => u.tenant_id === t.id).length || 0,
                equipment_count:
                    eqCounts?.filter((e) => e.tenant_id === t.id).length || 0,
            }));
        } catch (error) {
            console.error("Error fetching tenants:", error);
            return [];
        }
    },

    async getTenantById(tenantId: string): Promise<TenantOverview | null> {
        try {
            const { data, error } = await supabase
                .from("tenants")
                .select("*")
                .eq("id", tenantId)
                .single();

            if (error) throw error;

            const { count: userCount } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("tenant_id", tenantId);

            const { count: eqCount } = await supabase
                .from("equipment")
                .select("*", { count: "exact", head: true })
                .eq("tenant_id", tenantId);

            return {
                id: data.id,
                name: data.name,
                slug: data.slug || "",
                is_active: data.is_active ?? true,
                max_users: data.max_users || null,
                created_at: data.created_at,
                user_count: userCount || 0,
                equipment_count: eqCount || 0,
            };
        } catch {
            return null;
        }
    },

    async getPlatformMetrics(): Promise<PlatformMetrics> {
        try {
            const tenants = await this.getAllTenants();

            return {
                totalTenants: tenants.length,
                activeTenants: tenants.filter((t) => t.is_active).length,
                totalUsers: tenants.reduce((sum, t) => sum + t.user_count, 0),
                totalEquipment: tenants.reduce((sum, t) => sum + t.equipment_count, 0),
            };
        } catch (error) {
            console.error("Error calculating metrics:", error);
            return {
                totalTenants: 0,
                activeTenants: 0,
                totalUsers: 0,
                totalEquipment: 0,
            };
        }
    },

    async suspendTenant(
        tenantId: string,
        _reason: string
    ): Promise<{ success: boolean; error: Error | null }> {
        try {
            const { error } = await supabase
                .from("tenants")
                .update({ is_active: false })
                .eq("id", tenantId);

            if (error) throw error;
            return { success: true, error: null };
        } catch (error) {
            return { success: false, error: error as Error };
        }
    },

    async reactivateTenant(
        tenantId: string
    ): Promise<{ success: boolean; error: Error | null }> {
        try {
            const { error } = await supabase
                .from("tenants")
                .update({ is_active: true })
                .eq("id", tenantId);

            if (error) throw error;
            return { success: true, error: null };
        } catch (error) {
            return { success: false, error: error as Error };
        }
    },

    // =====================================================
    // PLATFORM USERS MANAGEMENT
    // =====================================================

    async getPlatformUsers(): Promise<PlatformUser[]> {
        try {
            const { data, error } = await supabase
                .from("platform_users")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data || []) as PlatformUser[];
        } catch {
            return [];
        }
    },
};
