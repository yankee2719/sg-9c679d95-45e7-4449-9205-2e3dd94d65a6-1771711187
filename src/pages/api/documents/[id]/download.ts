import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest } from "@/lib/apiAuth";
import { resolveDocumentAccess } from "@/lib/server/documentWorkflow";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const documentId = typeof req.query.id === "string" ? req.query.id : "";
    const versionId = typeof req.query.versionId === "string" ? req.query.versionId : null;
    const redirect = req.query.redirect !== "0";

    if (!documentId) {
        return res.status(400).json({ error: "Document ID is required" });
    }

    try {
        const access = await resolveDocumentAccess(req, documentId);
        if (!access.document) {
            return res.status(404).json({ error: "Document not found" });
        }
        if (!access.canView) {
            return res.status(403).json({ error: "Access denied" });
        }

        let storagePath = access.document.storage_path || null;
        let fileName = access.document.title || "document";
        let mimeType = access.document.mime_type || "application/octet-stream";
        const bucket = access.document.storage_bucket || "documents";

        if (versionId) {
            const { data: version, error: versionError } = await access.serviceSupabase
                .from("document_versions")
                .select("id, document_id, file_path, file_name, mime_type")
                .eq("id", versionId)
                .eq("document_id", documentId)
                .maybeSingle();

            if (versionError) {
                return res.status(500).json({ error: versionError.message });
            }
            if (!version) {
                return res.status(404).json({ error: "Document version not found" });
            }

            storagePath = version.file_path || null;
            fileName = version.file_name || fileName;
            mimeType = version.mime_type || mimeType;
        }

        if (!storagePath) {
            return res.status(400).json({ error: "Document has no storage path" });
        }

        const { data, error } = await access.serviceSupabase.storage
            .from(bucket)
            .createSignedUrl(storagePath, 60 * 10, {
                download: fileName,
            });

        if (error || !data?.signedUrl) {
            return res.status(500).json({ error: error?.message || "Failed to create signed URL" });
        }

        if (redirect) {
            res.setHeader("Cache-Control", "no-store");
            return res.redirect(data.signedUrl);
        }

        return res.status(200).json({
            success: true,
            signedUrl: data.signedUrl,
            fileName,
            mimeType,
        });
    } catch (error) {
        console.error("Document download API error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Unexpected error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
