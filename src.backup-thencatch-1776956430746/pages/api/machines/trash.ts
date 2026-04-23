import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();

        const query = serviceSupabase
            .from("machines")
            .select(
                "id, name, internal_code, serial_number, model, brand, lifecycle_state, organization_id, deleted_at, deleted_by, created_at"
            )
            .eq("is_deleted", true)
            .order("deleted_at", { ascending: false });

        if (!req.user.isPlatformAdmin) {
            query.eq("organization_id", req.user.organizationId);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({
            machines: data ?? [],
        });
    } catch (error) {
        console.error("Unexpected error in /api/machines/trash:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["owner", "admin", "supervisor"], handler, {
    allowPlatformAdmin: true,
});