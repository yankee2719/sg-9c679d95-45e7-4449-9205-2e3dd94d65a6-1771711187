import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, type AppRole, getServiceSupabase } from "@/lib/apiAuth";
import { generateMachineQrToken, getMachineForQrAccess } from "@/lib/server/machineQrService";

const ALLOWED_ROLES: AppRole[] = ["owner", "admin", "supervisor"];

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { equipment_id } = req.body || {};

        if (!equipment_id || typeof equipment_id !== "string") {
            return res.status(400).json({ error: "equipment_id is required" });
        }

        const serviceSupabase = getServiceSupabase();
        const machine = await getMachineForQrAccess(
            serviceSupabase,
            equipment_id,
            req.user.organizationId,
            req.user.isPlatformAdmin
        );

        if (!machine) {
            return res.status(404).json({ error: "Machine not found" });
        }

        const result = await generateMachineQrToken(serviceSupabase, machine.id);

        return res.status(201).json({
            success: true,
            message: "QR token generated. Save the token_cleartext now - it will not be shown again.",
            token_id: result.tokenId,
            token_cleartext: result.tokenCleartext,
            qr_url: result.qrUrl,
        });
    } catch (error) {
        console.error("QR Generate Error:", error);
        return res.status(500).json({
            error: "Failed to generate QR token",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALLOWED_ROLES, handler);
