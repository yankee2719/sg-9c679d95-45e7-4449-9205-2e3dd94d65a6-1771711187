// ============================================================================
// API: GET/POST /api/documents/[id]/download
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";
import { getDocumentService } from "@/services/documentService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Document ID is required" });
    }

    const docService = getDocumentService();

    try {
        const hasPermission = await docService.checkUserPermission(
            req.user.userId,
            id,
            "download"
        );

        if (!hasPermission) {
            return res.status(403).json({
                error: "Access denied - Download permission required",
            });
        }

        // ====================================================================
        // GET: Download diretto
        // ====================================================================
        if (req.method === "GET") {
            const { blob, filename, mimeType } =
                await docService.downloadDocument(id, req.user.userId);

            const buffer = Buffer.from(await blob.arrayBuffer());

            res.setHeader("Content-Type", mimeType);
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${encodeURIComponent(filename)}"`
            );
            res.setHeader("Content-Length", buffer.length.toString());

            return res.status(200).send(buffer);
        }

        // ====================================================================
        // POST: Get signed URL
        // ====================================================================
        else if (req.method === "POST") {
            const body = req.body;
            const expiresIn = body.expiresIn || 3600;

            const signedUrl = await docService.getSignedUrl(id, expiresIn);

            await docService.logDocumentAction(
                id,
                "downloaded",
                req.user.userId,
                "Generated signed URL for download",
                { expiresIn }
            );

            return res.status(200).json({
                success: true,
                signedUrl,
                expiresIn,
                expiresAt: new Date(
                    Date.now() + expiresIn * 1000
                ).toISOString(),
            });
        }

        // ====================================================================
        else {
            return res.status(405).json({ error: "Method not allowed" });
        }
    } catch (error) {
        console.error("Download API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Download failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

