import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

type Role = "owner" | "admin" | "supervisor" | "technician" | "viewer";

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

function isValidRole(value: unknown): value is Role {
    return ["owner", "admin", "supervisor", "technician", "viewer"].includes(String(value));
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ApiSuccess | ApiError>) {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { email, password, full_name, role, organization_id } = req.body ?? {};

    if (!email || !password || !organization_id || !isValidRole(role)) {
        return res.status(400).json({ ok: false, error: "Missing or invalid required fields" });
    }

    const serviceSupabase = getServiceSupabase();
    let createdUserId: string | null = null;

    try {
        if (!req.user.organizationId) {
            return res.status(400).json({ ok: false, error: "No active organization context" });
        }

        if (organization_id !== req.user.organizationId && !req.user.isPlatformAdmin) {
            return res.status(403).json({
                ok: false,
                error: "You can only create users inside your active organization",
            });
        }

        const { data: actorMembership, error: actorMembershipError } = await serviceSupabase
            .from("organization_memberships")
            .select("id, role, organization_id, is_active")
            .eq("organization_id", organization_id)
            .eq("user_id", req.user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (actorMembershipError) {
            return res.status(500).json({ ok: false, error: actorMembershipError.message });
        }

        if (!actorMembership && !req.user.isPlatformAdmin) {
            return res.status(403).json({ ok: false, error: "Actor membership not found" });
        }

        if (!req.user.isPlatformAdmin && !["owner", "admin"].includes(actorMembership?.role || "")) {
            return res.status(403).json({ ok: false, error: "Only organization admins can create users" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const { data: createdAuthUser, error: createUserError } =
            await serviceSupabase.auth.admin.createUser({
                email: normalizedEmail,
                password: String(password),
                email_confirm: true,
                user_metadata: {
                    full_name: full_name ? String(full_name).trim() : null,
                    display_name: full_name ? String(full_name).trim() : null,
                },
            });

        if (createUserError || !createdAuthUser.user) {
            return res.status(400).json({
                ok: false,
                error: createUserError?.message ?? "User creation failed",
            });
        }

        createdUserId = createdAuthUser.user.id;

        const displayName = full_name ? String(full_name).trim() : null;
        const nameParts = displayName ? displayName.split(" ").filter(Boolean) : [];
        const firstName = nameParts.length > 0 ? nameParts[0] : null;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

        await serviceSupabase.from("profiles").upsert(
            {
                id: createdUserId,
                email: normalizedEmail,
                display_name: displayName,
                first_name: firstName,
                last_name: lastName,
                default_organization_id: organization_id,
            } as any,
            { onConflict: "id" }
        );

        const { data: insertedMembership, error: insertMembershipError } = await serviceSupabase
            .from("organization_memberships")
            .insert({
                organization_id,
                user_id: createdUserId,
                role,
                is_active: true,
                accepted_at: new Date().toISOString(),
                invited_by: req.user.id,
            } as any)
            .select("id")
            .single();

        if (insertMembershipError || !insertedMembership) {
            await serviceSupabase.auth.admin.deleteUser(createdUserId);
            return res.status(500).json({
                ok: false,
                error: insertMembershipError?.message ?? "Membership creation failed",
            });
        }

        await serviceSupabase
            .from("audit_logs")
            .insert({
                organization_id,
                actor_user_id: req.user.id,
                entity_type: "user_membership",
                entity_id: insertedMembership.id,
                action: "create",
                metadata: {
                    target_user_id: createdUserId,
                    target_email: normalizedEmail,
                    target_role: role,
                },
            } as any)
            .then(() => undefined)
            .catch((err) => {
                console.error("Audit log insert failed:", err);
            });

        return res.status(200).json({
            ok: true,
            user_id: createdUserId,
            membership_id: insertedMembership.id,
            email: normalizedEmail,
        });
    } catch (error: any) {
        console.error("API /users/create error:", error);

        if (createdUserId) {
            try {
                await serviceSupabase.auth.admin.deleteUser(createdUserId);
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

export default withAuth(["owner", "admin"], handler, { requireAal2: true });