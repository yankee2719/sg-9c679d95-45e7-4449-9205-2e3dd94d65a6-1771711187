import type { NextApiResponse } from "next";
import {
    ALL_APP_ROLES,
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { getMachineVisibilityForUser } from "@/lib/server/machineVisibilityService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const machineId = typeof req.query.id === "string" ? req.query.id : "";
    if (!machineId) {
        return res.status(400).json({ error: "Missing machine id" });
    }

    try {
        const visibility = await getMachineVisibilityForUser(
            getServiceSupabase(),
            req.user,
            machineId
        );

        if (!visibility?.machine) {
            return res.status(404).json({ error: "Machine not found" });
        }

        if (!visibility.canView) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (req.user.organizationType !== "customer") {
            return res.status(200).json({
                access: {
                    canView: false,
                    canCreate: false,
                    canEdit: false,
                    canAssign: false,
                    canExecute: false,
                    canClose: false,
                    reason: "I work order operativi sono gestiti solo dall'organizzazione proprietaria cliente.",
                },
            });
        }

        if (!visibility.isOwner) {
            return res.status(200).json({
                access: {
                    canView: false,
                    canCreate: false,
                    canEdit: false,
                    canAssign: false,
                    canExecute: false,
                    canClose: false,
                    reason: "Puoi operare solo sulle macchine possedute dalla tua organizzazione.",
                },
            });
        }

        const isManager = ["owner", "admin", "supervisor"].includes(req.user.role);
        const canExecute = isManager || req.user.role === "technician";

        return res.status(200).json({
            access: {
                canView: true,
                canCreate: isManager,
                canEdit: isManager,
                canAssign: isManager,
                canExecute,
                canClose: isManager,
                reason: null,
            },
        });
    } catch (error) {
        console.error("Machine work-order access API error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler, { allowPlatformAdmin: true });
