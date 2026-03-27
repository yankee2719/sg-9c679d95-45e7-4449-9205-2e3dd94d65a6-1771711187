import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { ChecklistTemplateError, saveChecklistTemplate } from "@/lib/server/checklistTemplateCatalogService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const supabase = getServiceSupabase();
        const result = await saveChecklistTemplate(supabase, req.user, req.body ?? {});
        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Checklist template save API error:", error);
        if (error instanceof ChecklistTemplateError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
}

export default withAuth(["owner", "admin", "supervisor"], handler);
