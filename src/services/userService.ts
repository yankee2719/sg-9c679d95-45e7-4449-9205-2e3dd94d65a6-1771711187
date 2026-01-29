import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const userService = {
  // Get user profile by ID - with proper error handling and fallback
  async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      console.log("🔍 getUserProfile called for userId:", userId);

      // Get current auth session first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("❌ Auth error:", authError);
        return null;
      }

      if (!user) {
        console.error("❌ No authenticated user found");
        return null;
      }

      console.log("✅ Authenticated user:", user.id, user.email);

      // Try to get from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      console.log("📊 Profile query result:", { profile, profileError });

      // If profile exists in database, return it
      if (profile && !profileError) {
        console.log("✅ Profile found in database:", profile.role);
        return profile;
      }

      // Profile doesn't exist or RLS blocked - use auth metadata as fallback
      console.warn("⚠️ Profile not found in database, using auth metadata fallback");
      console.log("📋 User metadata:", user.user_metadata);

      // Return a virtual profile from auth metadata
      const virtualProfile: Profile = {
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        role: user.user_metadata?.role || "technician",
        phone: user.user_metadata?.phone || null,
        is_active: true,
        two_factor_enabled: user.user_metadata?.two_factor_enabled || false,
        two_factor_secret: null, // Default fallback
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        avatar_url: user.user_metadata?.avatar_url || null
      };

      console.log("🔄 Returning virtual profile with role:", virtualProfile.role);
      return virtualProfile;
    } catch (error) {
      console.error("💥 Error in getUserProfile:", error);
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