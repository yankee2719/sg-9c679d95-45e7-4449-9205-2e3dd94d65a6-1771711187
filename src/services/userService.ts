import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function getAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUserById(id: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUser(id: string, updates: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createUserProfile(userData: {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "supervisor" | "technician";
}): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function toggleUserStatus(id: string, isActive: boolean): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUsersByRole(role: "admin" | "supervisor" | "technician"): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", role)
    .eq("is_active", true)
    .order("full_name");

  if (error) throw error;
  return data || [];
}

export async function searchUsers(searchTerm: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateUserAvatar(id: string, avatarUrl: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export const userService = {
  getAllUsers,
  getUserById,
  updateUser,
  createUserProfile,
  deleteUser,
  toggleUserStatus,
  getUsersByRole,
  searchUsers,
  updateUserAvatar
};