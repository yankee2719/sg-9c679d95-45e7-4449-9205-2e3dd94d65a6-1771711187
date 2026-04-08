import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { completeLegacySchedule } from "@/lib/server/maintenanceScheduleCompat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const serviceSupabase = getServiceSupabase();
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Schedule ID is required" });
    }

    try {
        const data = await completeLegacySchedule(
            serviceSupabase,
            id,
            req.user.organizationId,
            req.user.isPlatformAdmin,
            req.user.userId,
            req.body || {}
        );

        if (!data) {
            return res.status(404).json({ error: "Maintenance schedule not found" });
        }

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Maintenance complete error:", error);
        return res.status(500).json({
            error: "Failed to complete maintenance",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
