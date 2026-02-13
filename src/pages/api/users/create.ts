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
      email_confirm: true,
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

    // Step 2: Wait for trigger to complete (100ms delay)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 3: UPSERT profile to ensure it exists with correct data
    const { error: profileError } = await serviceSupabase
      .from("profiles")
      .upsert(
        {
          id: authData.user.id,
          email,
          full_name: full_name || null,
          role,
          phone: phone || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
          ignoreDuplicates: false,
        }
      );

    if (profileError) {
      console.error("Error upserting profile:", profileError);

      // Try to rollback: Delete auth user
      try {
        await serviceSupabase.auth.admin.deleteUser(authData.user.id);
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      return res.status(500).json({
        error: "Failed to create user profile",
        details: profileError.message
      });
    }

    // Step 4: Verify profile was created
    const { data: verifyProfile, error: verifyError } = await serviceSupabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (verifyError || !verifyProfile) {
      console.error("Profile verification failed:", verifyError);
      return res.status(500).json({ error: "Profile created but verification failed" });
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
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export default withAuth(["admin"], handler);