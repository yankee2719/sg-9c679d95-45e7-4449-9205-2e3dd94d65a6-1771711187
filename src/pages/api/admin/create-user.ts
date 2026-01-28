import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { email, password, full_name, role } = req.body;

    // Validate input
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        received: {
          email: !!email,
          password: !!password,
          full_name: !!full_name,
          role: !!role,
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    // Get Supabase credentials from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
      });
    }

    // Create Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Creating user with email:", email, "role:", role);

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      },
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return res.status(400).json({
        success: false,
        error: authError.message || "Failed to create user in authentication",
      });
    }

    if (!authData.user) {
      console.error("No user returned from auth creation");
      return res.status(500).json({
        success: false,
        error: "User creation failed - no user returned",
      });
    }

    console.log("Auth user created:", authData.user.id);

    // Create profile in profiles table
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      email,
      full_name,
      role,
      is_active: true,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);

      // Rollback: delete the auth user
      console.log("Rolling back - deleting auth user:", authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return res.status(400).json({
        success: false,
        error: profileError.message || "Failed to create user profile",
      });
    }

    console.log("Profile created successfully for:", email);

    // Return success with user data
    return res.status(200).json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        role,
      },
    });
  } catch (error: any) {
    console.error("Unexpected error in create-user API:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}