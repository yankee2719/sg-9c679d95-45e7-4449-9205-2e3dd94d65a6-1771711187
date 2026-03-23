// ============================================================================
// API: GET/PUT/PATCH/DELETE /api/maintenance/schedules/[id]
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Schedule ID is required" });
    }

    // Helper to get schedule with org check
    async function getSchedule() {
        const { data, error } = await serviceSupabase
            .from("maintenance_schedules")
            .select(
                `*,
                equipment:equipment(id, name, equipment_code, location, category, organization_id),
                assigned_user:profiles!maintenance_schedules_assigned_to_fkey(id, full_name, email),
                checklist:checklists(id, name, description)`
            )
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null;
            throw error;
        }

        // Check organization access
        if (
            req.user.organizationId &&
            data.equipment?.organization_id !== req.user.organizationId
        ) {
            return null;
        }

        return data;
    }

    // ========================================================================
    // GET - Get schedule details
    // ========================================================================
    if (req.method === "GET") {
        try {
            const schedule = await getSchedule();
            if (!schedule) {
                return res
                    .status(404)
                    .json({ error: "Maintenance schedule not found" });
            }

            const { data: logs } = await serviceSupabase
                .from("maintenance_logs")
                .select(
                    `*,
                    performed_by_user:profiles!maintenance_logs_performed_by_fkey(id, full_name, email)`
                )
                .eq("schedule_id", id as string)
                .order("completed_at", { ascending: false })
                .limit(10);

            return res.status(200).json({
                success: true,
                data: { ...schedule, recent_logs: logs || [] },
            });
        } catch (error) {
            console.error("Maintenance schedule get error:", error);
            return res.status(500).json({
                error: "Failed to get maintenance schedule",
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }

    // ========================================================================
    // PUT/PATCH - Update schedule (admin/supervisor only)
    // ========================================================================
    if (req.method === "PUT" || req.method === "PATCH") {
        if (req.user.role === "technician" || req.user.role === "viewer") {
            return res.status(403).json({
                error: "Only admins and supervisors can update schedules",
            });
        }

        try {
            const schedule = await getSchedule();
            if (!schedule) {
                return res
                    .status(404)
                    .json({ error: "Maintenance schedule not found" });
            }

            const {
                title,
                description,
                frequency,
                next_due_date,
                assigned_to,
                checklist_id,
                priority,
                estimated_duration_minutes,
                notes,
                status,
            } = req.body;

            const updateData: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (title !== undefined) updateData.title = title;
            if (description !== undefined)
                updateData.description = description;
            if (frequency !== undefined) updateData.frequency = frequency;
            if (next_due_date !== undefined)
                updateData.next_due_date = next_due_date;
            if (assigned_to !== undefined)
                updateData.assigned_to = assigned_to;
            if (checklist_id !== undefined)
                updateData.checklist_id = checklist_id;
            if (priority !== undefined) updateData.priority = priority;
            if (estimated_duration_minutes !== undefined)
                updateData.estimated_duration_minutes =
                    estimated_duration_minutes;
            if (notes !== undefined) updateData.notes = notes;
            if (status !== undefined) updateData.status = status;

            const { data, error } = await serviceSupabase
                .from("maintenance_schedules")
                .update(updateData)
                .eq("id", id as string)
                .select(
                    `*,
                    equipment:equipment(id, name, equipment_code, location),
                    assigned_user:profiles!maintenance_schedules_assigned_to_fkey(id, full_name, email)`
                )
                .single();

            if (error) {
                throw error;
            }

            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("Maintenance schedule update error:", error);
            return res.status(500).json({
                error: "Failed to update maintenance schedule",
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }

    // ========================================================================
    // DELETE - Delete schedule (admin only)
    // ========================================================================
    if (req.method === "DELETE") {
        if (!["owner", "admin"].includes(req.user.role)) {
            return res.status(403).json({
                error: "Only admins can delete schedules",
            });
        }

        try {
            const schedule = await getSchedule();
            if (!schedule) {
                return res
                    .status(404)
                    .json({ error: "Maintenance schedule not found" });
            }

            const { error } = await serviceSupabase
                .from("maintenance_schedules")
                .delete()
                .eq("id", id as string);

            if (error) {
                throw error;
            }

            return res.status(204).end();
        } catch (error) {
            console.error("Maintenance schedule delete error:", error);
            return res.status(500).json({
                error: "Failed to delete maintenance schedule",
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(ALL_APP_ROLES, handler);

