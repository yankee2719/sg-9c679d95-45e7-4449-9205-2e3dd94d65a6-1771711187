import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type Role = "admin" | "supervisor" | "technician";

type ApiSuccess = {
    ok: true;
    user_id: string;
    membership_id: string;
    email: string;
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

function isValidRole(value: unknown): value is Role {
    return value === "admin" || value === "supervisor" || value === "technician";
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

    if (payload.aal === "aal1" || payload.aal === "aal2") {
        return payload.aal;
    }

    if (payload.session_level === "aal1" || payload.session_level === "aal2") {
        return payload.session_level;
    }

    if (payload.authenticator_assurance_level === "aal1" || payload.authenticator_assurance_level === "aal2") {
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

    const {
        email,
        password,
        full_name,
        role,
        organization_id,
    } = req.body ?? {};

    if (
        !email ||
        !password ||
        !organization_id ||
        !isValidRole(role)
    ) {
        return res.status(400).json({
            ok: false,
            error: "Missing or invalid required fields",
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

    let createdUserId: string | null = null;

    try {
        // 1) Verifica utente autenticato
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

        // 2) Verifica ruolo chiamante
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from("organization_memberships")
            .select("id, role, is_active, organization_id")
            .eq("organization_id", organization_id)
            .eq("user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (membershipError) {
            return res.status(500).json({
                ok: false,
                error: membershipError.message,
            });
        }

        if (!membership) {
            return res.status(403).json({
                ok: false,
                error: "You are not an active member of this organization",
            });
        }

        if (membership.role !== "admin") {
            return res.status(403).json({
                ok: false,
                error: "Only admins can create users",
            });
        }

        // 3) Verifica MFA / AAL2 per admin
        const aal = getAalFromJwt(token);

        if (aal !== "aal2") {
            return res.status(403).json({
                ok: false,
                error: "AAL2 required. Complete MFA verification before creating users.",
            });
        }

        // 4) Verifica che organization esista
        const { data: org, error: orgError } = await supabaseAdmin
            .from("organizations")
            .select("id, name")
            .eq("id", organization_id)
            .single();

        if (orgError || !org) {
            return res.status(400).json({
                ok: false,
                error: "Organization not found",
            });
        }

        // 5) Crea utente auth
        const { data: createdAuthUser, error: createUserError } =
            await supabaseAdmin.auth.admin.createUser({
                email: String(email).trim().toLowerCase(),
                password: String(password),
                email_confirm: true,
                user_metadata: {
                    full_name: full_name ? String(full_name).trim() : null,
                },
            });

        if (createUserError || !createdAuthUser.user) {
            return res.status(400).json({
                ok: false,
                error: createUserError?.message ?? "User creation failed",
            });
        }

        createdUserId = createdAuthUser.user.id;

        // 6) Aggiorna profilo se esiste già trigger automatico profiles
        // Se il trigger crea profiles automaticamente, questo update va bene.
        // Se non esiste il profilo, questa query potrebbe non trovare righe: non è grave.
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
                display_name: full_name ? String(full_name).trim() : null,
            })
            .eq("id", createdUserId);

        if (profileError) {
            console.warn("Profile update warning:", profileError.message);
        }

        // 7) Crea membership
        const { data: insertedMembership, error: insertMembershipError } =
            await supabaseAdmin
                .from("organization_memberships")
                .insert({
                    organization_id,
                    user_id: createdUserId,
                    role,
                    is_active: true,
                    accepted_at: new Date().toISOString(),
                })
                .select("id")
                .single();

        if (insertMembershipError || !insertedMembership) {
            // rollback auth user
            await supabaseAdmin.auth.admin.deleteUser(createdUserId);

            return res.status(500).json({
                ok: false,
                error: insertMembershipError?.message ?? "Membership creation failed",
            });
        }

        return res.status(200).json({
            ok: true,
            user_id: createdUserId,
            membership_id: insertedMembership.id,
            email: String(email).trim().toLowerCase(),
        });
    } catch (error: any) {
        console.error("API /users/create error:", error);

        if (createdUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId);
            } catch (rollbackError) {
                console.error("Rollback deleteUser error:", rollbackError);
            }
        }

        return res.status(500).json({
            ok: false,
            error: error?.message ?? "Unexpected server error",
        });
    }
}