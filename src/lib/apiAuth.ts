import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key (bypasses RLS)
const getServiceSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    email: string;
    role: "admin" | "supervisor" | "technician";
  };
}

/**
 * Verify JWT token and extract user info
 */
export async function authenticateRequest(
  req: NextApiRequest
): Promise<{ user: AuthenticatedRequest["user"]; error?: string }> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null as any, error: "Missing or invalid authorization header" };
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const serviceSupabase = getServiceSupabase();
    const { data: { user }, error } = await serviceSupabase.auth.getUser(token);

    if (error || !user) {
      return { user: null as any, error: "Invalid or expired token" };
    }

    // Get user profile and role from database (direct SQL query)
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { user: null as any, error: "User profile not found" };
    }

    return {
      user: {
        id: user.id,
        email: user.email || "",
        role: profile.role as "admin" | "supervisor" | "technician",
      },
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return { user: null as any, error: "Authentication failed" };
  }
}

/**
 * Require authentication and specific role(s)
 */
export function withAuth(
  allowedRoles: ("admin" | "supervisor" | "technician")[],
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { user, error } = await authenticateRequest(req);

    if (error || !user) {
      return res.status(401).json({ error: error || "Unauthorized" });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    // Call handler
    return handler(req as AuthenticatedRequest, res);
  };
}

/**
 * Get service role Supabase client (bypasses RLS)
 */
export { getServiceSupabase };