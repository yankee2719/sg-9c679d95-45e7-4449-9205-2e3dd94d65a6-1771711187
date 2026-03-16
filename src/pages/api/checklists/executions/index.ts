import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { createExecutionFromAssignment, listExecutions } from "@/lib/server/checklistExecutionService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getServiceSupabase();

    try {
        if (req.method === "GET") {
            const data = await listExecutions(supabase, req.user);
            return res.status(200).json({ success: true, data });
        }

        if (req.method === "POST") {
            const assignmentId = req.body?.assignment_id;
            const workOrderId = req.body?.work_order_id ?? null;

            if (!assignmentId || typeof assignmentId !== "string") {
                return res.status(400).json({ error: "assignment_id is required" });
            }

            const data = await createExecutionFromAssignment(supabase, req.user, {
                assignmentId,
                workOrderId: typeof workOrderId === "string" ? workOrderId : null,
            });

            return res.status(201).json({ success: true, data });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Checklist executions API error:", error);
        return res.status(500).json({
            error: error?.message || "Checklist execution request failed",
        });
    }
}

export default withAuth(["admin", "supervisor", "technician"], handler);
