// ============================================================================
// API: DELETE /api/documents/[id]/access/[grantId]
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { getDocumentService } from "@/services/documentService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res
            .status(405)
            .json({ error: "Method not allowed", allowedMethods: ["DELETE"] });
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
        const serviceSupabase = getServiceSupabase();

        const hasPermission = await docService.checkUserPermission(
            req.user.userId,
            id,
            "manage"
        );

        if (!hasPermission) {
            return res.status(403).json({
                error: "Access denied - Manage permission required to revoke access",
            });
        }

        const { data: existingGrant, error: grantError } = await serviceSupabase
            .from("document_access_grants")
            .select(
                "id, document_id, granted_to_role, granted_to_user_id, permission_level, is_active"
            )
            .eq("id", grantId)
            .single();

        if (grantError || !existingGrant) {
            return res.status(404).json({ error: "Grant not found" });
        }

        if (existingGrant.document_id !== id) {
            return res
                .status(400)
                .json({ error: "Grant does not belong to this document" });
        }

        if (!existingGrant.is_active) {
            return res.status(400).json({ error: "Grant is already revoked" });
        }

        const body = req.body || {};
        const revokeReason = body.revokeReason || "Revoked by user";

        const { error: revokeError } = await serviceSupabase.rpc(
            "revoke_document_access",
            {
                p_grant_id: grantId,
                p_revoked_by: req.user.userId,
                p_revoke_reason: revokeReason,
            }
        );

        if (revokeError) {
            throw revokeError;
        }

        return res.status(200).json({
            success: true,
            message: "Access revoked successfully",
            revoked: {
                grantId,
                documentId: id,
                grantedToRole: existingGrant.granted_to_role,
                grantedToUserId: existingGrant.granted_to_user_id,
                permissionLevel: existingGrant.permission_level,
                revokedBy: req.user.userId,
                revokeReason,
                revokedAt: new Date().toISOString(),
            },
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

