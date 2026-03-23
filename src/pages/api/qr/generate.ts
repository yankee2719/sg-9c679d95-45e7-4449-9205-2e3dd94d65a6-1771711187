// ============================================================================
// API: POST /api/qr/generate
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    type AppRole,
} from "@/lib/apiAuth";
import {
    getQrTokenService,
    QrTokenType,
} from "@/services/offlineAndQrService";

const ALLOWED_ROLES: AppRole[] = ["owner", "admin", "supervisor"];

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const {
            equipment_id,
            token_type = "permanent",
            expires_at,
            allowed_views,
            max_scans,
            allowed_roles,
            label,
        } = req.body;

        if (!equipment_id) {
            return res
                .status(400)
                .json({ error: "equipment_id is required" });
        }

        const validTypes: QrTokenType[] = [
            "permanent",
            "temporary",
            "inspector",
            "maintenance",
        ];
        if (!validTypes.includes(token_type)) {
            return res.status(400).json({
                error: `token_type must be one of: ${validTypes.join(", ")}`,
            });
        }

        const qrService = getQrTokenService();
        const result = await qrService.generateToken(
            equipment_id,
            token_type,
            req.user.userId,
            {
                expiresAt: expires_at,
                allowedViews: allowed_views,
                maxScans: max_scans,
                allowedRoles: allowed_roles,
                label,
            }
        );

        return res.status(201).json({
            success: true,
            message:
                "QR token generated. Save the token_cleartext now - it will not be shown again.",
            token_id: result.tokenId,
            token_cleartext: result.tokenCleartext,
            qr_url: result.qrUrl,
        });
    } catch (error) {
        console.error("QR Generate Error:", error);
        return res
            .status(500)
            .json({ error: "Failed to generate QR token" });
    }
}

export default withAuth(ALLOWED_ROLES, handler);

