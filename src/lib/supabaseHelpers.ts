import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  full_name: string | null;
  role: string | null;
}

// Helper function to fetch profile data - isolated to avoid deep type instantiation
export async function getProfileData(userId: string): Promise<ProfileData | null> {
  // @ts-expect-error - Supabase types cause deep instantiation errors
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle();
  
  if (error || !data) return null;
  return { full_name: data.full_name, role: data.role };
}

// Helper function to fetch notification count - isolated to avoid deep type instantiation
export async function getNotificationCount(userId: string): Promise<number> {
  // @ts-expect-error - Supabase types cause deep instantiation errors
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  
  return count || 0;
}