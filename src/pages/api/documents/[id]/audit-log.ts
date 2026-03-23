// ============================================================================
// API: GET /api/documents/[id]/audit-log
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

    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Document ID is required" });
    }

    try {
        const docService = getDocumentService();

        const hasPermission = await docService.checkUserPermission(
            req.user.userId,
            id,
            "view"
        );

        if (!hasPermission) {
            return res.status(403).json({
                error: "Access denied - View permission required",
            });
        }

        const limit = req.query.limit
            ? parseInt(req.query.limit as string)
            : 100;

        const action = req.query.action as string | undefined;

        if (limit < 1 || limit > 1000) {
            return res
                .status(400)
                .json({ error: "Limit must be between 1 and 1000" });
        }

        const auditLog = await docService.getAuditLog(id, limit);

        const filteredLog = action
            ? auditLog.filter((entry: any) => entry.action === action)
            : auditLog;

        const stats = {
            total: filteredLog.length,
            byAction: {} as Record<string, number>,
            successRate: 0,
            failedCount: 0,
        };

        filteredLog.forEach((entry: any) => {
            stats.byAction[entry.action] =
                (stats.byAction[entry.action] || 0) + 1;
            if (!entry.success) {
                stats.failedCount++;
            }
        });

        stats.successRate =
            stats.total > 0
                ? ((stats.total - stats.failedCount) / stats.total) * 100
                : 100;

        return res.status(200).json({
            success: true,
            auditLog: filteredLog,
            stats,
            limit,
            hasMore: auditLog.length === limit,
        });
    } catch (error) {
        console.error("Audit Log API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to retrieve audit log",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

