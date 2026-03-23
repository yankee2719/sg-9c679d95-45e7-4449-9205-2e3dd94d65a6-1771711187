// ============================================================================
// API: GET/PATCH/DELETE /api/documents/[id]
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
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Document ID is required" });
    }

    const docService = getDocumentService();

    try {
        // ====================================================================
        // GET: Retrieve document
        // ====================================================================
        if (req.method === "GET") {
            const hasPermission = await docService.checkUserPermission(
                req.user.userId,
                id,
                "view"
            );

            if (!hasPermission) {
                return res.status(403).json({ error: "Access denied" });
            }

            const document = await docService.getDocumentById(id);

            if (!document) {
                return res.status(404).json({ error: "Document not found" });
            }

            await docService.logDocumentAction(
                id,
                "viewed",
                req.user.userId,
                "Viewed via API"
            );

            return res.status(200).json({ success: true, document });
        }

        // ====================================================================
        // PATCH: Update metadata
        // ====================================================================
        else if (req.method === "PATCH") {
            const hasPermission = await docService.checkUserPermission(
                req.user.userId,
                id,
                "manage"
            );

            if (!hasPermission) {
                return res.status(403).json({
                    error: "Access denied - Manage permission required",
                });
            }

            const body = req.body;

            const updatedDocument = await docService.updateDocumentMetadata(
                {
                    documentId: id,
                    title: body.title,
                    description: body.description,
                    complianceTags: body.complianceTags,
                    tags: body.tags,
                    metadata: body.metadata,
                },
                req.user.userId
            );

            return res.status(200).json({
                success: true,
                message: "Document updated successfully",
                document: updatedDocument,
            });
        }

        // ====================================================================
        // DELETE: Delete document (admin/owner only)
        // ====================================================================
        else if (req.method === "DELETE") {
            if (!["admin", "owner"].includes(req.user.role)) {
                return res
                    .status(403)
                    .json({ error: "Access denied - Admin only" });
            }

            await docService.deleteDocument(id);

            return res.status(200).json({
                success: true,
                message: "Document deleted successfully",
            });
        }

        // ====================================================================
        else {
            return res.status(405).json({ error: "Method not allowed" });
        }
    } catch (error) {
        console.error("Document API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Operation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

