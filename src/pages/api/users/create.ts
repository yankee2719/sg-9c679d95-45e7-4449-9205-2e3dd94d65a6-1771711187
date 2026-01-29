import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password, full_name, role, phone } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (!role || !["admin", "supervisor", "technician"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const serviceSupabase = getServiceSupabase();

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name || null,
        role,
      },
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    // Step 2: Create profile in database (direct insert, bypass PostgREST cache)
    const { error: profileError } = await serviceSupabase.from("profiles").insert({
      id: authData.user.id,
      email,
      full_name: full_name || null,
      role,
      phone: phone || null,
      is_active: true,
      two_factor_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      
      // Rollback: Delete auth user if profile creation fails
      await serviceSupabase.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({ error: "Failed to create user profile" });
    }

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: authData.user.id,
        email,
        full_name,
        role,
        phone,
      },
    });
  } catch (error) {
    console.error("Unexpected error in /api/users/create:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withAuth(["admin"], handler);