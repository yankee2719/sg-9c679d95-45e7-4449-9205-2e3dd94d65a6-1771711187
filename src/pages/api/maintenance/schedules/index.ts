import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import {
    sendSuccess,
    sendError,
    sendValidationError,
    sendPaginated,
    ApiError,
    handleSupabaseError
} from "@/lib/middleware/errorHandler";
import { validateMaintenanceSchedule } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;

    // GET - List maintenance schedules
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
                order = "asc"
            } = req.query;

            const pageNum = parseInt(page as string, 10);
            const limitNum = Math.min(parseInt(limit as string, 10), 100);
            const offset = (pageNum - 1) * limitNum;

            let query = supabase
                .from("maintenance_schedules")
                .select(`
          *,
          equipment:equipment(id, name, equipment_code, location, category),
          assigned_user:profiles!maintenance_schedules_assigned_to_fkey(id, full_name, email)
        `, { count: "exact" });

            // Tenant filter via equipment
            if (user.tenant_id) {
                query = query.eq("equipment.tenant_id", user.tenant_id);
            }

            if (equipment_id) {
                query = query.eq("equipment_id", equipment_id);
            }

            if (status) {
                query = query.eq("status", status);
            }

            if (frequency) {
                query = query.eq("frequency", frequency);
            }

            if (assigned_to) {
                query = query.eq("assigned_to", assigned_to);
            }

            // Filter for upcoming maintenance within X days
            if (upcoming_days) {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + parseInt(upcoming_days as string, 10));
                query = query
                    .lte("next_due_date", futureDate.toISOString())
                    .gte("next_due_date", new Date().toISOString());
            }

            // Filter for overdue maintenance
            if (overdue === "true") {
                query = query.lt("next_due_date", new Date().toISOString());
            }

            // Sorting
            const validSortFields = ["next_due_date", "created_at", "title", "frequency"];
            const sortField = validSortFields.includes(sort as string) ? sort as string : "next_due_date";
            const sortOrder = order === "asc" ? true : false;

            query = query.order(sortField, { ascending: sortOrder });
            query = query.range(offset, offset + limitNum - 1);

            const { data, error, count } = await query;

            if (error) {
                throw handleSupabaseError(error);
            }

            // Filter out items without valid equipment (tenant mismatch)
            const filteredData = data?.filter(item => item.equipment !== null) || [];

            return sendPaginated(res, filteredData, count || 0, pageNum, limitNum);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // POST - Create new maintenance schedule (admin/supervisor only)
    if (req.method === "POST") {
        if (user.role === "technician") {
            return sendError(res, ApiError.forbidden("Only admins and supervisors can create schedules"));
        }

        try {
            const validation = validateMaintenanceSchedule(req.body);
            if (!validation.valid) {
                return sendValidationError(res, validation);
            }

            const {
                equipment_id,
                title,
                description,
                frequency,
                next_due_date,
                assigned_to,
                checklist_id,
                priority,
                estimated_duration_minutes,
                notes
            } = req.body;

            // Verify equipment exists and belongs to tenant
            let equipmentQuery = supabase
                .from("equipment")
                .select("id, tenant_id")
                .eq("id", equipment_id);

            if (user.tenant_id) {
                equipmentQuery = equipmentQuery.eq("tenant_id", user.tenant_id);
            }

            const { data: equipment, error: eqError } = await equipmentQuery.single();

            if (eqError || !equipment) {
                throw ApiError.notFound("Equipment not found");
            }

            // Create schedule
            const scheduleData = {
                equipment_id,
                title,
                description,
                frequency: frequency || "monthly",
                next_due_date: next_due_date || new Date().toISOString(),
                assigned_to,
                checklist_id,
                priority: priority || "medium",
                estimated_duration_minutes,
                notes,
                status: "scheduled",
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from("maintenance_schedules")
                .insert(scheduleData)
                .select(`
          *,
          equipment:equipment(id, name, equipment_code, location),
          assigned_user:profiles!maintenance_schedules_assigned_to_fkey(id, full_name, email)
        `)
                .single();

            if (error) {
                throw handleSupabaseError(error);
            }

            return sendSuccess(res, data, 201);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    return sendError(res, ApiError.methodNotAllowed(req.method || ""));
}

export default withAuth(handler);
