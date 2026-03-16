import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

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

        let { data: targetMembership, error: membershipError } = await serviceSupabase
            .from("organization_memberships")
            .select("id, user_id, organization_id")
            .eq("id", id)
            .eq("organization_id", req.user.organizationId)
            .maybeSingle();

        if (membershipError) {
            return res.status(500).json({ error: membershipError.message });
        }

        if (!targetMembership) {
            const fallback = await serviceSupabase
                .from("organization_memberships")
                .select("id, user_id, organization_id")
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

export default withAuth(["owner", "admin"], handler, { requireAal2: true });
