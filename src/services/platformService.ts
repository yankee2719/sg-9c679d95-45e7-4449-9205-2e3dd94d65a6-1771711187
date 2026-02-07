// src/services/platformService.ts
/**
 * Platform Administration Service
 * For platform users (software operators) only
 * 
 * SECURITY: All operations require platform_role in JWT claims
 * Uses RLS bypass via JWT claims, not tenant memberships
 */

import { supabase } from "@/integrations/supabase/client";

export const platformService = {
  // =====================================================
  // AUTHENTICATION & AUTHORIZATION
  // =====================================================

  /**
   * Check if current user is a platform user
   */
  async isPlatformUser(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const jwt = session.access_token;
      const payload = JSON.parse(atob(jwt.split(".")[1]));

      return payload.app_metadata?.platform_role !== undefined;
    } catch {
      return false;
    }
  },

  /**
   * Get current platform user's role
   */
  async getPlatformRole(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const jwt = session.access_token;
      const payload = JSON.parse(atob(jwt.split(".")[1]));

      return payload.app_metadata?.platform_role || null;
    } catch {
      return null;
    }
  },

  /**
   * Get current platform user details
   */
  async getCurrentPlatformUser(): Promise<any | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("platform_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching platform user:", error);
      return null;
    }
  },

  // =====================================================
  // TENANT MANAGEMENT
  // =====================================================

  /**
   * Get all organizations (platform view)
   */
  async getAllOrganizations(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          health:tenant_health_metrics(*),
          memberships:organization_memberships(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((org: any) => ({
        ...org,
        health: org.health?.[0] || null,
        active_users_count: org.memberships?.[0]?.count || 0,
      }));
    } catch (error) {
      console.error("Error fetching organizations:", error);
      throw error;
    }
  },

  /**
   * Get organization by ID
   */
  async getOrganizationById(organizationId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          health:tenant_health_metrics(*),
          memberships:organization_memberships(*)
        `)
        .eq("id", organizationId)
        .single();

      if (error) throw error;

      return {
        ...data,
        health: data.health?.[0] || null,
        active_users_count: data.memberships?.length || 0,
      };
    } catch (error) {
      console.error("Error fetching organization:", error);
      return null;
    }
  },

  /**
   * Get platform metrics
   */
  async getPlatformMetrics(): Promise<any> {
    try {
      const orgs = await this.getAllOrganizations();

      return {
        totalTenants: orgs.length,
        activeTenants: orgs.filter((o) => o.tenant_status === "active").length,
        suspendedTenants: orgs.filter((o) => o.tenant_status === "suspended").length,
        readOnlyTenants: orgs.filter((o) => o.tenant_status === "read_only").length,
        trialTenants: orgs.filter((o) => o.tenant_status === "trial").length,
        archivedTenants: orgs.filter((o) => o.tenant_status === "archived").length,
        totalUsers: orgs.reduce((sum, o) => sum + (o.active_users_count || 0), 0),
        totalMachines: orgs.reduce((sum, o) => sum + (o.health?.total_machines || 0), 0),
        healthDistribution: {
          healthy: orgs.filter((o) => o.health?.health_status === "healthy").length,
          warning: orgs.filter((o) => o.health?.health_status === "warning").length,
          critical: orgs.filter((o) => o.health?.health_status === "critical").length,
          inactive: orgs.filter((o) => o.health?.health_status === "inactive").length,
        },
      };
    } catch (error) {
      console.error("Error calculating metrics:", error);
      throw error;
    }
  },

  /**
   * Suspend a tenant
   */
  async suspendTenant(
    organizationId: string,
    reason: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const platformUser = await this.getCurrentPlatformUser();
      if (!platformUser) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("organizations")
        .update({
          tenant_status: "suspended",
          suspended_at: new Date().toISOString(),
          suspended_by: platformUser.id,
          suspension_reason: reason,
        })
        .eq("id", organizationId);

      if (error) throw error;

      await this.createAuditLog({
        action: "tenant.suspended",
        organizationId,
        severity: "critical",
        metadata: { reason },
      });

      return { success: true, error: null };
    } catch (error) {
      console.error("Error suspending tenant:", error);
      return { success: false, error: error as Error };
    }
  },

  /**
   * Reactivate a tenant
   */
  async reactivateTenant(
    organizationId: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          tenant_status: "active",
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
        })
        .eq("id", organizationId);

      if (error) throw error;

      await this.createAuditLog({
        action: "tenant.reactivated",
        organizationId,
        severity: "warning",
      });

      return { success: true, error: null };
    } catch (error) {
      console.error("Error reactivating tenant:", error);
      return { success: false, error: error as Error };
    }
  },

  /**
   * Archive a tenant
   */
  async archiveTenant(
    organizationId: string,
    reason: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const platformUser = await this.getCurrentPlatformUser();
      if (!platformUser || platformUser.platform_role !== "platform_owner") {
        throw new Error("Only platform owners can archive tenants");
      }

      const { error } = await supabase
        .from("organizations")
        .update({
          tenant_status: "archived",
          platform_notes: reason,
        })
        .eq("id", organizationId);

      if (error) throw error;

      await this.createAuditLog({
        action: "tenant.archived",
        organizationId,
        severity: "critical",
        metadata: { reason },
      });

      return { success: true, error: null };
    } catch (error) {
      console.error("Error archiving tenant:", error);
      return { success: false, error: error as Error };
    }
  },

  // =====================================================
  // IMPERSONATION
  // =====================================================

  /**
   * Start impersonation session
   */
  async startImpersonation(
    organizationId: string,
    reason: string,
    durationHours: number = 4
  ): Promise<{ sessionId: string | null; error: Error | null }> {
    try {
      if (durationHours < 1 || durationHours > 8) {
        throw new Error("Duration must be between 1 and 8 hours");
      }

      const { data, error } = await supabase.rpc("start_impersonation_session", {
        p_target_organization_id: organizationId,
        p_target_user_id: null,
        p_reason: reason,
        p_duration_hours: durationHours,
      });

      if (error) throw error;

      // Refresh session to get new JWT with impersonation claims
      await supabase.auth.refreshSession();

      return { sessionId: data as string, error: null };
    } catch (error) {
      console.error("Error starting impersonation:", error);
      return { sessionId: null, error: error as Error };
    }
  },

  /**
   * End impersonation session
   */
  async endImpersonation(
    sessionId: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.rpc("end_impersonation_session", {
        p_session_id: sessionId,
      });

      if (error) throw error;

      await supabase.auth.refreshSession();

      return { success: true, error: null };
    } catch (error) {
      console.error("Error ending impersonation:", error);
      return { success: false, error: error as Error };
    }
  },

  /**
   * Check if currently impersonating
   */
  async isImpersonating(): Promise<{
    active: boolean;
    sessionId?: string;
    organizationId?: string;
    expiresAt?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { active: false };

      const jwt = session.access_token;
      const payload = JSON.parse(atob(jwt.split(".")[1]));

      if (payload.impersonation) {
        return {
          active: true,
          sessionId: payload.impersonation.session_id,
          organizationId: payload.impersonation.organization_id,
          expiresAt: payload.impersonation.expires_at,
        };
      }

      return { active: false };
    } catch {
      return { active: false };
    }
  },

  /**
   * Get active impersonation sessions
   */
  async getActiveImpersonationSessions(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("impersonation_sessions")
        .select(`
          *,
          platform_user:platform_users(email, full_name),
          organization:organizations(name, slug)
        `)
        .eq("status", "active")
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching sessions:", error);
      return [];
    }
  },

  // =====================================================
  // AUDIT LOGS
  // =====================================================

  /**
   * Create audit log entry
   */
  async createAuditLog(params: {
    action: string;
    organizationId?: string;
    resourceType?: string;
    resourceId?: string;
    severity?: "info" | "warning" | "critical";
    metadata?: any;
  }): Promise<void> {
    try {
      const platformUser = await this.getCurrentPlatformUser();
      if (!platformUser) return;

      const impersonation = await this.isImpersonating();

      await supabase.from("platform_audit_logs").insert({
        platform_user_id: platformUser.id,
        impersonation_session_id: impersonation.active ? impersonation.sessionId : null,
        organization_id: params.organizationId,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        severity: params.severity || "info",
        metadata: params.metadata || {},
      });
    } catch (error) {
      console.error("Error creating audit log:", error);
    }
  },

  /**
   * Get audit logs
   */
  async getAuditLogs(filters?: {
    organizationId?: string;
    action?: string;
    severity?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from("platform_audit_logs")
        .select(`
          *,
          platform_user:platform_users(email, full_name),
          organization:organizations(name, slug)
        `)
        .order("created_at", { ascending: false });

      if (filters?.organizationId) {
        query = query.eq("organization_id", filters.organizationId);
      }
      if (filters?.action) {
        query = query.eq("action", filters.action);
      }
      if (filters?.severity) {
        query = query.eq("severity", filters.severity);
      }

      query = query.limit(filters?.limit || 100);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return [];
    }
  },

  // =====================================================
  // HEALTH MONITORING
  // =====================================================

  /**
   * Get tenant health metrics
   */
  async getTenantHealthMetrics(organizationId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from("tenant_health_metrics")
        .select(`
          *,
          organization:organizations(name, slug, tenant_status)
        `)
        .order("health_score", { ascending: true });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching health metrics:", error);
      return [];
    }
  },

  /**
   * Calculate health metrics manually
   */
  async calculateHealthMetrics(): Promise<{
    success: boolean;
    updatedCount?: number;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase.rpc("calculate_tenant_health_metrics");

      if (error) throw error;

      return { success: true, updatedCount: data as number, error: null };
    } catch (error) {
      console.error("Error calculating health metrics:", error);
      return { success: false, error: error as Error };
    }
  },

  /**
   * Get tenants by health status
   */
  async getTenantsByHealthStatus(
    status: "healthy" | "warning" | "critical" | "inactive"
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          health:tenant_health_metrics!inner(*)
        `)
        .eq("health.health_status", status)
        .order("health.health_score", { ascending: true });

      if (error) throw error;

      return (data || []).map((org: any) => ({
        ...org,
        health: org.health?.[0] || null,
      }));
    } catch (error) {
      console.error("Error fetching tenants by health:", error);
      return [];
    }
  },

  // =====================================================
  // PLATFORM USERS MANAGEMENT
  // =====================================================

  /**
   * Get all platform users
   */
  async getPlatformUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("platform_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching platform users:", error);
      return [];
    }
  },
};
