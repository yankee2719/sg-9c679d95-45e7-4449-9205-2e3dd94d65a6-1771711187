import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type UserRole = "admin" | "supervisor" | "technician";

export interface UserWithTenant extends Profile {
  tenants?: {
    id: string;
    name: string;
  };
}

export const userService = {
  // Get current user profile
  async getCurrentProfile(): Promise<Profile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching current profile:", error);
      return null;
    }
  },

  // Get user by ID
  async getUserById(id: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }
  },

  // Get current user role
  async getCurrentUserRole(): Promise<UserRole | null> {
    try {
      const profile = await this.getCurrentProfile();
      return (profile?.role as UserRole) || null;
    } catch (error) {
      console.error("Error fetching current user role:", error);
      return null;
    }
  },

  // Check if current user is admin
  async isAdmin(): Promise<boolean> {
    try {
      const role = await this.getCurrentUserRole();
      return role === "admin";
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  },

  // Check if current user is supervisor or admin
  async isSupervisorOrAdmin(): Promise<boolean> {
    try {
      const role = await this.getCurrentUserRole();
      return role === "admin" || role === "supervisor";
    } catch (error) {
      console.error("Error checking supervisor status:", error);
      return false;
    }
  },

  // Get users by tenant
  async getUsersByTenant(tenantId?: string): Promise<UserWithTenant[]> {
    try {
      let query = supabase
        .from("profiles")
        .select(`
          *,
          tenants (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown as UserWithTenant[]) || [];
    } catch (error) {
      console.error("Error fetching users by tenant:", error);
      return [];
    }
  },

  // Get users by role within tenant
  async getUsersByRole(role: UserRole, tenantId?: string): Promise<UserWithTenant[]> {
    try {
      let query = supabase
        .from("profiles")
        .select(`
          *,
          tenants (
            id,
            name
          )
        `)
        .eq("role", role)
        .order("full_name");

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown as UserWithTenant[]) || [];
    } catch (error) {
      console.error("Error fetching users by role:", error);
      return [];
    }
  },

  // Get technicians (for supervisors to manage)
  async getTechnicians(tenantId?: string): Promise<UserWithTenant[]> {
    return this.getUsersByRole("technician", tenantId);
  },

  // Get supervisors (for admins to manage)
  async getSupervisors(tenantId?: string): Promise<UserWithTenant[]> {
    return this.getUsersByRole("supervisor", tenantId);
  },

  // Update user profile
  async updateProfile(id: string, updates: ProfileUpdate): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating profile:", error);
      return null;
    }
  },

  // Update user role (admin only)
  async updateUserRole(userId: string, role: UserRole): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating user role:", error);
      return false;
    }
  },

  // Assign user to tenant (admin only)
  async assignUserToTenant(userId: string, tenantId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ tenant_id: tenantId })
        .eq("id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error assigning user to tenant:", error);
      return false;
    }
  },

  // Delete user (admin only)
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  },

  // Check if user can manage another user (role hierarchy)
  canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
    if (managerRole === "admin") {
      return true; // Admin can manage everyone
    }
    if (managerRole === "supervisor") {
      return targetRole === "technician"; // Supervisors can only manage technicians
    }
    return false; // Technicians cannot manage anyone
  },
};