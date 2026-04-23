import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";
import { getDocumentService } from "@/services/documentService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Method not allowed", allowedMethods: ["DELETE"] });
    }

    const { id, grantId } = req.query;
    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Document ID is required" });
    }
    if (!grantId || typeof grantId !== "string") {
        return res.status(400).json({ error: "Grant ID is required" });
    }

    try {
        const docService = getDocumentService();
        const hasPermission = await docService.checkUserPermission(req.user.userId, id, "manage");

        if (!hasPermission) {
            return res.status(403).json({ error: "Access denied" });
        }

        return res.status(501).json({
            success: false,
            supported: false,
            error: "Document access revocation is not enabled in the current schema",
            message:
                "This repo state does not expose the legacy revoke_document_access RPC or document_access_grants table.",
        });
    } catch (error) {
        console.error("Revoke Access API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to evaluate revoke request",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
