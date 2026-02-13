import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import {
    sendSuccess,
    sendError,
    sendValidationError,
    ApiError,
    handleSupabaseError
} from "@/lib/middleware/errorHandler";
import { validateChecklistExecution, validators } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;
    const { id } = req.query;

    // Validate ID
    if (!id || typeof id !== "string") {
        return sendError(res, ApiError.badRequest("Execution ID is required"));
    }

    const uuidError = validators.uuid(id, "id");
    if (uuidError) {
        return sendError(res, ApiError.badRequest(uuidError.message));
    }

    // GET - Get execution details
    if (req.method === "GET") {
        try {
            let query = supabase
                .from("checklist_executions")
                .select(`
          *,
          checklist:checklists(
            *,
            items:checklist_items(*)
          ),
          executor:profiles!checklist_executions_executed_by_fkey(id, full_name, email, avatar_url)
        `)
                .eq("id", id);

            if (user.tenant_id) {
                query = query.eq("tenant_id", user.tenant_id);
            }

            const { data, error } = await query.single();

            if (error) {
                if (error.code === "PGRST116") {
                    throw ApiError.notFound("Execution not found");
                }
                throw handleSupabaseError(error);
            }

            // Sort items
            if (data.checklist?.items) {
                data.checklist.items.sort((a: { order_index: number }, b: { order_index: number }) =>
                    (a.order_index || 0) - (b.order_index || 0)
                );
            }

            return sendSuccess(res, data);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // PUT/PATCH - Update execution (submit results, complete, etc.)
    if (req.method === "PUT" || req.method === "PATCH") {
        try {
            // Get existing execution
            let query = supabase
                .from("checklist_executions")
                .select("*")
                .eq("id", id);

            if (user.tenant_id) {
                query = query.eq("tenant_id", user.tenant_id);
            }

            const { data: existing, error: fetchError } = await query.single();

            if (fetchError || !existing) {
                throw ApiError.notFound("Execution not found");
            }

            // Only the executor or admin/supervisor can update
            if (existing.executed_by !== user.id && user.role === "technician") {
                throw ApiError.forbidden("You can only update your own executions");
            }

            // Can't update completed or cancelled executions (unless admin)
            if (["completed", "cancelled"].includes(existing.status) && user.role !== "admin") {
                throw ApiError.badRequest(`Cannot update a ${existing.status} execution`);
            }

            const validation = validateChecklistExecution(req.body, true);
            if (!validation.valid) {
                return sendValidationError(res, validation);
            }

            const {
                status,
                results,
                notes,
                signature
            } = req.body;

            // Build update object
            const updateData: Record<string, unknown> = {};

            if (results !== undefined) {
                // Merge with existing results
                updateData.results = {
                    ...(existing.results || {}),
                    ...results
                };
            }

            if (notes !== undefined) {
                updateData.notes = notes;
            }

            if (signature !== undefined) {
                updateData.signature = signature;
            }

            if (status !== undefined) {
                updateData.status = status;

                // Set completed_at when marking as completed
                if (status === "completed") {
                    updateData.completed_at = new Date().toISOString();
                }
            }

            const { data, error } = await supabase
                .from("checklist_executions")
                .update(updateData)
                .eq("id", id)
                .select(`
          *,
          checklist:checklists(*, items:checklist_items(*)),
          executor:profiles!checklist_executions_executed_by_fkey(id, full_name, email)
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

    // DELETE - Cancel execution
    if (req.method === "DELETE") {
        try {
            let query = supabase
                .from("checklist_executions")
                .select("*")
                .eq("id", id);

            if (user.tenant_id) {
                query = query.eq("tenant_id", user.tenant_id);
            }

            const { data: existing, error: fetchError } = await query.single();

            if (fetchError || !existing) {
                throw ApiError.notFound("Execution not found");
            }

            // Only admin or executor can cancel
            if (existing.executed_by !== user.id && user.role !== "admin") {
                throw ApiError.forbidden("You can only cancel your own executions");
            }

            // Can't cancel completed executions
            if (existing.status === "completed") {
                throw ApiError.badRequest("Cannot cancel a completed execution");
            }

            // Mark as cancelled instead of deleting
            const { error } = await supabase
                .from("checklist_executions")
                .update({
                    status: "cancelled",
                    completed_at: new Date().toISOString()
                })
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
