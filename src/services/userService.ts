import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const userService = {
  // Get user profile by ID - with fallback to auth.users metadata
  async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      // Try to get from profiles table first
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      // If profile exists, return it
      if (data && !error) {
        return data;
      }

      // Profile doesn't exist - check auth.users metadata as fallback
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.id === userId) {
        // Return a virtual profile from auth metadata
        return {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          role: user.user_metadata?.role || "technician",
          phone: user.user_metadata?.phone || null,
          is_active: true,
          two_factor_enabled: user.user_metadata?.two_factor_enabled || false,
          two_factor_secret: null,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Profile;
      }

      return null;
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      
      // Last resort fallback - return minimal profile from current session
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        return {
          id: user.id,
          email: user.email || "",
          full_name: user.email?.split("@")[0] || "User",
          role: "technician",
          phone: null,
          is_active: true,
          two_factor_enabled: false,
          two_factor_secret: null,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Profile;
      }
      
      return null;
    }
  },

  // Get user role
  async getUserRole(userId: string): Promise<string | null> {
    const profile = await this.getUserProfile(userId);
    return profile?.role || null;
  },

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    const profile = await this.getUserProfile(userId);
    return profile?.role === "admin";
  },

  // Get all users (admin only)
  async getAllUsers(): Promise<Profile[]> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<Profile>): Promise<{ error: any | null }> {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  // Create user profile
  async createUserProfile(profile: Omit<Profile, "created_at" | "updated_at">): Promise<{ error: any | null }> {
    try {
      const { error } = await supabase
        .from("profiles")
        .insert(profile);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  // Delete user profile
  async deleteUserProfile(userId: string): Promise<{ error: any | null }> {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      return { error };
    } catch (error) {
      return { error };
    }
  }
};