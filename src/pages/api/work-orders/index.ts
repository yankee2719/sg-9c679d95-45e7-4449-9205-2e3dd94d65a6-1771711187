import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { createWorkOrder, listWorkOrders } from "@/lib/server/workOrderApiService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getServiceSupabase();

    try {
        if (req.method === "GET") {
            const rawStatus = req.query.status;
            const status = Array.isArray(rawStatus) ? rawStatus : rawStatus ? [rawStatus] : [];
            const machineId =
                typeof req.query.machine_id === "string"
                    ? req.query.machine_id
                    : typeof req.query.equipment_id === "string"
                        ? req.query.equipment_id
                        : null;

            const data = await listWorkOrders(supabase, req.user, {
                machineId,
                status,
                myOrders: req.query.my_orders === "true",
            });

            return res.status(200).json({ success: true, workOrders: data, data });
        }

        if (req.method === "POST") {
            if (!["admin", "supervisor"].includes(req.user.role)) {
                return res.status(403).json({ error: "Only admin or supervisor can create work orders." });
            }

            const data = await createWorkOrder(supabase, req.user, req.body ?? {});
            return res.status(201).json({ success: true, workOrder: data, data });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Work orders API error:", error);
        return res.status(500).json({ error: error?.message || "Work order request failed" });
    }
}

export default withAuth(["admin", "supervisor", "technician"], handler);
