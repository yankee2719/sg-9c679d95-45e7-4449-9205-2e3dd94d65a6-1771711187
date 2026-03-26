import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!id) return res.status(400).json({ error: "Document ID is required" });

    const supabase = getServiceSupabase();
    try {
        const { data: document, error: documentError } = await supabase
            .from("documents")
            .select("id, organization_id, machine_id")
            .eq("id", id)
            .maybeSingle();
        if (documentError) throw documentError;
        if (!document) return res.status(404).json({ error: "Document not found" });

        const limit = req.query.limit ? Math.min(Math.max(parseInt(String(req.query.limit), 10), 1), 200) : 100;
        const { data, error } = await supabase
            .from("audit_logs")
            .select("id, action, actor_user_id, created_at, details, success")
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
            details: typeof row.details === "string" ? row.details : row.details ? JSON.stringify(row.details) : null,
            metadata: typeof row.details === "object" && row.details ? row.details : null,
            success: row.success !== false,
        }));

        return res.status(200).json({ success: true, data: auditLog });
    } catch (error: any) {
        console.error("Document audit log restore error:", error);
        return res.status(500).json({ error: error?.message || "Audit log failed" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
