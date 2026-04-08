import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    canViewMachineViaQr,
    DEFAULT_QR_ALLOWED_VIEWS,
    getMachineByQrToken,
} from "@/lib/server/machineQrService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { token } = req.body || {};
    if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "token is required" });
    }

    try {
        const supabase = getServiceSupabase();
        const machine = await getMachineByQrToken(supabase, token.trim());

        if (!machine || machine.is_deleted || machine.is_archived) {
            return res.status(403).json({
                success: false,
                denial_reason: "access_denied",
            });
        }

        const allowed = await canViewMachineViaQr(supabase, req.user, machine);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                denial_reason: "access_denied",
            });
        }

        return res.status(200).json({
            success: true,
            equipment_id: machine.id,
            allowed_views: [...DEFAULT_QR_ALLOWED_VIEWS],
            max_permission_level: req.user.role,
        });
    } catch (error) {
        console.error("QR Validate Error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to validate QR token",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

