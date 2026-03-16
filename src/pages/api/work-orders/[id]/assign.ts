import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { assignWorkOrder } from "@/lib/server/workOrderApiService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!id) {
        return res.status(400).json({ error: "Work order ID is required" });
    }

    if (!["admin", "supervisor"].includes(req.user.role)) {
        return res.status(403).json({ error: "Only admin or supervisor can assign work orders." });
    }

    const technicianId = req.body?.technician_id;
    if (!technicianId || typeof technicianId !== "string") {
        return res.status(400).json({ error: "technician_id is required" });
    }

    try {
        const data = await assignWorkOrder(getServiceSupabase(), req.user, id, technicianId);
        return res.status(200).json({ success: true, workOrder: data, data });
    } catch (error: any) {
        console.error("Work order assign API error:", error);
        return res.status(500).json({ error: error?.message || "Assignment failed" });
    }
}

export default withAuth(["admin", "supervisor", "technician"], handler);
