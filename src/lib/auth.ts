import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { normalizeAppRole, type AppRole, type CanonicalOrgRole } from "@/lib/roles";

const getSupabaseAdmin = () => {
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

export type MembershipRole = AppRole;
export type LegacyRoleType = CanonicalOrgRole;

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: LegacyRoleType;
    membership_role: MembershipRole;
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

export type RoleType = LegacyRoleType;

function getAuthToken(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }

    const cookies = req.headers.cookie?.split(";") || [];
    for (const cookie of cookies) {
        const [name, ...rest] = cookie.trim().split("=");
        const value = rest.join("=");
        if (!value) continue;
        if (name === "sb-access-token" || name.includes("auth-token")) {
            return decodeURIComponent(value);
        }
    }

    return null;
}

function toCanonicalRole(role: string | null | undefined): CanonicalOrgRole {
    return normalizeAppRole(role) ?? "technician";
}

function hasRequiredRole(actualRole: MembershipRole, allowedRoles: RoleType[]) {
    const actual = toCanonicalRole(actualRole);
    return allowedRoles.includes(actual);
}

async function resolveAuthenticatedUser(
    req: NextApiRequest
): Promise<{ user: AuthenticatedUser | null; error?: string }> {
    try {
        const token = getAuthToken(req);
        if (!token) {
            return { user: null, error: "Missing bearer token" };
        }

        const supabaseAdmin = getSupabaseAdmin();
        const {
            data: { user: authUser },
            error: authError,
        } = await supabaseAdmin.auth.getUser(token);

        if (authError || !authUser) {
            return { user: null, error: "Invalid or expired token" };
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id, email, display_name, first_name, last_name, default_organization_id")
            .eq("id", authUser.id)
            .maybeSingle();

        if (profileError) {
            return { user: null, error: profileError.message };
        }

        const { data: memberships, error: membershipError } = await supabaseAdmin
            .from("organization_memberships")
            .select("organization_id, role, is_active")
            .eq("user_id", authUser.id)
            .eq("is_active", true);

        if (membershipError) {
            return { user: null, error: membershipError.message };
        }

        const membershipRows = memberships ?? [];
        const defaultOrgId = profile?.default_organization_id ?? null;

        const activeMembership =
            membershipRows.find((m) => m.organization_id === defaultOrgId) ??
            membershipRows[0] ??
            null;

        if (!activeMembership) {
            return { user: null, error: "User has no active membership" };
        }

        const membershipRole = (activeMembership.role || "technician") as MembershipRole;
        const fullName =
            profile?.display_name ||
            [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
            authUser.email ||
            null;

        return {
            user: {
                id: authUser.id,
                email: profile?.email || authUser.email || "",
                role: toCanonicalRole(membershipRole),
                membership_role: membershipRole,
                tenant_id: activeMembership.organization_id ?? null,
                organization_id: activeMembership.organization_id ?? null,
                full_name: fullName,
            },
        };
    } catch (error) {
        console.error("Auth middleware error:", error);
        return { user: null, error: "Authentication failed" };
    }
}

export function withAuth(
    handler: NextApiHandlerWithAuth,
    options?: { allowedRoles?: RoleType[] }
) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const { user, error } = await resolveAuthenticatedUser(req);

        if (!user || error) {
            return res.status(401).json({
                error: "Unauthorized",
                message: error || "Authentication failed",
            });
        }

        if (
            options?.allowedRoles?.length &&
            !hasRequiredRole(user.membership_role, options.allowedRoles)
        ) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Insufficient permissions for this action",
            });
        }

        (req as AuthenticatedRequest).user = user;
        return handler(req as AuthenticatedRequest, res);
    };
}

export function withAdminAuth(handler: NextApiHandlerWithAuth) {
    return withAuth(handler, { allowedRoles: ["admin"] });
}

export function withSupervisorAuth(handler: NextApiHandlerWithAuth) {
    return withAuth(handler, { allowedRoles: ["admin", "supervisor"] });
}

export function getTenantFilter(user: AuthenticatedUser) {
    if (!user.organization_id) {
        return null;
    }
    return { organization_id: user.organization_id };
}

export { getSupabaseAdmin };

