import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";
import { getDocumentService } from "@/services/documentService";

const DISABLED_REASON =
    "Granular document access revoke is disabled because the current Supabase schema does not include document_access_grants or revoke_document_access.";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res
            .status(405)
            .json({ error: "Method not allowed", allowedMethods: ["DELETE"] });
    }

    const documentId = typeof req.query.id === "string" ? req.query.id : "";
    const grantId = typeof req.query.grantId === "string" ? req.query.grantId : "";

    if (!documentId) {
        return res.status(400).json({ error: "Document ID is required" });
    }

    if (!grantId) {
        return res.status(400).json({ error: "Grant ID is required" });
    }

    try {
        const docService = getDocumentService();

        const hasPermission = await docService.checkUserPermission(
            req.user.userId,
            documentId,
            "manage"
        );

        if (!hasPermission) {
            return res.status(403).json({
                error: "Access denied - Manage permission required to revoke access",
            });
        }

        return res.status(501).json({
            success: false,
            error: "Feature disabled",
            message: DISABLED_REASON,
        });
    } catch (error) {
        console.error("Revoke Access API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to revoke access",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
