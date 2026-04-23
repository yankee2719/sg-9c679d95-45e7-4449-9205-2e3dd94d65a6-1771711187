import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import {
    ChecklistExecutionError,
    completeExecution,
    getExecutionDetail,
} from "@/lib/server/checklistExecutionService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const executionId = typeof req.query.id === "string" ? req.query.id : null;
    if (!executionId) {
        return res.status(400).json({ error: "Execution ID is required" });
    }

    const supabase = getServiceSupabase();

    try {
        if (req.method === "GET") {
            const data = await getExecutionDetail(supabase, req.user, executionId);
            return res.status(200).json({ success: true, data });
        }

        if (req.method === "PATCH") {
            const items = Array.isArray(req.body?.items) ? req.body.items : [];
            const notes = req.body?.notes ?? null;
            const overallStatus = req.body?.overall_status ?? null;

            const data = await completeExecution(supabase, req.user, executionId, {
                items,
                notes,
                overall_status: overallStatus,
            });

            return res.status(200).json({ success: true, data });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Checklist execution detail API error:", error);
        if (error instanceof ChecklistExecutionError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({
            error: error?.message || "Checklist execution request failed",
        });
    }
}

export default withAuth(["admin", "supervisor", "technician"], handler);

