import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import {
    ChecklistAssignmentError,
    createChecklistAssignment,
    deactivateChecklistAssignment,
    listChecklistAssignments,
} from "@/lib/server/checklistAssignmentService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getServiceSupabase();

    try {
        if (req.method === "GET") {
            const data = await listChecklistAssignments(supabase, req.user);
            return res.status(200).json({ success: true, data });
        }

        if (req.method === "POST") {
            const templateId = typeof req.body?.template_id === "string" ? req.body.template_id : "";
            const machineId = typeof req.body?.machine_id === "string" ? req.body.machine_id : "";
            const data = await createChecklistAssignment(supabase, req.user, {
                templateId,
                machineId,
            });
            return res.status(201).json({ success: true, data });
        }

        if (req.method === "DELETE") {
            const assignmentId = typeof req.body?.assignment_id === "string" ? req.body.assignment_id : "";
            const data = await deactivateChecklistAssignment(supabase, req.user, assignmentId);
            return res.status(200).json({ success: true, data });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Checklist assignments API error:", error);
        if (error instanceof ChecklistAssignmentError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({
            error: error?.message || "Checklist assignments request failed",
        });
    }
}

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], handler, {
    allowPlatformAdmin: true,
});

