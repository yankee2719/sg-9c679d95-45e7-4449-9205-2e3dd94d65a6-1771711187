import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { canManageMembers, toWritableOrgRole } from "@/lib/roles";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Invalid membership ID" });
        }

        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
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

        if (!actorMembership || !canManageMembers(actorMembership.role)) {
            return res.status(403).json({ error: "Only organization admins can remove users" });
        }

        let { data: targetMembership, error: membershipError } = await serviceSupabase
            .from("organization_memberships")
            .select("id, user_id, organization_id, role")
            .eq("id", id)
            .eq("organization_id", req.user.organizationId)
            .maybeSingle();

        if (membershipError) {
            return res.status(500).json({ error: membershipError.message });
        }

        if (!targetMembership) {
            const fallback = await serviceSupabase
                .from("organization_memberships")
                .select("id, user_id, organization_id, role")
                .eq("user_id", id)
                .eq("organization_id", req.user.organizationId)
                .maybeSingle();

            targetMembership = fallback.data ?? null;
            membershipError = fallback.error ?? null;
        }

        if (membershipError) {
            return res.status(500).json({ error: membershipError.message });
        }

        if (!targetMembership) {
            return res.status(404).json({ error: "Membership not found" });
        }

        if (targetMembership.user_id === req.user.id) {
            return res.status(400).json({ error: "Cannot delete your own membership" });
        }

        const { error: deleteError } = await serviceSupabase
            .from("organization_memberships")
            .delete()
            .eq("id", targetMembership.id)
            .eq("organization_id", req.user.organizationId);

        if (deleteError) {
            console.error("Error deleting membership:", deleteError);
            return res.status(500).json({ error: "Failed to remove user from organization" });
        }

        await serviceSupabase
            .from("audit_logs")
            .insert({
                organization_id: req.user.organizationId,
                actor_user_id: req.user.id,
                entity_type: "user_membership",
                entity_id: targetMembership.id,
                action: "delete",
                metadata: {
                    target_user_id: targetMembership.user_id,
                    target_role: targetMembership.role,
                },
            } as any)
            .then(() => undefined)
            .catch((err) => {
                console.error("Audit log insert failed:", err);
            });

        return res.status(200).json({
            message: "User removed from organization successfully",
            membership_id: targetMembership.id,
            user_id: targetMembership.user_id,
        });
    } catch (error) {
        console.error("Unexpected error in /api/users/[id]/delete:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["admin"], handler, { requireAal2: true });