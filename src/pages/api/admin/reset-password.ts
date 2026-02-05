import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "User ID and new password are required"
      });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return res.status(500).json({
        success: false,
        error: "Server configuration error"
      });
    }

    // Create Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("=== Resetting password for user:", userId);

    // First verify the user exists
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError || !userData.user) {
      console.error("User not found:", getUserError);
      return res.status(404).json({
        success: false,
        error: "User not found in authentication system"
      });
    }

    console.log("=== User found:", userData.user.email);

    // Update user password using Admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return res.status(500).json({
        success: false,
        error: updateError.message
      });
    }

    console.log("=== Password reset successful for user:", userId);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
      user: updateData.user
    });

  } catch (error: unknown) {
    console.error("Error in reset-password API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}