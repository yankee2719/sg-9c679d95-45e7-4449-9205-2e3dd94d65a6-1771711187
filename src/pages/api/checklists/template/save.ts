import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    ChecklistTemplateError,
    saveChecklistTemplateVersion,
} from "@/lib/server/checklistTemplateService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const {
        template_id,
        organization_id,
        name,
        description,
        target_type,
        is_active,
        items,
    } = req.body ?? {};

    try {
        if (!organization_id || typeof organization_id !== "string") {
            return res.status(400).json({ error: "organization_id is required" });
        }

        const serviceSupabase = getServiceSupabase();
        const data = await saveChecklistTemplateVersion(serviceSupabase, req.user, {
            templateId: typeof template_id === "string" ? template_id : null,
            organizationId: organization_id,
            name: typeof name === "string" ? name : "",
            description: typeof description === "string" ? description : null,
            targetType: target_type === "production_line" ? "production_line" : "machine",
            isActive: Boolean(is_active ?? true),
            items: Array.isArray(items) ? items : [],
        });

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Checklist template save API error:", error);

        if (error instanceof ChecklistTemplateError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Unexpected server error",
        });
    }
}

export default withAuth(["owner", "admin", "supervisor"], handler, {
    requireAal2: false,
    allowPlatformAdmin: true,
});

