import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, type AppRole } from "@/lib/apiAuth";
import { getQrTokenService } from "@/services/offlineAndQrService";

const ALLOWED_ROLES: AppRole[] = ["owner", "admin", "supervisor"];

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Equipment ID is required" });
    }

    const qrService = getQrTokenService();

    try {
        if (req.method === "GET") {
            const tokens = await qrService.getEquipmentTokens(id);
            const history = await qrService.getScanHistory(id, 20);

            return res.status(200).json({
                success: true,
                tokens,
                recent_scans: history,
                active_count: tokens.filter((token: any) => token.is_active).length,
                total_scans: tokens.reduce((sum: number, token: any) => sum + Number(token.scan_count || 0), 0),
            });
        }

        if (req.method === "DELETE") {
            const { token_id, reason } = req.body || {};
            if (!token_id || typeof token_id !== "string") {
                return res.status(400).json({ error: "token_id is required in body" });
            }

            await qrService.revokeToken(token_id, req.user.userId, reason);

            return res.status(200).json({
                success: true,
                message: "QR token revoked successfully",
            });
        }

        return res.status(405).json({
            error: "Method not allowed",
            allowedMethods: ["GET", "DELETE"],
        });
    } catch (error) {
        console.error("QR Equipment API Error:", error);
        return res.status(500).json({ error: "Operation failed" });
    }
}

export default withAuth(ALLOWED_ROLES, handler);
