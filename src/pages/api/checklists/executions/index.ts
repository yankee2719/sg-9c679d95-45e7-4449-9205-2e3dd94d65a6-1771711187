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
import { validateChecklistExecution } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;

    // GET - List executions with filters
    if (req.method === "GET") {
        try {
            const {
                page = "1",
                limit = "20",
                checklist_id,
                equipment_id,
                executed_by,
                status,
                from_date,
                to_date,
                sort = "created_at",
                order = "desc"
            } = req.query;

            const pageNum = parseInt(page as string, 10);
            const limitNum = Math.min(parseInt(limit as string, 10), 100);
            const offset = (pageNum - 1) * limitNum;

            let query = supabase
                .from("checklist_executions")
                .select(`
          *,
          checklist:checklists(id, name, description),
          executor:profiles!checklist_executions_executed_by_fkey(id, full_name, email)
        `, { count: "exact" });

            // Apply tenant filter
            if (user.tenant_id) {
                query = query.eq("tenant_id", user.tenant_id);
            }

            // Apply filters
            if (checklist_id) {
                query = query.eq("checklist_id", checklist_id);
            }

            if (equipment_id) {
                query = query.eq("schedule_id", equipment_id); // Via schedule
            }

            if (executed_by) {
                query = query.eq("executed_by", executed_by);
            }

            if (status) {
                query = query.eq("status", status);
            }

            if (from_date) {
                query = query.gte("created_at", from_date);
            }

            if (to_date) {
                query = query.lte("created_at", to_date);
            }

            // Apply sorting
            const validSortFields = ["created_at", "completed_at", "started_at", "status"];
            const sortField = validSortFields.includes(sort as string) ? sort as string : "created_at";
            const sortOrder = order === "asc" ? true : false;

            query = query.order(sortField, { ascending: sortOrder });
            query = query.range(offset, offset + limitNum - 1);

            const { data, error, count } = await query;

            if (error) {
                throw handleSupabaseError(error);
            }

            return sendPaginated(res, data || [], count || 0, pageNum, limitNum);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // POST - Start a new execution
    if (req.method === "POST") {
        try {
            const validation = validateChecklistExecution(req.body);
            if (!validation.valid) {
                return sendValidationError(res, validation);
            }

            const {
                checklist_id,
                equipment_id,
                schedule_id,
                maintenance_log_id,
                notes
            } = req.body;

            // Verify checklist exists and user has access
            let checklistQuery = supabase
                .from("checklists")
                .select("id, tenant_id, is_active, name")
                .eq("id", checklist_id);

            if (user.tenant_id) {
                checklistQuery = checklistQuery.eq("tenant_id", user.tenant_id);
            }

            const { data: checklist, error: checklistError } = await checklistQuery.single();

            if (checklistError || !checklist) {
                throw ApiError.notFound("Checklist not found");
            }

            if (!checklist.is_active) {
                throw ApiError.badRequest("Cannot execute an inactive checklist");
            }

            // Create execution
            const executionData = {
                checklist_id,
                executed_by: user.id,
                status: "in_progress",
                started_at: new Date().toISOString(),
                tenant_id: user.tenant_id,
                schedule_id,
                maintenance_log_id,
                notes,
                results: {},
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from("checklist_executions")
                .insert(executionData)
                .select(`
          *,
          checklist:checklists(
            *,
            items:checklist_items(*)
          )
        `)
                .single();

            if (error) {
                throw handleSupabaseError(error);
            }

            // Sort items
            if (data.checklist?.items) {
                data.checklist.items.sort((a: { order_index: number }, b: { order_index: number }) =>
                    (a.order_index || 0) - (b.order_index || 0)
                );
            }

            return sendSuccess(res, data, 201);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    return sendError(res, ApiError.methodNotAllowed(req.method || ""));
}

export default withAuth(handler);
