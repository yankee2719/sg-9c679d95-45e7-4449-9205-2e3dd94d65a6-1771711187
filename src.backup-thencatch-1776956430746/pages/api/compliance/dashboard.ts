// ============================================================================
// API: GET /api/compliance/dashboard
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";
import { getComplianceService } from "@/services/complianceService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        if (!req.user.organizationId) {
            return res
                .status(400)
                .json({ error: "User organization not found" });
        }

        const complianceService = getComplianceService();

        const { plant_id, status, min_score, max_score } = req.query;

        const statusFilter = status
            ? ((Array.isArray(status) ? status : [status]) as any[])
            : undefined;

        const minScore = min_score
            ? parseInt(min_score as string)
            : undefined;
        const maxScore = max_score
            ? parseInt(max_score as string)
            : undefined;

        const dashboard = await complianceService.getComplianceDashboard(
            req.user.organizationId,
            {
                plantId: plant_id as string,
                status: statusFilter,
                minScore,
                maxScore,
            }
        );

        const stats = {
            total: dashboard.length,
            compliant: dashboard.filter(
                (d: any) => d.overall_status === "compliant"
            ).length,
            partial: dashboard.filter(
                (d: any) => d.overall_status === "partial"
            ).length,
            non_compliant: dashboard.filter(
                (d: any) => d.overall_status === "non_compliant"
            ).length,
            expired: dashboard.filter(
                (d: any) => d.overall_status === "expired"
            ).length,
            averageScore:
                dashboard.length > 0
                    ? Math.round(
                        dashboard.reduce(
                            (sum: number, d: any) =>
                                sum + d.compliance_score,
                            0
                        ) / dashboard.length
                    )
                    : 0,
            criticalRisk: dashboard.filter(
                (d: any) => d.risk_level === "critical"
            ).length,
            highRisk: dashboard.filter(
                (d: any) => d.risk_level === "high"
            ).length,
        };

        return res.status(200).json({ success: true, dashboard, stats });
    } catch (error) {
        console.error("Compliance Dashboard API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to load dashboard",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

