// ============================================================================
// API: GET/POST /api/compliance/inspector-access
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { getComplianceService } from "@/services/complianceService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const complianceService = getComplianceService();

    try {
        // ====================================================================
        // GET: List inspector access grants
        // ====================================================================
        if (req.method === "GET") {
            if (!req.user.organizationId) {
                return res
                    .status(400)
                    .json({ error: "User organization not found" });
            }

            const grants = await complianceService.listInspectorAccess(
                req.user.organizationId
            );

            return res.status(200).json({
                success: true,
                grants,
                total: grants.length,
                active: grants.filter((g: any) => g.is_active).length,
                expired: grants.filter((g: any) => !g.is_active).length,
            });
        }

        // ====================================================================
        // POST: Grant inspector access (admin/supervisor only)
        // ====================================================================
        else if (req.method === "POST") {
            if (!["owner", "admin", "supervisor"].includes(req.user.role)) {
                return res.status(403).json({
                    error: "Only admins and supervisors can grant inspector access",
                });
            }

            const body = req.body;

            if (!body.inspector_email || !body.expires_at) {
                return res.status(400).json({
                    error: "inspector_email and expires_at are required",
                });
            }

            if (!req.user.organizationId) {
                return res
                    .status(400)
                    .json({ error: "User organization not found" });
            }

            const grant = await complianceService.grantInspectorAccess({
                inspector_email: body.inspector_email,
                inspector_name: body.inspector_name,
                inspector_organization: body.inspector_organization,
                organization_id: req.user.organizationId,
                plant_id: body.plant_id,
                equipment_ids: body.equipment_ids,
                access_type: body.access_type || "read_only",
                expires_at: body.expires_at,
                granted_by: req.user.userId,
                purpose: body.purpose,
                can_export: body.can_export,
                can_download_documents: body.can_download_documents,
            });

            return res.status(201).json({
                success: true,
                message: "Inspector access granted",
                grant,
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
        console.error("Inspector Access API Error:", error);
        return res.status(500).json({
            success: false,
            error: "Operation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

