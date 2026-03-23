// ============================================================================
// API: POST /api/documents/create
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        if (!req.user.organizationId) {
            return res
                .status(400)
                .json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();

        const {
            title,
            description,
            category,
            equipment_id,
            document_number,
            compliance_tags,
            tags,
            metadata,
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: "title is required" });
        }

        const { data: doc, error } = await serviceSupabase
            .from("documents")
            .insert({
                title,
                description: description || null,
                category: category || "other",
                equipment_id: equipment_id || null,
                document_number: document_number || null,
                compliance_tags: compliance_tags || [],
                tags: tags || [],
                metadata: metadata || {},
                organization_id: req.user.organizationId,
                uploaded_by: req.user.userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return res.status(201).json({ success: true, document: doc });
    } catch (e: any) {
        console.error("Document create error:", e);
        return res.status(500).json({ error: e.message });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

