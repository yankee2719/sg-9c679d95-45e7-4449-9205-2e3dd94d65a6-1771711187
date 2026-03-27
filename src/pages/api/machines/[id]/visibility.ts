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

        return res.status(200).json({
            machine: visibility.machine,
            visibility: {
                machineId,
                isOwner: visibility.isOwner,
                isAssignedCustomer: visibility.isAssignedCustomer,
                isAssignedManufacturer: visibility.isAssignedManufacturer,
                canView: visibility.canView,
                canEditOperationalData: visibility.canEditOperationalData,
                canManageManufacturerData: visibility.canManageManufacturerData,
                canArchive: visibility.canArchive,
            },
        });
    } catch (error) {
        console.error("Machine visibility API error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler, { allowPlatformAdmin: true });
