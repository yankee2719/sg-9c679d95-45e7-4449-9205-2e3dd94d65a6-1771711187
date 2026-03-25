import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    getWorkOrderById,
    updateWorkOrder,
} from "@/lib/server/workOrderApiService";

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const supabase = getServiceSupabase();
        const id = typeof req.query.id === "string" ? req.query.id : null;

        if (!id) {
            return res.status(400).json({ error: "Work order ID is required" });
        }

        try {
            if (req.method === "GET") {
                const data = await getWorkOrderById(supabase, req.user, id);
                if (!data) {
                    return res.status(404).json({ error: "Work order not found" });
                }
                return res.status(200).json(data);
            }

            if (req.method === "PUT" || req.method === "PATCH") {
                if (!["owner", "admin", "supervisor", "technician"].includes(req.user.role)) {
                    return res.status(403).json({ error: "Not allowed" });
                }

                const data = await updateWorkOrder(supabase, req.user, id, req.body ?? {});
                if (!data) {
                    return res.status(404).json({ error: "Work order not found" });
                }

                return res.status(200).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Work order detail API error:", error);
            return res.status(500).json({
                error: error?.message || "Work order request failed",
            });
        }
    },
    { allowPlatformAdmin: true }
);
