import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function canAccessDocument(req: AuthenticatedRequest, documentId: string) {
    const supabase = getServiceSupabase();
    const { data: document, error } = await supabase
        .from("documents")
        .select("id, organization_id, machine_id, storage_bucket, storage_path, mime_type, title")
        .eq("id", documentId)
        .maybeSingle();
    if (error) throw error;
    if (!document) return { allowed: false, document: null, supabase };

    if (req.user.isPlatformAdmin) return { allowed: true, document, supabase };
    if (req.user.organizationId && document.organization_id === req.user.organizationId) {
        return { allowed: true, document, supabase };
    }

    if (document.machine_id && req.user.organizationId) {
        const { data: assignment, error: assignmentError } = await supabase
            .from("machine_assignments")
            .select("id")
            .eq("machine_id", document.machine_id)
            .eq("is_active", true)
            .or(`manufacturer_org_id.eq.${req.user.organizationId},customer_org_id.eq.${req.user.organizationId}`)
            .limit(1)
            .maybeSingle();
        if (assignmentError) throw assignmentError;
        return { allowed: !!assignment, document, supabase };
    }

    return { allowed: false, document, supabase };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    const documentId = typeof req.query.id === "string" ? req.query.id : "";
    const versionId = typeof req.query.versionId === "string" ? req.query.versionId : null;
    const redirect = req.query.redirect !== "0";
    if (!documentId) return res.status(400).json({ error: "Document ID is required" });

    try {
        const access = await canAccessDocument(req, documentId);
        if (!access.document) return res.status(404).json({ error: "Document not found" });
        if (!access.allowed) return res.status(403).json({ error: "Access denied" });

        let path = access.document.storage_path || null;
        let filename = access.document.title || "document";
        let mimeType = access.document.mime_type || "application/octet-stream";
        const bucket = access.document.storage_bucket || "documents";

        if (versionId) {
            const { data: version, error } = await access.supabase
                .from("document_versions")
                .select("id, file_path, file_name, mime_type")
                .eq("id", versionId)
                .eq("document_id", documentId)
                .maybeSingle();
            if (error) return res.status(500).json({ error: error.message });
            if (!version) return res.status(404).json({ error: "Version not found" });
            path = version.file_path || null;
            filename = version.file_name || filename;
            mimeType = version.mime_type || mimeType;
        }

        if (!path) return res.status(400).json({ error: "Document path missing" });

        const { data, error } = await access.supabase.storage.from(bucket).createSignedUrl(path, 600, { download: filename });
        if (error || !data?.signedUrl) return res.status(500).json({ error: error?.message || "Signed URL not available" });

        if (redirect) return res.redirect(data.signedUrl);
        return res.status(200).json({ success: true, signedUrl: data.signedUrl, fileName: filename, mimeType });
    } catch (error: any) {
        console.error("Document download restore error:", error);
        return res.status(500).json({ error: error?.message || "Download failed" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
