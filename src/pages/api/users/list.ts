import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const serviceSupabase = getServiceSupabase();

    // Query users from auth.users (Supabase Auth table)
    const { data: authUsers, error: authError } = await serviceSupabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return res.status(500).json({ error: "Failed to fetch users from auth" });
    }

    // Query profiles from database
    const { data: profiles, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return res.status(500).json({ error: "Failed to fetch profiles" });
    }

    // Merge auth users with profiles
    const users = authUsers.users.map((authUser) => {
      const profile = profiles?.find((p) => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        full_name: profile?.full_name || null,
        role: profile?.role || "technician",
        is_active: profile?.is_active ?? true,
        phone: profile?.phone || null,
        two_factor_enabled: profile?.two_factor_enabled || false,
      };
    });

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Unexpected error in /api/users/list:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withAuth(["admin"], handler);