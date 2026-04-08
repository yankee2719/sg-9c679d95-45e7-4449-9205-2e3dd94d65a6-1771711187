import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    deactivateLegacySchedule,
    getLegacyScheduleById,
    updateLegacySchedule,
} from "@/lib/server/maintenanceScheduleCompat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Schedule ID is required" });
    }

    if (req.method === "GET") {
        try {
            const schedule = await getLegacyScheduleById(
                serviceSupabase,
                id,
                req.user.organizationId,
                req.user.isPlatformAdmin
            );

            if (!schedule) {
                return res.status(404).json({ error: "Maintenance schedule not found" });
            }

            return res.status(200).json({
                success: true,
                data: schedule,
            });
        } catch (error) {
            console.error("Maintenance schedule get error:", error);
            return res.status(500).json({
                error: "Failed to get maintenance schedule",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    if (req.method === "PUT" || req.method === "PATCH") {
        if (req.user.role === "technician" || req.user.role === "viewer") {
            return res.status(403).json({
                error: "Only admins and supervisors can update schedules",
            });
        }

        try {
            const data = await updateLegacySchedule(
                serviceSupabase,
                id,
                req.user.organizationId,
                req.user.isPlatformAdmin,
                req.body || {}
            );

            if (!data) {
                return res.status(404).json({ error: "Maintenance schedule not found" });
            }

            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("Maintenance schedule update error:", error);
            return res.status(500).json({
                error: "Failed to update maintenance schedule",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    if (req.method === "DELETE") {
        if (!["owner", "admin"].includes(req.user.role)) {
            return res.status(403).json({
                error: "Only admins can delete schedules",
            });
        }

        try {
            const ok = await deactivateLegacySchedule(
                serviceSupabase,
                id,
                req.user.organizationId,
                req.user.isPlatformAdmin
            );

            if (!ok) {
                return res.status(404).json({ error: "Maintenance schedule not found" });
            }

            return res.status(204).end();
        } catch (error) {
            console.error("Maintenance schedule delete error:", error);
            return res.status(500).json({
                error: "Failed to delete maintenance schedule",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(ALL_APP_ROLES, handler);
