import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Regular Supabase client for user operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: "admin" | "supervisor" | "technician";
    tenant_id: string | null;
    organization_id: string | null;
    full_name: string | null;
}

export interface AuthenticatedRequest extends NextApiRequest {
    user: AuthenticatedUser;
}

export type NextApiHandlerWithAuth = (
    req: AuthenticatedRequest,
    res: NextApiResponse
) => void | Promise<void>;

export type RoleType = "admin" | "supervisor" | "technician";

/**
 * Middleware to authenticate requests using Supabase JWT
 * Extracts user from Authorization header Bearer token
 */
export function withAuth(
    handler: NextApiHandlerWithAuth,
    options?: { allowedRoles?: RoleType[] }
) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        try {
            // Extract token from Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({
                    error: "Unauthorized",
                    message: "Missing or invalid authorization header"
                });
            }

            const token = authHeader.replace("Bearer ", "");

            // Verify the token and get user
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (authError || !user) {
                return res.status(401).json({
                    error: "Unauthorized",
                    message: "Invalid or expired token"
                });
            }

            // Get user profile with role and tenant
            const { data: profile, error: profileError } = await supabaseAdmin
                .from("profiles")
                .select("id, email, role, tenant_id, default_organization_id, full_name, is_active")
                .eq("id", user.id)
                .single();

            if (profileError || !profile) {
                return res.status(401).json({
                    error: "Unauthorized",
                    message: "User profile not found"
                });
            }

            // Check if user is active
            if (profile.is_active === false) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "User account is deactivated"
                });
            }

            // Check role permissions if specified
            if (options?.allowedRoles && options.allowedRoles.length > 0) {
                if (!options.allowedRoles.includes(profile.role as RoleType)) {
                    return res.status(403).json({
                        error: "Forbidden",
                        message: "Insufficient permissions for this action"
                    });
                }
            }

            // Attach user to request
            const authenticatedReq = req as AuthenticatedRequest;
            authenticatedReq.user = {
                id: profile.id,
                email: profile.email,
                role: profile.role as RoleType,
                tenant_id: profile.tenant_id,
                organization_id: profile.default_organization_id ?? null,
                full_name: profile.full_name
            };

            return handler(authenticatedReq, res);
        } catch (error) {
            console.error("Auth middleware error:", error);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Authentication failed"
            });
        }
    };
}

/**
 * Helper to create admin-only endpoints
 */
export function withAdminAuth(handler: NextApiHandlerWithAuth) {
    return withAuth(handler, { allowedRoles: ["admin"] });
}

/**
 * Helper to create supervisor+ endpoints (admin or supervisor)
 */
export function withSupervisorAuth(handler: NextApiHandlerWithAuth) {
    return withAuth(handler, { allowedRoles: ["admin", "supervisor"] });
}

/**
 * Get supabase admin client for privileged operations
 */
export function getSupabaseAdmin() {
    return supabaseAdmin;
}

/**
 * Apply tenant filter to queries - returns filter for tenant isolation
 */
export function getTenantFilter(user: AuthenticatedUser) {
    // Admins without tenant can see all, but typically they should also have tenant
    if (!user.tenant_id) {
        return null;
    }
    return { tenant_id: user.tenant_id };
}

