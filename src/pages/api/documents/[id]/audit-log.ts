import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

function formatDetails(row: any) {
    if (row.metadata && Object.keys(row.metadata).length > 0) {
        return JSON.stringify(row.metadata);
    }
    if (row.new_data && Object.keys(row.new_data).length > 0) {
        return JSON.stringify(row.new_data);
    }
    if (row.old_data && Object.keys(row.old_data).length > 0) {
        return JSON.stringify(row.old_data);
    }
    return null;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!id) return res.status(400).json({ error: "Document ID is required" });

    const supabase = getServiceSupabase();
    try {
        const { data: document, error: documentError } = await supabase
            .from("documents")
            .select("id")
            .eq("id", id)
            .maybeSingle();
        if (documentError) throw documentError;
        if (!document) return res.status(404).json({ error: "Document not found" });

        const limit = req.query.limit ? Math.min(Math.max(parseInt(String(req.query.limit), 10), 1), 200) : 100;
        const { data, error } = await supabase
            .from("audit_logs")
            .select("id, action, actor_user_id, created_at, old_data, new_data, metadata")
            .eq("entity_type", "document")
            .eq("entity_id", id)
            .order("created_at", { ascending: false })
            .limit(limit);
        if (error) throw error;

        const auditLog = (data ?? []).map((row: any) => ({
            id: row.id,
            action: row.action,
            performed_at: row.created_at,
            performed_by: row.actor_user_id || "unknown",
            ip_address: null,
            user_agent: null,
            details: formatDetails(row),
            metadata: row.metadata ?? null,
            success: true,
        }));

        return res.status(200).json({ success: true, data: auditLog });
    } catch (error: any) {
        console.error("Document audit log restore error:", error);
        return res.status(500).json({ error: error?.message || "Audit log failed" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
