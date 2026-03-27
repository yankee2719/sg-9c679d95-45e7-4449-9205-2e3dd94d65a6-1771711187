import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { getWorkOrderChecklistContext } from "@/lib/server/workOrderChecklistContextService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const workOrderId = typeof req.query.id === "string" ? req.query.id : null;
    if (!workOrderId) {
        return res.status(400).json({ error: "Work order ID is required" });
    }

    try {
        const supabase = getServiceSupabase();
        const data = await getWorkOrderChecklistContext(supabase, req.user, workOrderId);
        return res.status(200).json(data);
    } catch (error: any) {
        console.error("Work order checklist context API error:", error);
        return res.status(500).json({ error: error?.message || "Failed to load work order checklist context" });
    }
}

export default withAuth(["owner", "admin", "supervisor", "technician"], handler);
