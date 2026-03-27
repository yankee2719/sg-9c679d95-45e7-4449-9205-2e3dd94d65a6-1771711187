import type { NextApiResponse } from "next";
import { ALL_APP_ROLES, withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { ChecklistTemplateError, getChecklistTemplateDetail } from "@/lib/server/checklistTemplateCatalogService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const templateId = String(req.query.id || "");
        const supabase = getServiceSupabase();
        const template = await getChecklistTemplateDetail(supabase, req.user, templateId);
        return res.status(200).json(template);
    } catch (error: any) {
        console.error("Checklist template detail API error:", error);
        if (error instanceof ChecklistTemplateError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
