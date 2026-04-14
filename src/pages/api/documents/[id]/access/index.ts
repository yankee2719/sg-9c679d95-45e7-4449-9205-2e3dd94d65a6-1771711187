import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";
import { getDocumentService } from "@/services/documentService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed", allowedMethods: ["GET"] });
    }

    const { id } = req.query;
    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Document ID is required" });
    }

    try {
        const docService = getDocumentService();
        const hasPermission = await docService.checkUserPermission(req.user.userId, id, "view");

        if (!hasPermission) {
            return res.status(403).json({ error: "Access denied" });
        }

        return res.status(200).json({
            success: true,
            supported: false,
            grants: [],
            stats: {
                total: 0,
                byPermissionLevel: {},
                byGrantType: { role: 0, user: 0 },
                expired: 0,
                active: 0,
            },
            message:
                "Explicit document access grants are disabled in this repository state because the current Supabase schema does not expose the legacy document_access_grants table or related grant/revoke RPCs.",
        });
    } catch (error) {
        console.error("Access Grants List API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to retrieve access grants",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
