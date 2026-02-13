import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import {
    sendSuccess,
    sendError,
    sendValidationError,
    ApiError,
    handleSupabaseError
} from "@/lib/middleware/errorHandler";
import { validateMaintenanceSchedule, validators } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;
    const { id } = req.query;

    // Validate ID
    if (!id || typeof id !== "string") {
        return sendError(res, ApiError.badRequest("Schedule ID is required"));
    }

    const uuidError = validators.uuid(id, "id");
    if (uuidError) {
        return sendError(res, ApiError.badRequest(uuidError.message));
    }

    // Helper to check access
    async function getSchedule() {
        const { data, error } = await supabase
            .from("maintenance_schedules")
            .select(`
        *,
        equipment:equipment(id, name, equipment_code, location, category, tenant_id),
        assigned_user:profiles!maintenance_schedules_assigned_to_fkey(id, full_name, email),
        checklist:checklists(id, name, description)
      `)
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return null;
            }
            throw handleSupabaseError(error);
        }

        // Check tenant access
        if (user.tenant_id && data.equipment?.tenant_id !== user.tenant_id) {
            return null;
        }

        return data;
    }

    // GET - Get schedule details
    if (req.method === "GET") {
        try {
            const schedule = await getSchedule();

            if (!schedule) {
                throw ApiError.notFound("Maintenance schedule not found");
            }

            // Get maintenance logs for this schedule
            const { data: logs } = await supabase
                .from("maintenance_logs")
                .select(`
          *,
          performed_by_user:profiles!maintenance_logs_performed_by_fkey(id, full_name, email)
        `)
                .eq("schedule_id", id)
                .order("completed_at", { ascending: false })
                .limit(10);

            return sendSuccess(res, {
                ...schedule,
                recent_logs: logs || []
            });

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // PUT/PATCH - Update schedule (admin/supervisor only)
    if (req.method === "PUT" || req.method === "PATCH") {
        if (user.role === "technician") {
            return sendError(res, ApiError.forbidden("Only admins and supervisors can update schedules"));
        }

        try {
            const schedule = await getSchedule();

            if (!schedule) {
                throw ApiError.notFound("Maintenance schedule not found");
            }

            const validation = validateMaintenanceSchedule(req.body, true);
            if (!validation.valid) {
                return sendValidationError(res, validation);
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
                status
            } = req.body;

            const updateData: Record<string, unknown> = {
                updated_at: new Date().toISOString()
            };

            if (title !== undefined) updateData.title = title;
            if (description !== undefined) updateData.description = description;
            if (frequency !== undefined) updateData.frequency = frequency;
            if (next_due_date !== undefined) updateData.next_due_date = next_due_date;
            if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
            if (checklist_id !== undefined) updateData.checklist_id = checklist_id;
            if (priority !== undefined) updateData.priority = priority;
            if (estimated_duration_minutes !== undefined) updateData.estimated_duration_minutes = estimated_duration_minutes;
            if (notes !== undefined) updateData.notes = notes;
            if (status !== undefined) updateData.status = status;

            const { data, error } = await supabase
                .from("maintenance_schedules")
                .update(updateData)
                .eq("id", id)
                .select(`
          *,
          equipment:equipment(id, name, equipment_code, location),
          assigned_user:profiles!maintenance_schedules_assigned_to_fkey(id, full_name, email)
        `)
                .single();

            if (error) {
                throw handleSupabaseError(error);
            }

            return sendSuccess(res, data);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // DELETE - Delete schedule (admin only)
    if (req.method === "DELETE") {
        if (user.role !== "admin") {
            return sendError(res, ApiError.forbidden("Only admins can delete schedules"));
        }

        try {
            const schedule = await getSchedule();

            if (!schedule) {
                throw ApiError.notFound("Maintenance schedule not found");
            }

            const { error } = await supabase
                .from("maintenance_schedules")
                .delete()
                .eq("id", id);

            if (error) {
                throw handleSupabaseError(error);
            }

            return res.status(204).end();

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    return sendError(res, ApiError.methodNotAllowed(req.method || ""));
}

export default withAuth(handler);
