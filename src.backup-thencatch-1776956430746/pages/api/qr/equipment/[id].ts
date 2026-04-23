import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, type AppRole, getServiceSupabase } from "@/lib/apiAuth";
import {
    getMachineForQrAccess,
    revokeMachineQrToken,
    toLegacyQrToken,
} from "@/lib/server/machineQrService";

const ALLOWED_ROLES: AppRole[] = ["admin", "supervisor"];

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Equipment ID is required" });
    }

    try {
        const serviceSupabase = getServiceSupabase();
        const machine = await getMachineForQrAccess(
            serviceSupabase,
            id,
            req.user.organizationId,
            req.user.isPlatformAdmin
        );

        if (!machine) {
            return res.status(404).json({ error: "Machine not found" });
        }

        if (req.method === "GET") {
            const tokens = toLegacyQrToken(machine);

            return res.status(200).json({
                success: true,
                tokens,
                recent_scans: [],
                active_count: tokens.filter((token) => token.is_active).length,
                total_scans: 0,
            });
        }

        if (req.method === "DELETE") {
            const { token_id } = req.body || {};

            if (!token_id || typeof token_id !== "string") {
                return res.status(400).json({ error: "token_id is required in body" });
            }

            if (token_id !== machine.id) {
                return res.status(400).json({ error: "token_id does not belong to this machine" });
            }

            await revokeMachineQrToken(serviceSupabase, machine.id);

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
        return res.status(500).json({
            error: "Operation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALLOWED_ROLES, handler);
