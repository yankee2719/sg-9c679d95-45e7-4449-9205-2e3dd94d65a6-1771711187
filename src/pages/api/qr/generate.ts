import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    canManageMachineQr,
    createMachineQrToken,
    getBaseAppUrl,
    getMachineById,
} from "@/lib/server/machineQrService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { equipment_id, machine_id } = req.body || {};
    const machineId =
        typeof equipment_id === "string" && equipment_id.trim().length > 0
            ? equipment_id.trim()
            : typeof machine_id === "string" && machine_id.trim().length > 0
                ? machine_id.trim()
                : "";

    if (!machineId) {
        return res.status(400).json({ error: "equipment_id is required" });
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

        const tokenCleartext = createMachineQrToken();
        const generatedAt = new Date().toISOString();

        const { error } = await supabase
            .from("machines")
            .update({
                qr_code_token: tokenCleartext,
                qr_code_generated_at: generatedAt,
                updated_at: generatedAt,
            } as any)
            .eq("id", machine.id);

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message:
                "QR token generated. Save the token_cleartext now - it will not be shown again.",
            token_id: machine.id,
            token_cleartext: tokenCleartext,
            qr_url: `${getBaseAppUrl()}/scan/${encodeURIComponent(tokenCleartext)}`,
        });
    } catch (error) {
        console.error("QR Generate Error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to generate QR token",
        });
    }
}

export default withAuth(["admin", "supervisor"], handler);

