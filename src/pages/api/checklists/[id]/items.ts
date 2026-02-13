import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import {
    sendSuccess,
    sendError,
    sendValidationError,
    ApiError,
    handleSupabaseError
} from "@/lib/middleware/errorHandler";
import { validateChecklistItem, validators } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;
    const { id } = req.query; // checklist ID

    // Validate checklist ID
    if (!id || typeof id !== "string") {
        return sendError(res, ApiError.badRequest("Checklist ID is required"));
    }

    const uuidError = validators.uuid(id, "id");
    if (uuidError) {
        return sendError(res, ApiError.badRequest(uuidError.message));
    }

    // Verify checklist exists and user has access
    async function verifyChecklistAccess(): Promise<boolean> {
        let query = supabase
            .from("checklists")
            .select("id, tenant_id")
            .eq("id", id);

        if (user.tenant_id) {
            query = query.eq("tenant_id", user.tenant_id);
        }

        const { data, error } = await query.single();
        return !error && !!data;
    }

    // GET - List items for a checklist
    if (req.method === "GET") {
        try {
            if (!(await verifyChecklistAccess())) {
                throw ApiError.notFound("Checklist not found");
            }

            const { data, error } = await supabase
                .from("checklist_items")
                .select("*")
                .eq("checklist_id", id)
                .order("order_index", { ascending: true });

            if (error) {
                throw handleSupabaseError(error);
            }

            return sendSuccess(res, data || []);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // POST - Add item to checklist (admin/supervisor only)
    if (req.method === "POST") {
        if (user.role === "technician") {
            return sendError(res, ApiError.forbidden("Only admins and supervisors can add checklist items"));
        }

        try {
            if (!(await verifyChecklistAccess())) {
                throw ApiError.notFound("Checklist not found");
            }

            // Validate input
            const itemData = { ...req.body, checklist_id: id };
            const validation = validateChecklistItem(itemData);
            if (!validation.valid) {
                return sendValidationError(res, validation);
            }

            const {
                title,
                description,
                input_type = "checkbox",
                is_required = true,
                order_index,
                images
            } = req.body;

            // Get max order_index if not provided
            let finalOrderIndex = order_index;
            if (finalOrderIndex === undefined) {
                const { data: maxItem } = await supabase
                    .from("checklist_items")
                    .select("order_index")
                    .eq("checklist_id", id)
                    .order("order_index", { ascending: false })
                    .limit(1)
                    .single();

                finalOrderIndex = (maxItem?.order_index ?? -1) + 1;
            }

            const insertData = {
                checklist_id: id,
                title,
                description,
                input_type,
                is_required,
                order_index: finalOrderIndex,
                images,
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from("checklist_items")
                .insert(insertData)
                .select()
                .single();

            if (error) {
                throw handleSupabaseError(error);
            }

            // Update checklist updated_at
            await supabase
                .from("checklists")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", id);

            return sendSuccess(res, data, 201);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // PUT - Reorder items (bulk update order_index)
    if (req.method === "PUT") {
        if (user.role === "technician") {
            return sendError(res, ApiError.forbidden("Only admins and supervisors can reorder items"));
        }

        try {
            if (!(await verifyChecklistAccess())) {
                throw ApiError.notFound("Checklist not found");
            }

            const { items } = req.body;

            if (!Array.isArray(items)) {
                throw ApiError.badRequest("Items must be an array of {id, order_index}");
            }

            // Update each item's order
            for (const item of items) {
                if (!item.id || typeof item.order_index !== "number") {
                    continue;
                }

                await supabase
                    .from("checklist_items")
                    .update({ order_index: item.order_index })
                    .eq("id", item.id)
                    .eq("checklist_id", id);
            }

            // Get updated items
            const { data, error } = await supabase
                .from("checklist_items")
                .select("*")
                .eq("checklist_id", id)
                .order("order_index", { ascending: true });

            if (error) {
                throw handleSupabaseError(error);
            }

            return sendSuccess(res, data);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    return sendError(res, ApiError.methodNotAllowed(req.method || ""));
}

export default withAuth(handler);
