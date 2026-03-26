import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest } from "@/lib/apiAuth";
import { resolveDocumentAccess } from "@/lib/server/documentWorkflow";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed", allowedMethods: ["GET"] });
    }

    const documentId = typeof req.query.id === "string" ? req.query.id : "";
    if (!documentId) {
        return res.status(400).json({ error: "Document ID is required" });
    }

    try {
        const access = await resolveDocumentAccess(req, documentId);
        if (!access.document) return res.status(404).json({ error: "Document not found" });
        if (!access.canView) return res.status(403).json({ error: "Access denied" });

        const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "100", 10) || 100, 1), 500);
        const { data: rows, error } = await access.serviceSupabase
            .from("audit_logs")
            .select("id, action, created_at, actor_user_id, metadata")
            .eq("entity_type", "document")
            .eq("entity_id", documentId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) return res.status(500).json({ error: error.message });

        const auditLog = (rows ?? []).map((row: any) => ({
            id: row.id,
            action: row.action,
            performed_at: row.created_at,
            performed_by: row.actor_user_id ?? null,
            ip_address: null,
            details: typeof row.metadata?.details === "string" ? row.metadata.details : null,
            success: row.metadata?.success === false ? false : true,
        }));

        return res.status(200).json({ success: true, auditLog });
    } catch (error) {
        console.error("Document audit log API error:", error);
        return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
