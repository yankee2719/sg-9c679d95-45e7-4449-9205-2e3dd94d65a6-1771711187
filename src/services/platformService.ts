import { supabase } from "@/integrations/supabase/client";
import type { Organization } from "./organizationService";

export type PlatformRole = "platform_owner" | "platform_admin" | "platform_support";

export interface PlatformUser {
    id: string;
    user_id: string;
    role: PlatformRole;
    is_active: boolean;
    can_impersonate: boolean;
    can_modify_tenants: boolean;
    notes: string | null;
}

export interface OrganizationHealth {
    health_status: "healthy" | "warning" | "critical" | "inactive";
}

export interface OrganizationWithHealth extends Organization {
    tenant_status: string;
    active_users_count: number;
    total_machines_count: number;
    support_priority: "normal" | "high" | "critical";
    health: OrganizationHealth;
}

export interface PlatformMetrics {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    totalMachines: number;
    healthDistribution: {
        healthy: number;
        warning: number;
        critical: number;
        inactive: number;
    };
}

export interface ImpersonationStatus {
    active: boolean;
    originalUser?: any;
    organizationId?: string;
    organizationName?: string;
    sessionId?: string;
}

function toTenantStatus(org: Organization): string {
    if (org.is_archived) return "archived";
    return org.subscription_status || "active";
}

function toHealthStatus(tenantStatus: string): OrganizationHealth["health_status"] {
    if (tenantStatus === "archived") return "inactive";
    if (tenantStatus === "suspended") return "warning";
    return "healthy";
}

async function countRows(table: string, filter?: { column: string; value: string | boolean }): Promise<number> {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) query = query.eq(filter.column, filter.value);
    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
}

async function enrichOrganization(org: Organization): Promise<OrganizationWithHealth> {
    const [activeUsersCount, totalMachinesCount] = await Promise.all([
        countRows("organization_memberships", { column: "organization_id", value: org.id }).then(async (baseCount) => {
            const { count, error } = await supabase
                .from("organization_memberships")
                .select("*", { count: "exact", head: true })
                .eq("organization_id", org.id)
                .eq("is_active", true);
            return error ? baseCount : count || 0;
        }),
        countRows("machines", { column: "organization_id", value: org.id }),
    ]);

    const tenantStatus = toTenantStatus(org);
    const healthStatus = toHealthStatus(tenantStatus);

    return {
        ...org,
        tenant_status: tenantStatus,
        active_users_count: activeUsersCount,
        total_machines_count: totalMachinesCount,
        support_priority: tenantStatus === "suspended" ? "high" : "normal",
        health: {
            health_status: healthStatus,
        },
    };
}

export const platformService = {
    async isPlatformAdmin(): Promise<boolean> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data, error } = await supabase
                .from("platform_admins")
                .select("id")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .maybeSingle();

            return !!data && !error;
        } catch {
            return false;
        }
    },

    async isPlatformUser(): Promise<boolean> {
        return this.isPlatformAdmin();
    },

    async getPlatformRole(): Promise<PlatformRole | null> {
        const platformUser = await this.getCurrentPlatformUser();
        return platformUser?.role ?? null;
    },

    async getCurrentPlatformUser(): Promise<PlatformUser | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from("platform_admins")
                .select("id, user_id, is_active, notes")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .maybeSingle();

            if (error || !data) return null;

            return {
                id: String(data.id),
                user_id: String(data.user_id),
                role: "platform_admin",
                is_active: Boolean(data.is_active),
                can_impersonate: false,
                can_modify_tenants: true,
                notes: typeof data.notes === "string" ? data.notes : null,
            };
        } catch (error) {
            console.error("Error loading current platform user:", error);
            return null;
        }
    },

    async getAllOrganizations(): Promise<OrganizationWithHealth[]> {
        const { data, error } = await supabase
            .from("organizations")
            .select("*")
            .order("name");

        if (error || !data) return [];

        const enriched = await Promise.all((data as Organization[]).map((org) => enrichOrganization(org)));
        return enriched;
    },

    async getOrganizationById(id: string): Promise<Organization | null> {
        const { data, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", id)
            .single();

        if (error) return null;
        return data as Organization;
    },

    async getOrganizationStats(): Promise<{
        total: number;
        byType: Record<string, number>;
        byStatus: Record<string, number>;
    }> {
        const organizations = await this.getAllOrganizations();

        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};

        organizations.forEach((org) => {
            byType[org.type] = (byType[org.type] || 0) + 1;
            byStatus[org.tenant_status] = (byStatus[org.tenant_status] || 0) + 1;
        });

        return { total: organizations.length, byType, byStatus };
    },

    async getPlatformMetrics(): Promise<PlatformMetrics> {
        const organizations = await this.getAllOrganizations();
        const [totalUsers, totalMachines] = await Promise.all([
            countRows("organization_memberships", { column: "is_active", value: true }),
            countRows("machines"),
        ]);

        const healthDistribution = {
            healthy: 0,
            warning: 0,
            critical: 0,
            inactive: 0,
        };

        organizations.forEach((org) => {
            healthDistribution[org.health.health_status] += 1;
        });

        return {
            totalTenants: organizations.length,
            activeTenants: organizations.filter((org) => org.tenant_status === "active").length,
            suspendedTenants: organizations.filter((org) => org.tenant_status === "suspended").length,
            totalUsers,
            totalMachines,
            healthDistribution,
        };
    },

    async getPlatformAdmins(): Promise<any[]> {
        const { data, error } = await supabase
            .from("platform_admins")
            .select(`
                *,
                user:profiles (id, display_name, email)
            `)
            .eq("is_active", true);

        if (error) return [];
        return data || [];
    },

    async addPlatformAdmin(userId: string, notes?: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from("platform_admins")
            .insert({
                user_id: userId,
                granted_by: user?.id,
                notes: notes || null,
            });

        return !error;
    },

    async removePlatformAdmin(userId: string): Promise<boolean> {
        const { error } = await supabase
            .from("platform_admins")
            .update({ is_active: false })
            .eq("user_id", userId);

        return !error;
    },

    async suspendTenant(organizationId: string, _reason: string): Promise<{ success: boolean }> {
        const { error } = await supabase
            .from("organizations")
            .update({ subscription_status: "suspended" })
            .eq("id", organizationId);

        return { success: !error };
    },

    async reactivateTenant(organizationId: string): Promise<{ success: boolean }> {
        const { error } = await supabase
            .from("organizations")
            .update({ subscription_status: "active", is_archived: false })
            .eq("id", organizationId);

        return { success: !error };
    },

    async archiveTenant(organizationId: string, _reason: string): Promise<{ success: boolean }> {
        const { error } = await supabase
            .from("organizations")
            .update({ is_archived: true, subscription_status: "archived" })
            .eq("id", organizationId);

        return { success: !error };
    },

    async startImpersonation(
        _organizationId: string,
        _reason: string,
        _durationHours = 4
    ): Promise<{ sessionId: string | null; error: Error | null }> {
        return {
            sessionId: null,
            error: new Error("Impersonation non ancora disponibile in questo progetto."),
        };
    },

    async isImpersonating(): Promise<ImpersonationStatus> {
        return { active: false };
    },

    async stopImpersonation(): Promise<void> {
        return;
    },

    async endImpersonation(_sessionId: string): Promise<{ success: boolean }> {
        return { success: true };
    },
};

