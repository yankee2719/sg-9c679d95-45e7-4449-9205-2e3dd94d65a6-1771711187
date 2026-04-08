import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

const ALLOWED_ROLES = ["admin", "supervisor", "technician"] as const;

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;
        const { user_id, display_name, role, is_active } = req.body ?? {};

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Invalid membership ID" });
        }

        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        if (role !== undefined && !ALLOWED_ROLES.includes(String(role) as (typeof ALLOWED_ROLES)[number])) {
            return res.status(400).json({ error: "Invalid role" });
        }

        const serviceSupabase = getServiceSupabase();

        const { data: actorMembership, error: actorMembershipError } = await serviceSupabase
            .from("organization_memberships")
            .select("id, role, organization_id")
            .eq("organization_id", req.user.organizationId)
            .eq("user_id", req.user.id)
            .eq("is_active", true)
            .maybeSingle();

        if (actorMembershipError) {
            return res.status(500).json({ error: actorMembershipError.message });
        }

        if (!actorMembership || String(actorMembership.role) !== "admin") {
            return res.status(403).json({ error: "Only organization admins can update users" });
        }

        const { data: targetMembership, error: membershipError } = await serviceSupabase
            .from("organization_memberships")
            .select("id, user_id, organization_id, role, is_active")
            .eq("id", id)
            .eq("organization_id", req.user.organizationId)
            .maybeSingle();

        if (membershipError) {
            return res.status(500).json({ error: membershipError.message });
        }

        if (!targetMembership) {
            return res.status(404).json({ error: "Membership not found" });
        }

        if (user_id && user_id !== targetMembership.user_id) {
            return res.status(400).json({ error: "user_id does not match membership" });
        }

        if (targetMembership.user_id === req.user.id) {
            if (is_active === false) {
                return res.status(400).json({ error: "You cannot deactivate yourself" });
            }
            if (role && role !== targetMembership.role) {
                return res.status(400).json({ error: "You cannot change your own role" });
            }
        }

        const membershipUpdate: Record<string, unknown> = {};

        if (role !== undefined) {
            membershipUpdate.role = role;
        }

        if (is_active !== undefined) {
            membershipUpdate.is_active = Boolean(is_active);

            if (Boolean(is_active)) {
                membershipUpdate.deactivated_at = null;
                membershipUpdate.deactivated_by = null;
            } else {
                membershipUpdate.deactivated_at = new Date().toISOString();
                membershipUpdate.deactivated_by = req.user.id;
            }
        }

        if (Object.keys(membershipUpdate).length > 0) {
            const { error: updateMembershipError } = await serviceSupabase
                .from("organization_memberships")
                .update(membershipUpdate as any)
                .eq("id", targetMembership.id)
                .eq("organization_id", req.user.organizationId);

            if (updateMembershipError) {
                return res.status(500).json({ error: updateMembershipError.message });
            }
        }

        if (display_name !== undefined) {
            const fullName = String(display_name || "").trim();
            const parts = fullName.split(" ").filter(Boolean);

            const { error: profileError } = await serviceSupabase
                .from("profiles")
                .update({
                    display_name: fullName || null,
                    first_name: parts[0] ?? null,
                    last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
                    updated_at: new Date().toISOString(),
                } as any)
                .eq("id", targetMembership.user_id);

            if (profileError) {
                return res.status(500).json({ error: profileError.message });
            }
        }

        await serviceSupabase
            .from("audit_logs")
            .insert({
                organization_id: req.user.organizationId,
                actor_user_id: req.user.id,
                entity_type: "user_membership",
                entity_id: targetMembership.id,
                action: "update",
                metadata: {
                    target_user_id: targetMembership.user_id,
                },
                new_data: {
                    role: role ?? targetMembership.role,
                    is_active:
                        is_active !== undefined ? Boolean(is_active) : targetMembership.is_active,
                    display_name:
                        display_name !== undefined ? String(display_name || "").trim() : undefined,
                },
            } as any)
            .then(() => undefined)
            .catch((err) => {
                console.error("Audit log insert failed:", err);
            });

        return res.status(200).json({
            message: "User updated successfully",
            membership_id: targetMembership.id,
            user_id: targetMembership.user_id,
        });
    } catch (error) {
        console.error("Unexpected error in /api/users/[id]/update:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["admin"], handler, { requireAal2: true });

