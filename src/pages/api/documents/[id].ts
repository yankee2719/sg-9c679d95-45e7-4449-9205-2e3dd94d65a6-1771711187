import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { getAccessibleDocumentById } from "@/lib/server/documentVisibility";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Document ID is required" });
    }

    try {
        const serviceSupabase = getServiceSupabase();
        const document = await getAccessibleDocumentById(req, id);

        if (!document) {
            return res.status(404).json({ error: "Document not found or access denied" });
        }

        if (req.method === "GET") {
            return res.status(200).json({ success: true, data: document });
        }

        if (req.method === "PATCH") {
            if (!["admin", "supervisor"].includes(req.user.role)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const payload = req.body ?? {};
            const { data, error } = await serviceSupabase
                .from("documents")
                .update({
                    title: typeof payload.title === "string" ? payload.title.trim() : undefined,
                    description: typeof payload.description === "string" ? payload.description.trim() : undefined,
                    category: typeof payload.category === "string" ? payload.category : undefined,
                    language: typeof payload.language === "string" ? payload.language : undefined,
                    regulatory_reference: typeof payload.regulatory_reference === "string" ? payload.regulatory_reference.trim() : undefined,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select("id, title, description, category, language, regulatory_reference, machine_id, organization_id, version_count, file_size, updated_at, created_at, is_archived, external_url, storage_bucket, storage_path")
                .single();

            if (error) throw error;
            return res.status(200).json({ success: true, data });
        }

        if (req.method === "DELETE") {
            if (!["admin", "supervisor"].includes(req.user.role)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const { error } = await serviceSupabase
                .from("documents")
                .update({ is_archived: true, archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq("id", id);

            if (error) throw error;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: "Method not allowed", allowedMethods: ["GET", "PATCH", "DELETE"] });
    } catch (error) {
        console.error("Document detail API error:", error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Operation failed",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

