import type { NextApiResponse } from "next";
import { ALL_APP_ROLES, withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { ChecklistTemplateError, listChecklistTemplateCatalog } from "@/lib/server/checklistTemplateCatalogService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const supabase = getServiceSupabase();
        const rows = await listChecklistTemplateCatalog(supabase, req.user);
        return res.status(200).json({ rows });
    } catch (error: any) {
        console.error("Checklist template catalog API error:", error);
        if (error instanceof ChecklistTemplateError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
