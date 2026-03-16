import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();

        const { data: memberships, error } = await serviceSupabase
            .from("organization_memberships")
            .select(
                "id, user_id, role, is_active, accepted_at, created_at, profiles!inner(email, display_name, avatar_url)"
            )
            .eq("organization_id", req.user.organizationId)
            .order("accepted_at", { ascending: false, nullsFirst: false });

        if (error) {
            console.error("Error fetching organization memberships:", error);
            return res.status(500).json({ error: "Failed to fetch organization users" });
        }

        const users = (memberships || []).map((membership: any) => ({
            id: membership.user_id,
            membership_id: membership.id,
            email: membership.profiles?.email || "",
            display_name: membership.profiles?.display_name || null,
            avatar_url: membership.profiles?.avatar_url || null,
            created_at: membership.created_at,
            accepted_at: membership.accepted_at,
            role: membership.role,
            is_active: membership.is_active ?? true,
        }));

        return res.status(200).json({ users });
    } catch (error) {
        console.error("Unexpected error in /api/users/list:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["owner", "admin", "supervisor"], handler);
