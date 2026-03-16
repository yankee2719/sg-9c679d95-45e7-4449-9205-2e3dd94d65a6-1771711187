import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

type ApiSuccess = {
    ok: true;
    membership_id: string;
    user_id: string;
};

type ApiError = {
    ok: false;
    error: string;
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ApiSuccess | ApiError>) {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { membership_id, organization_id } = req.body ?? {};

    if (!membership_id || !organization_id) {
        return res.status(400).json({ ok: false, error: "Missing membership_id or organization_id" });
    }

    const serviceSupabase = getServiceSupabase();

    try {
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

        if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
            return res.status(403).json({ ok: false, error: "Only admins can deactivate users" });
        }

        const { data: targetMembership, error: targetMembershipError } = await serviceSupabase
            .from("organization_memberships")
            .select("id, user_id, organization_id, role, is_active")
            .eq("id", membership_id)
            .eq("organization_id", organization_id)
            .maybeSingle();

        if (targetMembershipError) {
            return res.status(500).json({ ok: false, error: targetMembershipError.message });
        }

        if (!targetMembership) {
            return res.status(404).json({ ok: false, error: "Membership not found" });
        }

        if (!targetMembership.is_active) {
            return res.status(400).json({ ok: false, error: "Membership is already inactive" });
        }

        if (targetMembership.user_id === req.user.id) {
            return res.status(400).json({ ok: false, error: "You cannot deactivate yourself" });
        }

        const { error: updateError } = await serviceSupabase
            .from("organization_memberships")
            .update({
                is_active: false,
                deactivated_at: new Date().toISOString(),
                deactivated_by: req.user.id,
            } as any)
            .eq("id", targetMembership.id)
            .eq("organization_id", organization_id);

        if (updateError) {
            return res.status(500).json({ ok: false, error: updateError.message });
        }

        return res.status(200).json({
            ok: true,
            membership_id: targetMembership.id,
            user_id: targetMembership.user_id,
        });
    } catch (error: any) {
        console.error("API /users/deactivate error:", error);
        return res.status(500).json({ ok: false, error: error?.message ?? "Unexpected server error" });
    }
}

export default withAuth(["owner", "admin"], handler, { requireAal2: true });
