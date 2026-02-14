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

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const serviceSupabase = getServiceSupabase();

    // FIX: Get admin's tenant_id to propagate to new user
    const { data: adminProfile, error: adminError } = await serviceSupabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", req.user.id)
      .single();

    if (adminError || !adminProfile?.tenant_id) {
      return res.status(400).json({
        error: "Cannot create user: your profile has no tenant assigned",
      });
    }

    const tenantId = adminProfile.tenant_id;

    // Check tenant max_users limit
    const { data: tenant } = await serviceSupabase
      .from("tenants")
      .select("max_users")
      .eq("id", tenantId)
      .single();

    if (tenant?.max_users) {
      const { count } = await serviceSupabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      if (count && count >= tenant.max_users) {
        return res.status(400).json({
          error: `Tenant user limit reached (${tenant.max_users}). Contact support to upgrade.`,
        });
      }
    }

    // Step 1: Create user in Supabase Auth with tenant_id in metadata
    const { data: authData, error: authError } =
      await serviceSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || null,
          role,
          tenant_id: tenantId, // FIX: pass tenant_id so trigger picks it up
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
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Step 3: UPSERT profile to ensure it exists with correct data INCLUDING tenant_id
    const { error: profileError } = await serviceSupabase
      .from("profiles")
      .upsert(
        {
          id: authData.user.id,
          email,
          full_name: full_name || null,
          role,
          phone: phone || null,
          tenant_id: tenantId, // FIX: explicitly set tenant_id
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

      // Rollback: Delete auth user
      try {
        await serviceSupabase.auth.admin.deleteUser(authData.user.id);
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }

      return res.status(500).json({
        error: "Failed to create user profile",
        details: profileError.message,
      });
    }

    // Step 4: Verify profile was created with correct tenant_id
    const { data: verifyProfile, error: verifyError } = await serviceSupabase
      .from("profiles")
      .select("id, email, full_name, role, tenant_id")
      .eq("id", authData.user.id)
      .single();

    if (verifyError || !verifyProfile) {
      console.error("Profile verification failed:", verifyError);
      return res
        .status(500)
        .json({ error: "Profile created but verification failed" });
    }

    if (verifyProfile.tenant_id !== tenantId) {
      // Force update tenant_id if trigger didn't set it
      await serviceSupabase
        .from("profiles")
        .update({ tenant_id: tenantId })
        .eq("id", authData.user.id);
    }

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: authData.user.id,
        email,
        full_name,
        role,
        phone,
        tenant_id: tenantId,
      },
    });
  } catch (error) {
    console.error("Unexpected error in /api/users/create:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(["admin"], handler);
], handler);