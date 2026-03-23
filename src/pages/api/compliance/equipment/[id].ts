// ============================================================================
// API: GET/POST /api/compliance/equipment/[id]
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";
import { getComplianceService } from "@/services/complianceService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Equipment ID is required" });
    }

    const complianceService = getComplianceService();

    try {
        // ====================================================================
        // GET: Get compliance status or full report
        // ====================================================================
        if (req.method === "GET") {
            const { full_report } = req.query;

            if (full_report === "true") {
                const report =
                    await complianceService.getComplianceReport(id);
                return res.status(200).json({ success: true, report });
            } else {
                const status =
                    await complianceService.getEquipmentComplianceStatus(id);
                if (!status) {
                    return res
                        .status(404)
                        .json({ error: "Compliance status not found" });
                }
                return res.status(200).json({ success: true, status });
            }
        }

        // ====================================================================
        // POST: Recalculate compliance
        // ====================================================================
        else if (req.method === "POST") {
            await complianceService.recalculateCompliance(id);
            const status =
                await complianceService.getEquipmentComplianceStatus(id);

            return res.status(200).json({
                success: true,
                message: "Compliance recalculated successfully",
                status,
            });
        }

        // ====================================================================
        else {
            return res.status(405).json({
                error: "Method not allowed",
                allowedMethods: ["GET", "POST"],
            });
        }
    } catch (error) {
        console.error("Equipment Compliance API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Operation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

