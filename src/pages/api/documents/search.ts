// ============================================================================
// API: GET /api/documents/search
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";
import { getDocumentService } from "@/services/documentService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res
            .status(405)
            .json({ error: "Method not allowed", allowedMethods: ["GET"] });
    }

    try {
        const docService = getDocumentService();

        const query = req.query.q as string | undefined;
        const category = req.query.category as string | undefined;
        const equipmentId = req.query.equipmentId as string | undefined;
        const complianceTagsParam = req.query.complianceTags as
            | string
            | undefined;
        const limitParam = req.query.limit as string | undefined;

        const complianceTags = complianceTagsParam
            ? complianceTagsParam
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined;

        const limit = limitParam
            ? Math.min(Math.max(parseInt(limitParam), 1), 200)
            : 50;

        const results = await docService.searchDocuments({
            query,
            category: category as any,
            equipmentId,
            complianceTags,
            limit,
        });

        const stats = {
            total: results.length,
            byCategory: {} as Record<string, number>,
            byCompliance: {} as Record<string, number>,
        };

        results.forEach((doc: any) => {
            stats.byCategory[doc.category] =
                (stats.byCategory[doc.category] || 0) + 1;
            doc.compliance_tags?.forEach((tag: string) => {
                stats.byCompliance[tag] =
                    (stats.byCompliance[tag] || 0) + 1;
            });
        });

        return res.status(200).json({
            success: true,
            documents: results,
            stats,
            filters: {
                query: query || null,
                category: category || null,
                equipmentId: equipmentId || null,
                complianceTags: complianceTags || null,
                limit,
            },
        });
    } catch (error) {
        console.error("Search API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Search failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

