import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
type TenantInsert = Database["public"]["Tables"]["tenants"]["Insert"];
type TenantUpdate = Database["public"]["Tables"]["tenants"]["Update"];

export const tenantService = {
  // Get current user's tenant
  async getCurrentTenant(): Promise<Tenant | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return null;

      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", profile.tenant_id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching current tenant:", error);
      return null;
    }
  },

  // Get tenant by ID
  async getTenantById(id: string): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching tenant:", error);
      return null;
    }
  },

  // Create new tenant (only for super admin)
  async createTenant(tenant: TenantInsert): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .insert(tenant)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating tenant:", error);
      return null;
    }
  },

  // Update tenant
  async updateTenant(id: string, updates: TenantUpdate): Promise<Tenant | null> {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating tenant:", error);
      return null;
    }
  },

  // Delete tenant
  async deleteTenant(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting tenant:", error);
      return false;
    }
  },

  // List all tenants (only for super admin)
  async listTenants(): Promise<Tenant[]> {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error listing tenants:", error);
      return [];
    }
  },
};