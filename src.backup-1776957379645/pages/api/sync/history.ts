import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
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

        const supabase = getServiceSupabase();
        const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
        const limit = Math.min(Math.max(Number(rawLimit || 12), 1), 50);

        const { data, error } = await supabase
            .from("sync_sessions")
            .select("id, plant_id, device_id, operations_synced, operations_failed, conflicts_detected, status, completed_at, created_at")
            .eq("organization_id", req.user.organizationId)
            .order("completed_at", { ascending: false, nullsFirst: false })
            .limit(limit);

        if (error) throw error;

        return res.status(200).json({
            sessions: Array.isArray(data) ? data : [],
        });
    } catch (error) {
        console.error("Sync history API error:", error);
        return res.status(500).json({ error: "Unable to load sync history" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
