import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

type ResponseData = {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
};

/**
 * API endpoint to create a new user (Admin only)
 * POST /api/admin/create-user
 * 
 * Body:
 * {
 *   email: string;
 *   password: string;
 *   fullName: string;
 *   role: "admin" | "supervisor" | "technician";
 * }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { email, password, fullName, role } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        error: "Email, password, fullName, and role are required",
      });
    }

    // Validate role
    const validRoles = ["admin", "supervisor", "technician"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
        error: `Role must be one of: ${validRoles.join(", ")}`,
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password too weak",
        error: "Password must be at least 8 characters long",
      });
    }

    // Call the Edge Function to create user
    console.log("Calling Edge Function to create user:", { email, role });

    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        email,
        password,
        fullName,
        role,
      },
    });

    if (error) {
      console.error("Edge Function error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create user",
        error: error.message || "Unknown error from Edge Function",
      });
    }

    if (!data.success) {
      console.error("Edge Function returned error:", data.error);
      return res.status(400).json({
        success: false,
        message: "User creation failed",
        error: data.error || "Unknown error",
      });
    }

    console.log("User created successfully:", data.data);

    return res.status(200).json({
      success: true,
      message: "User created successfully",
      data: {
        userId: data.data.userId,
        email: data.data.email,
        role: data.data.role,
      },
    });
  } catch (error: any) {
    console.error("API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message || "Unknown error",
    });
  }
}