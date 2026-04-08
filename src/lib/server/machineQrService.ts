import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    buildQrTokenResponse,
    canManageMachineQr,
    getMachineById,
} from "@/lib/server/machineQrService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const machineId = typeof req.query.id === "string" ? req.query.id : "";
    if (!machineId) {
        return res.status(400).json({ error: "Equipment ID is required" });
    }

    try {
        const supabase = getServiceSupabase();
        const machine = await getMachineById(supabase, machineId);

        if (!machine || machine.is_deleted || machine.is_archived) {
            return res.status(404).json({ error: "Machine not found" });
        }

        const allowed = await canManageMachineQr(supabase, req.user, machine);
        if (!allowed) {
            return res.status(403).json({ error: "Only the owner organization can manage machine QR tokens" });
        }

        if (req.method === "GET") {
            const tokens = buildQrTokenResponse(machine);
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

            if (token_id !== machine.id || !machine.qr_code_token) {
                return res.status(404).json({ error: "QR token not found" });
            }

            const { error } = await supabase
                .from("machines")
                .update({
                    qr_code_token: null,
                    qr_code_generated_at: null,
                    updated_at: new Date().toISOString(),
                } as any)
                .eq("id", machine.id);

            if (error) throw error;

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
            error: error instanceof Error ? error.message : "Operation failed",
        });
    }
}

export default withAuth(["admin", "supervisor"], handler);

