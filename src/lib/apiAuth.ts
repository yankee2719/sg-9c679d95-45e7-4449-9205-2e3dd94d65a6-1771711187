import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export type AppRole = "owner" | "admin" | "supervisor" | "technician" | "viewer";
export const ALL_APP_ROLES: AppRole[] = ["owner", "admin", "supervisor", "technician", "viewer"];

const VALID_ROLES = new Set < string > (ALL_APP_ROLES);

function getServiceSupabase() {
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
}

function getBearerToken(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    return authHeader.slice(7).trim() || null;
}

function getJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    } catch {
        return null;
    }
}

function getAalFromToken(token: string): "aal1" | "aal2" | null {
    const payload = getJwtPayload(token);
    const value =
        payload?.aal ?? payload?.session_level ?? payload?.authenticator_assurance_level ?? null;

    return value === "aal1" || value === "aal2" ? value : null;
}

export interface AuthenticatedRequest extends NextApiRequest {
    user: {
        id: string;
        email: string;
        role: AppRole;
        organizationId: string | null;
        membershipId: string | null;
        isPlatformAdmin: boolean;
        aal: "aal1" | "aal2" | null;
    };
}

async function resolveMembershipContext(serviceSupabase: ReturnType<typeof getServiceSupabase>, userId: string) {
    const { data: profile } = await serviceSupabase
        .from("profiles")
        .select("default_organization_id")
        .eq("id", userId)
        .maybeSingle();

    const defaultOrganizationId = profile?.default_organization_id ?? null;

    if (defaultOrganizationId) {
        const { data: defaultMembership } = await serviceSupabase
            .from("organization_memberships")
            .select("id, role, organization_id")
            .eq("user_id", userId)
            .eq("organization_id", defaultOrganizationId)
            .eq("is_active", true)
            .maybeSingle();

        if (defaultMembership && VALID_ROLES.has(defaultMembership.role)) {
            return {
                membershipId: defaultMembership.id,
                organizationId: defaultMembership.organization_id,
                role: defaultMembership.role as AppRole,
            };
        }
    }

    const { data: fallbackMembership } = await serviceSupabase
        .from("organization_memberships")
        .select("id, role, organization_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

    if (fallbackMembership && VALID_ROLES.has(fallbackMembership.role)) {
        return {
            membershipId: fallbackMembership.id,
            organizationId: fallbackMembership.organization_id,
            role: fallbackMembership.role as AppRole,
        };
    }

    return {
        membershipId: null,
        organizationId: defaultOrganizationId,
        role: null,
    };
}

export async function authenticateRequest(
    req: NextApiRequest
): Promise<{ user: AuthenticatedRequest["user"] | null; error?: string }> {
    try {
        const token = getBearerToken(req);
        if (!token) {
            return { user: null, error: "Missing or invalid authorization header" };
        }

        const serviceSupabase = getServiceSupabase();
        const {
            data: { user },
            error,
        } = await serviceSupabase.auth.getUser(token);

        if (error || !user) {
            return { user: null, error: "Invalid or expired token" };
        }

        const [{ data: platformAdmin }, membershipContext] = await Promise.all([
            serviceSupabase
                .from("platform_admins")
                .select("id")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .maybeSingle(),
            resolveMembershipContext(serviceSupabase, user.id),
        ]);

        const isPlatformAdmin = !!platformAdmin;
        const resolvedRole = membershipContext.role ?? (isPlatformAdmin ? "admin" : null);

        if (!resolvedRole) {
            return { user: null, error: "User has no active membership" };
        }

        return {
            user: {
                id: user.id,
                email: user.email || "",
                role: resolvedRole,
                organizationId: membershipContext.organizationId,
                membershipId: membershipContext.membershipId,
                isPlatformAdmin,
                aal: getAalFromToken(token),
            },
        };
    } catch (error) {
        console.error("Authentication error:", error);
        return { user: null, error: "Authentication failed" };
    }
}

export function withAuth(
    allowedRoles: AppRole[],
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<unknown>,
    options?: {
        requireAal2?: boolean;
        allowPlatformAdmin?: boolean;
    }
) {
    const requireAal2 = options?.requireAal2 ?? false;
    const allowPlatformAdmin = options?.allowPlatformAdmin ?? true;

    return async (req: NextApiRequest, res: NextApiResponse) => {
        const { user, error } = await authenticateRequest(req);

        if (error || !user) {
            return res.status(401).json({ error: error || "Unauthorized" });
        }

        const allowed = allowPlatformAdmin && user.isPlatformAdmin
            ? true
            : allowedRoles.includes(user.role);

        if (!allowed) {
            return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        }

        if (requireAal2 && user.aal !== "aal2") {
            return res.status(403).json({ error: "AAL2 required. Complete MFA verification first." });
        }

        (req as AuthenticatedRequest).user = user;
        return handler(req as AuthenticatedRequest, res);
    };
}

export { getServiceSupabase };
