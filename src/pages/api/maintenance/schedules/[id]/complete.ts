import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import {
    sendSuccess,
    sendError,
    ApiError,
    handleSupabaseError
} from "@/lib/middleware/errorHandler";
import { validators } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;
    const { id } = req.query;

    // Only POST allowed
    if (req.method !== "POST") {
        return sendError(res, ApiError.methodNotAllowed(req.method || ""));
    }

    // Validate ID
    if (!id || typeof id !== "string") {
        return sendError(res, ApiError.badRequest("Schedule ID is required"));
    }

    const uuidError = validators.uuid(id, "id");
    if (uuidError) {
        return sendError(res, ApiError.badRequest(uuidError.message));
    }

    try {
        // Get the schedule
        const { data: schedule, error: fetchError } = await supabase
            .from("maintenance_schedules")
            .select(`
        *,
        equipment:equipment(id, name, tenant_id)
      `)
            .eq("id", id)
            .single();

        if (fetchError || !schedule) {
            throw ApiError.notFound("Maintenance schedule not found");
        }

        // Check tenant access
        if (user.tenant_id && schedule.equipment?.tenant_id !== user.tenant_id) {
            throw ApiError.notFound("Maintenance schedule not found");
        }

        const {
            notes,
            duration_minutes,
            checklist_execution_id,
            parts_used,
            cost
        } = req.body;

        // Create maintenance log entry
        const logData = {
            schedule_id: id,
            equipment_id: schedule.equipment_id,
            performed_by: user.id,
            completed_at: new Date().toISOString(),
            notes,
            duration_minutes,
            checklist_execution_id,
            parts_used,
            cost,
            status: "completed",
            created_at: new Date().toISOString()
        };

        const { data: log, error: logError } = await supabase
            .from("maintenance_logs")
            .insert(logData)
            .select()
            .single();

        if (logError) {
            throw handleSupabaseError(logError);
        }

        // Calculate next due date based on frequency
        const calculateNextDueDate = (frequency: string, fromDate: Date): Date => {
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
                    // Custom frequency - add 30 days as default
                    next.setDate(next.getDate() + 30);
            }

            return next;
        };

        const nextDueDate = calculateNextDueDate(schedule.frequency, new Date());

        // Update schedule with new due date
        const { data: updatedSchedule, error: updateError } = await supabase
            .from("maintenance_schedules")
            .update({
                next_due_date: nextDueDate.toISOString(),
                last_completed: new Date().toISOString(),
                status: "scheduled",
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select(`
        *,
        equipment:equipment(id, name, equipment_code, location)
      `)
            .single();

        if (updateError) {
            throw handleSupabaseError(updateError);
        }

        // Update equipment last_maintenance date
        await supabase
            .from("equipment")
            .update({
                last_maintenance: new Date().toISOString(),
                next_maintenance: nextDueDate.toISOString()
            })
            .eq("id", schedule.equipment_id);

        return sendSuccess(res, {
            schedule: updatedSchedule,
            log,
            next_due_date: nextDueDate.toISOString()
        });

    } catch (error) {
        return sendError(res, error as Error);
    }
}

export default withAuth(handler);