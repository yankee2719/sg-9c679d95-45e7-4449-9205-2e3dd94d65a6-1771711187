import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

export const userService = {
  // Get all users
  async getAllUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get user by ID
  async getUserById(id: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
    return data;
  },

  // Get current user profile
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return this.getUserById(user.id);
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get user role
  async getUserRole(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error getting user role:", error);
      return null;
    }
    return data?.role || null;
  },

  // Update user role (admin only)
  async updateUserRole(userId: string, role: UserRole) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get users by role
  async getUsersByRole(role: UserRole) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", role)
      .order("full_name");

    if (error) throw error;
    return data || [];
  },

  // Get technicians for assignment
  async getTechnicians() {
    return this.getUsersByRole("technician");
  },

  // Check if user has role
  async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const user = await this.getUserById(userId);
    return user?.role === role;
  },

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, "admin");
  }
};