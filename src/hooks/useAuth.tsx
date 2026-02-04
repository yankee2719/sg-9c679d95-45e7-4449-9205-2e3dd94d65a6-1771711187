import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { userService, type UserRole } from "@/services/userService";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  role: UserRole | null;
  tenantId: string | null;
  isAdmin: boolean;
  isSupervisor: boolean;
  isTechnician: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id, session.user.email || "");
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user.email || "");
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (id: string, email: string) => {
    try {
      const profile = await userService.getCurrentProfile();
      
      if (profile) {
        const role = profile.role as UserRole;
        setUser({
          id,
          email,
          profile,
          role,
          tenantId: profile.tenant_id,
          isAdmin: role === "admin",
          isSupervisor: role === "supervisor",
          isTechnician: role === "technician",
        });
      } else {
        setUser({
          id,
          email,
          profile: null,
          role: null,
          tenantId: null,
          isAdmin: false,
          isSupervisor: false,
          isTechnician: false,
        });
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      setUser(null);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false,
    isSupervisor: user?.isSupervisor || false,
    isTechnician: user?.isTechnician || false,
    role: user?.role,
    tenantId: user?.tenantId,
  };
}