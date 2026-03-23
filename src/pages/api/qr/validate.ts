// ============================================================================
// API: POST /api/qr/validate
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
} from "@/lib/apiAuth";
import { getQrTokenService } from "@/services/offlineAndQrService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { token } = req.body || {};
    if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "token is required" });
    }

    try {
        const qrService = getQrTokenService();
        const result = await qrService.validateToken(
            token,
            req.user.userId,
            req.user.role
        );

        if (!result?.is_valid || !result.equipment_id) {
            return res.status(403).json({
                success: false,
                denial_reason: result?.denial_reason || "access_denied",
            });
        }

        return res.status(200).json({
            success: true,
            equipment_id: result.equipment_id,
            allowed_views: result.allowed_views || [],
            max_permission_level: result.max_permission_level || null,
        });
    } catch (error) {
        console.error("QR Validate Error:", error);
        return res
            .status(500)
            .json({ error: "Failed to validate QR token" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

