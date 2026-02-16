import { NextApiRequest, NextApiResponse } from "next";
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
        organizationId: string | null;
    };
}

/**
 * Verify JWT token and extract user info.
 * Reads role from organization_memberships (new schema).
 */
export async function authenticateRequest(
    req: NextApiRequest
): Promise<{ user: AuthenticatedRequest["user"] | null; error?: string }> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return { user: null, error: "Missing or invalid authorization header" };
        }

        const token = authHeader.substring(7);
        const serviceSupabase = getServiceSupabase();
        const { data: { user }, error } = await serviceSupabase.auth.getUser(token);

        if (error || !user) {
            return { user: null, error: "Invalid or expired token" };
        }

        // Get default org from profile
        const { data: profile } = await serviceSupabase
            .from("profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        let organizationId = profile?.default_organization_id || null;
        let role: string | null = null;

        // Get role from organization_memberships
        if (organizationId) {
            const { data: membership } = await serviceSupabase
                .from("organization_memberships")
                .select("role")
                .eq("user_id", user.id)
                .eq("organization_id", organizationId)
                .eq("is_active", true)
                .single();

            role = membership?.role || null;
        }

        // Fallback: try any active membership
        if (!role) {
            const { data: anyMembership } = await serviceSupabase
                .from("organization_memberships")
                .select("role, organization_id")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .limit(1)
                .single();

            if (anyMembership) {
                role = anyMembership.role;
                organizationId = anyMembership.organization_id;
            }
        }

        if (!role) {
            return { user: null, error: "User has no active membership" };
        }

        return {
            user: {
                id: user.id,
                email: user.email || "",
                role: role as "admin" | "supervisor" | "technician",
                organizationId,
            },
        };
    } catch (error) {
        console.error("Authentication error:", error);
        return { user: null, error: "Authentication failed" };
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

        (req as AuthenticatedRequest).user = user;
        return handler(req as AuthenticatedRequest, res);
    };
}

export { getServiceSupabase };

