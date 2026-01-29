import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Admin-only endpoint to create users with profiles
 * Uses Supabase Admin API to bypass RLS and PostgREST
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password, fullName, role, phone } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (!["admin", "supervisor", "technician"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Create Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName || "",
      },
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return res.status(400).json({ error: authError.message });
    }

    if (!authData?.user) {
      return res.status(500).json({ error: "User creation failed" });
    }

    // Create profile in public.profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: email,
        full_name: fullName || "",
        role: role,
        phone: phone || null,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      console.error("Profile error details:", JSON.stringify(profileError, null, 2));
      console.error("Attempted to insert profile with ID:", authData.user.id);
      
      // Rollback: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({ 
        error: "Profile creation failed",
        details: profileError.message,
        code: profileError.code 
      });
    }

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile: profileData,
      },
    });

  } catch (error) {
    console.error("Error in create-user API:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}