// ============================================================================
// API: POST /api/documents/[id]/access/grant
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
    if (req.method !== "POST") {
        return res
            .status(405)
            .json({ error: "Method not allowed", allowedMethods: ["POST"] });
    }

    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Document ID is required" });
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
                error: "Access denied - Manage permission required to grant access",
            });
        }

        const body = req.body;
        const {
            grantedToRole,
            grantedToUserId,
            permissionLevel,
            grantReason,
            expiresInDays,
        } = body;

        if (!grantedToRole && !grantedToUserId) {
            return res.status(400).json({
                error: "Either grantedToRole or grantedToUserId is required",
            });
        }

        if (grantedToRole && grantedToUserId) {
            return res.status(400).json({
                error: "Cannot grant to both role and user. Choose one.",
            });
        }

        if (!permissionLevel) {
            return res.status(400).json({
                error: "permissionLevel is required (view, download, sign, manage)",
            });
        }

        if (!["view", "download", "sign", "manage"].includes(permissionLevel)) {
            return res.status(400).json({
                error: "Invalid permissionLevel. Must be: view, download, sign, or manage",
            });
        }

        if (!grantReason || grantReason.trim().length === 0) {
            return res.status(400).json({ error: "grantReason is required" });
        }

        if (grantedToRole) {
            const validRoles = ["admin", "supervisor", "technician"];
            if (!validRoles.includes(grantedToRole)) {
                return res.status(400).json({
                    error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
                });
            }
        }

        if (grantedToUserId) {
            const { data: targetUser, error: userError } = await serviceSupabase
                .from("profiles")
                .select("id")
                .eq("id", grantedToUserId)
                .single();

            if (userError || !targetUser) {
                return res.status(400).json({
                    error: "User not found with provided grantedToUserId",
                });
            }
        }

        const expiresAt =
            expiresInDays && expiresInDays > 0
                ? new Date(
                    Date.now() + expiresInDays * 24 * 60 * 60 * 1000
                ).toISOString()
                : null;

        if (expiresInDays && (expiresInDays < 1 || expiresInDays > 365)) {
            return res.status(400).json({
                error: "expiresInDays must be between 1 and 365",
            });
        }

        const { data: grantId, error: grantError } = await serviceSupabase.rpc(
            "grant_document_access",
            {
                p_document_id: id,
                p_permission_level: permissionLevel,
                p_granted_by: req.user.userId,
                p_granted_to_role: grantedToRole || null,
                p_granted_to_user_id: grantedToUserId || null,
                p_expires_at: expiresAt,
                p_grant_reason: grantReason.trim(),
            }
        );

        if (grantError) {
            throw grantError;
        }

        return res.status(201).json({
            success: true,
            message: "Access granted successfully",
            grantId,
            grant: {
                documentId: id,
                grantedToRole: grantedToRole || null,
                grantedToUserId: grantedToUserId || null,
                permissionLevel,
                grantedBy: req.user.userId,
                expiresAt,
                grantReason: grantReason.trim(),
            },
        });
    } catch (error) {
        console.error("Grant Access API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to grant access",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

