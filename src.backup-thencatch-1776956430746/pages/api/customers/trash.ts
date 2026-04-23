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
            .from("organizations")
            .select("id, name, city, email, phone, created_at, deleted_at, deleted_by, manufacturer_org_id, type")
            .eq("type", "customer")
            .eq("is_deleted", true)
            .order("deleted_at", { ascending: false });

        if (!req.user.isPlatformAdmin) {
            query.eq("manufacturer_org_id", req.user.organizationId);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({
            customers: data ?? [],
        });
    } catch (error) {
        console.error("Unexpected error in /api/customers/trash:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["owner", "admin", "supervisor"], handler, {
    allowPlatformAdmin: true,
});