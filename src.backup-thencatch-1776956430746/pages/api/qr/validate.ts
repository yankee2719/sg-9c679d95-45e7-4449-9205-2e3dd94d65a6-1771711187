import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    buildQrValidationPayload,
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
        const serviceSupabase = getServiceSupabase();
        const machine = await getMachineByQrToken(serviceSupabase, token);

        if (!machine) {
            return res.status(403).json({
                success: false,
                denial_reason: "not_found",
            });
        }

        let allowed = false;

        if (req.user.isPlatformAdmin) {
            allowed = true;
        } else if (req.user.organizationId && machine.organization_id === req.user.organizationId) {
            allowed = true;
        } else if (req.user.organizationId) {
            const { data: assignment, error: assignmentError } = await serviceSupabase
                .from("machine_assignments")
                .select("id")
                .eq("machine_id", machine.id)
                .eq("customer_org_id", req.user.organizationId)
                .eq("is_active", true)
                .limit(1)
                .maybeSingle();

            if (assignmentError) {
                throw assignmentError;
            }

            allowed = !!assignment;
        }

        if (!allowed) {
            return res.status(403).json({
                success: false,
                denial_reason: "access_denied",
            });
        }

        return res.status(200).json({
            success: true,
            ...buildQrValidationPayload(machine.id, req.user.role),
        });
    } catch (error) {
        console.error("QR Validate Error:", error);
        return res.status(500).json({
            error: "Failed to validate QR token",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
