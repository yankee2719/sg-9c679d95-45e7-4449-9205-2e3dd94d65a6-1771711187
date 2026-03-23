// ============================================================================
// API: POST /api/maintenance/schedules/[id]/complete
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

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
        // Get the schedule
        const { data: schedule, error: fetchError } = await serviceSupabase
            .from("maintenance_schedules")
            .select(
                `*,
                equipment:equipment(id, name, organization_id)`
            )
            .eq("id", id)
            .single();

        if (fetchError || !schedule) {
            return res
                .status(404)
                .json({ error: "Maintenance schedule not found" });
        }

        // Check organization access
        if (
            req.user.organizationId &&
            schedule.equipment?.organization_id !== req.user.organizationId
        ) {
            return res
                .status(404)
                .json({ error: "Maintenance schedule not found" });
        }

        const {
            notes,
            duration_minutes,
            checklist_execution_id,
            parts_used,
            cost,
        } = req.body;

        // Create maintenance log entry
        const logData = {
            schedule_id: id,
            equipment_id: schedule.equipment_id,
            performed_by: req.user.userId,
            completed_at: new Date().toISOString(),
            notes: notes || null,
            duration_minutes: duration_minutes || null,
            checklist_execution_id: checklist_execution_id || null,
            parts_used: parts_used || null,
            cost: cost || null,
            status: "completed",
            created_at: new Date().toISOString(),
        };

        const { data: log, error: logError } = await serviceSupabase
            .from("maintenance_logs")
            .insert(logData)
            .select()
            .single();

        if (logError) {
            throw logError;
        }

        // Calculate next due date based on frequency
        const calculateNextDueDate = (
            frequency: string,
            fromDate: Date
        ): Date => {
            const next = new Date(fromDate);

            switch (frequency) {
                case "daily":
                    next.setDate(next.getDate() + 1);
                    break;
                case "weekly":
                    next.setDate(next.getDate() + 7);
                    break;
                case "biweekly":
                    next.setDate(next.getDate() + 14);
                    break;
                case "monthly":
                    next.setMonth(next.getMonth() + 1);
                    break;
                case "quarterly":
                    next.setMonth(next.getMonth() + 3);
                    break;
                case "yearly":
                    next.setFullYear(next.getFullYear() + 1);
                    break;
                default:
                    next.setDate(next.getDate() + 30);
            }

            return next;
        };

        const nextDueDate = calculateNextDueDate(
            schedule.frequency,
            new Date()
        );

        // Update schedule with new due date
        const { data: updatedSchedule, error: updateError } =
            await serviceSupabase
                .from("maintenance_schedules")
                .update({
                    next_due_date: nextDueDate.toISOString(),
                    last_completed: new Date().toISOString(),
                    status: "scheduled",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select(
                    `*,
                    equipment:equipment(id, name, equipment_code, location)`
                )
                .single();

        if (updateError) {
            throw updateError;
        }

        // Update equipment last_maintenance date
        await serviceSupabase
            .from("equipment")
            .update({
                last_maintenance: new Date().toISOString(),
                next_maintenance: nextDueDate.toISOString(),
            })
            .eq("id", schedule.equipment_id);

        return res.status(200).json({
            success: true,
            data: {
                schedule: updatedSchedule,
                log,
                next_due_date: nextDueDate.toISOString(),
            },
        });
    } catch (error) {
        console.error("Maintenance complete error:", error);
        return res.status(500).json({
            error: "Failed to complete maintenance",
            message:
                error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

