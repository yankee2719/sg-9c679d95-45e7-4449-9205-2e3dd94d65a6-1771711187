import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { hasMinimumRole } from "@/lib/roles";
import {
    createLegacySchedule,
    listLegacySchedules,
} from "@/lib/server/maintenanceScheduleCompat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();

    if (req.method === "GET") {
        try {
            const {
                page = "1",
                limit = "20",
                equipment_id,
                status,
                frequency,
                assigned_to,
                upcoming_days,
                overdue,
                sort = "next_due_date",
                order = "asc",
            } = req.query;

            const result = await listLegacySchedules(serviceSupabase, req.user.organizationId, {
                page: Number(page) || 1,
                limit: Number(limit) || 20,
                equipment_id: typeof equipment_id === "string" ? equipment_id : null,
                status: typeof status === "string" ? status : null,
                frequency: typeof frequency === "string" ? frequency : null,
                assigned_to: typeof assigned_to === "string" ? assigned_to : null,
                upcoming_days: typeof upcoming_days === "string" ? Number(upcoming_days) : null,
                overdue: overdue === "true",
                sort: typeof sort === "string" ? sort : undefined,
                order: order === "desc" ? "desc" : "asc",
            });

            return res.status(200).json({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        } catch (error) {
            console.error("Maintenance schedules list error:", error);
            return res.status(500).json({
                error: "Failed to list maintenance schedules",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    if (req.method === "POST") {
        if (!hasMinimumRole(req.user.role, "supervisor")) {
            return res.status(403).json({
                error: "Only admins and supervisors can create schedules",
            });
        }

        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        try {
            const data = await createLegacySchedule(
                serviceSupabase,
                req.user.organizationId,
                req.user.userId,
                req.body || {}
            );

            return res.status(201).json({ success: true, data });
        } catch (error) {
            console.error("Maintenance schedule create error:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            const statusCode = message === "Machine not found" ? 404 : 500;

            return res.status(statusCode).json({
                error: "Failed to create maintenance schedule",
                message,
            });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(ALL_APP_ROLES, handler);
