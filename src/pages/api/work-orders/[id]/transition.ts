import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { transitionWorkOrder } from "@/lib/server/workOrderApiService";

const allowedStatuses = [
    "draft",
    "assigned",
    "scheduled",
    "in_progress",
    "paused",
    "completed",
    "approved",
    "cancelled",
] as const;

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!id) {
        return res.status(400).json({ error: "Work order ID is required" });
    }

    const newStatus = req.body?.new_status;
    if (!newStatus || typeof newStatus !== "string") {
        return res.status(400).json({ error: "new_status is required" });
    }
    if (!allowedStatuses.includes(newStatus as any)) {
        return res.status(400).json({ error: `Invalid status ${newStatus}` });
    }

    try {
        const data = await transitionWorkOrder(
            getServiceSupabase(),
            req.user,
            id,
            newStatus as any,
            typeof req.body?.reason === "string" ? req.body.reason : null
        );

        return res.status(200).json({ success: true, workOrder: data, data });
    } catch (error: any) {
        console.error("Work order transition API error:", error);
        return res.status(500).json({ error: error?.message || "Transition failed" });
    }
}

export default withAuth(["admin", "supervisor", "technician"], handler);
