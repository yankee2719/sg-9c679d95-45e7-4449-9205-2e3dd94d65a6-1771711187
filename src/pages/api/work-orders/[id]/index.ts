import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { getWorkOrderById, updateWorkOrder } from "@/lib/server/workOrderApiService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!id) {
        return res.status(400).json({ error: "Work order ID is required" });
    }

    const supabase = getServiceSupabase();

    try {
        if (req.method === "GET") {
            const data = await getWorkOrderById(supabase, req.user, id);
            if (!data) {
                return res.status(404).json({ error: "Work order not found" });
            }
            return res.status(200).json({ success: true, workOrder: data, data });
        }

        if (req.method === "PATCH") {
            if (!["admin", "supervisor"].includes(req.user.role)) {
                return res.status(403).json({ error: "Only admin or supervisor can update work orders." });
            }

            const data = await updateWorkOrder(supabase, req.user, id, req.body ?? {});
            return res.status(200).json({ success: true, workOrder: data, data });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Work order detail API error:", error);
        return res.status(500).json({ error: error?.message || "Work order request failed" });
    }
}

export default withAuth(["admin", "supervisor", "technician"], handler);
