import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type ApiSuccess = {
    ok: true;
    membership_id: string;
    user_id: string;
};

type ApiError = {
    ok: false;
    error: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getBearerToken(req: NextApiRequest): string | null {
    const auth = req.headers.authorization;
    if (!auth) return null;
    const [type, token] = auth.split(" ");
    if (type !== "Bearer" || !token) return null;
    return token;
}

function getJwtPayload(token: string): Record<string, any> | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const json = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function getAalFromJwt(token: string): "aal1" | "aal2" | null {
    const payload = getJwtPayload(token);
    if (!payload) return null;

    if (payload.aal === "aal1" || payload.aal === "aal2") return payload.aal;
    if (payload.session_level === "aal1" || payload.session_level === "aal2") return payload.session_level;
    if (
        payload.authenticator_assurance_level === "aal1" ||
        payload.authenticator_assurance_level === "aal2"
    ) {
        return payload.authenticator_assurance_level;
    }

    return null;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiSuccess | ApiError>
) {
    if (req.method !== "POST") {
        return res.status(405).json({
            ok: false,
            error: "Method not allowed",
        });
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
        return res.status(500).json({
            ok: false,
            error: "Server configuration missing",
        });
    }

    const token = getBearerToken(req);
    if (!token) {
        return res.status(401).json({
            ok: false,
            error: "Missing bearer token",
        });
    }

    const { membership_id, organization_id } = req.body ?? {};

    if (!membership_id || !organization_id) {
        return res.status(400).json({
            ok: false,
            error: "Missing membership_id or organization_id",
        });
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    try {
        const {
            data: { user },
            error: getUserError,
        } = await supabaseUserClient.auth.getUser();

        if (getUserError || !user) {
            return res.status(401).json({
                ok: false,
                error: "Invalid session",
            });
        }

        const { data: actorMembership, error: actorMembershipError } = await supabaseAdmin
            .from("organization_memberships")
            .select("id, role, is_active, organization_id, user_id")
            .eq("organization_id", organization_id)
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (actorMembershipError) {
            return res.status(500).json({
                ok: false,
                error: actorMembershipError.message,
            });
        }

        if (!actorMembership) {
            return res.status(403).json({
                ok: false,
                error: "You are not an active member of this organization",
            });
        }

        if (actorMembership.role !== "admin" && actorMembership.role !== "owner") {
            return res.status(403).json({
                ok: false,
                error: "Only admins can deactivate users",
            });
        }

        const aal = getAalFromJwt(token);
        if (aal !== "aal2") {
            return res.status(403).json({
                ok: false,
                error: "AAL2 required. Complete MFA verification before deactivating users.",
            });
        }

        const { data: targetMembership, error: targetMembershipError } = await supabaseAdmin
            .from("organization_memberships")
            .select("id, user_id, organization_id, role, is_active")
            .eq("id", membership_id)
            .eq("organization_id", organization_id)
            .maybeSingle();

        if (targetMembershipError) {
            return res.status(500).json({
                ok: false,
                error: targetMembershipError.message,
            });
        }

        if (!targetMembership) {
            return res.status(404).json({
                ok: false,
                error: "Membership not found",
            });
        }

        if (!targetMembership.is_active) {
            return res.status(400).json({
                ok: false,
                error: "Membership is already inactive",
            });
        }

        if (targetMembership.user_id === user.id) {
            return res.status(400).json({
                ok: false,
                error: "You cannot deactivate yourself",
            });
        }

        const { error: updateError } = await supabaseAdmin
            .from("organization_memberships")
            .update({
                is_active: false,
                deactivated_at: new Date().toISOString(),
                deactivated_by: user.id,
            })
            .eq("id", targetMembership.id)
            .eq("organization_id", organization_id);

        if (updateError) {
            return res.status(500).json({
                ok: false,
                error: updateError.message,
            });
        }

        return res.status(200).json({
            ok: true,
            membership_id: targetMembership.id,
            user_id: targetMembership.user_id,
        });
    } catch (error: any) {
        console.error("API /users/deactivate error:", error);

        return res.status(500).json({
            ok: false,
            error: error?.message ?? "Unexpected server error",
        });
    }
}
