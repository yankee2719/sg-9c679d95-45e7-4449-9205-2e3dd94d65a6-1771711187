import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import {
    getWorkOrderChecklistContext,
    WorkOrderChecklistContextError,
} from "@/lib/server/workOrderChecklistContextService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!id) {
        return res.status(400).json({ error: "Work order ID is required" });
    }

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const supabase = getServiceSupabase();

    try {
        const data = await getWorkOrderChecklistContext(supabase, req.user, id);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        console.error("Work order checklist context API error:", error);
        if (error instanceof WorkOrderChecklistContextError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: error?.message || "Checklist context request failed" });
    }
}

export default withAuth(["admin", "supervisor", "technician"], handler);

