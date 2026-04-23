import type { NextApiResponse } from "next";
import { ALL_APP_ROLES, withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import {
    ChecklistAssignmentError,
    createChecklistAssignment,
    deactivateChecklistAssignment,
    listChecklistAssignments,
} from "@/lib/server/checklistAssignmentService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    try {
        const supabase = getServiceSupabase();

        if (req.method === "GET") {
            const data = await listChecklistAssignments(supabase, req.user);
            return res.status(200).json(data);
        }

        if (req.method === "POST") {
            const assignment = await createChecklistAssignment(supabase, req.user, {
                templateId: String(req.body?.template_id || ""),
                machineId: String(req.body?.machine_id || ""),
            });
            return res.status(201).json(assignment);
        }

        if (req.method === "DELETE") {
            const result = await deactivateChecklistAssignment(
                supabase,
                req.user,
                String(req.body?.assignment_id || "")
            );
            return res.status(200).json(result);
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Checklist assignments API error:", error);
        if (error instanceof ChecklistAssignmentError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
