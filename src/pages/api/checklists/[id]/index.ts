import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import {
    sendSuccess,
    sendError,
    sendValidationError,
    ApiError,
    handleSupabaseError
} from "@/lib/middleware/errorHandler";
import { validateChecklist, validators } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;
    const { id } = req.query;

    // Validate ID
    if (!id || typeof id !== "string") {
        return sendError(res, ApiError.badRequest("Checklist ID is required"));
    }

    const uuidError = validators.uuid(id, "id");
    if (uuidError) {
        return sendError(res, ApiError.badRequest(uuidError.message));
    }

    // GET - Get single checklist with items
    if (req.method === "GET") {
        try {
            let query = supabase
                .from("checklists")
                .select(`
          *,
          items:checklist_items(id, title, description, input_type, is_required, order_index, images, created_at),
          created_by_profile:profiles!checklists_created_by_fkey(id, full_name, email)
        `)
                .eq("id", id);

            if (user.tenant_id) {
                query = query.eq("tenant_id", user.tenant_id);
            }

            const { data, error } = await query.single();

            if (error) {
                if (error.code === "PGRST116") {
                    throw ApiError.notFound("Checklist not found");
                }
                throw handleSupabaseError(error);
            }

            // Sort items by order_index
            if (data.items && Array.isArray(data.items)) {
                data.items.sort((a: { order_index: number }, b: { order_index: number }) =>
                    (a.order_index || 0) - (b.order_index || 0)
                );
            }

            return sendSuccess(res, data);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // PUT/PATCH - Update checklist (admin/supervisor only)
    if (req.method === "PUT" || req.method === "PATCH") {
        if (user.role === "technician") {
            return sendError(res, ApiError.forbidden("Only admins and supervisors can update checklists"));
        }

        try {
            // Check if checklist exists
            let checkQuery = supabase
                .from("checklists")
                .select("id, tenant_id")
                .eq("id", id);

            if (user.tenant_id) {
                checkQuery = checkQuery.eq("tenant_id", user.tenant_id);
            }

            const { data: existing, error: checkError } = await checkQuery.single();

            if (checkError || !existing) {
                throw ApiError.notFound("Checklist not found");
            }

            // Validate input
            const validation = validateChecklist(req.body, true);
            if (!validation.valid) {
                return sendValidationError(res, validation);
            }

            const {
                name,
                description,
                category,
                is_active,
                items // Optional: update items
            } = req.body;

            // Build update object
            const updateData: Record<string, unknown> = {
                updated_at: new Date().toISOString()
            };

            if (name !== undefined) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (category !== undefined) updateData.category = category;
            if (is_active !== undefined) updateData.is_active = is_active;

            const { error: updateError } = await supabase
                .from("checklists")
                .update(updateData)
                .eq("id", id);

            if (updateError) {
                throw handleSupabaseError(updateError);
            }

            // Update items if provided
            if (items && Array.isArray(items)) {
                // Get existing items
                const { data: existingItems } = await supabase
                    .from("checklist_items")
                    .select("id")
                    .eq("checklist_id", id);

                const existingIds = new Set((existingItems || []).map(i => i.id));
                const newItemIds = new Set(items.filter(i => i.id).map(i => i.id));

                // Delete removed items
                const toDelete = [...existingIds].filter(eid => !newItemIds.has(eid));
                if (toDelete.length > 0) {
                    await supabase
                        .from("checklist_items")
                        .delete()
                        .in("id", toDelete);
                }

                // Update or insert items
                for (const [index, item] of items.entries()) {
                    const itemData = {
                        checklist_id: id,
                        title: item.title,
                        description: item.description,
                        input_type: item.input_type || "checkbox",
                        is_required: item.is_required ?? true,
                        order_index: item.order_index ?? index,
                        images: item.images
                    };

                    if (item.id && existingIds.has(item.id)) {
                        // Update existing
                        await supabase
                            .from("checklist_items")
                            .update(itemData)
                            .eq("id", item.id);
                    } else {
                        // Insert new
                        await supabase
                            .from("checklist_items")
                            .insert({ ...itemData, created_at: new Date().toISOString() });
                    }
                }
            }

            // Return updated checklist with items
            const { data: fullChecklist, error: fetchError } = await supabase
                .from("checklists")
                .select("*, items:checklist_items(*)")
                .eq("id", id)
                .single();

            if (fetchError) {
                throw handleSupabaseError(fetchError);
            }

            // Sort items
            if (fullChecklist.items) {
                fullChecklist.items.sort((a: { order_index: number }, b: { order_index: number }) =>
                    (a.order_index || 0) - (b.order_index || 0)
                );
            }

            return sendSuccess(res, fullChecklist);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // DELETE - Delete checklist (admin/supervisor only)
    if (req.method === "DELETE") {
        if (user.role === "technician") {
            return sendError(res, ApiError.forbidden("Only admins and supervisors can delete checklists"));
        }

        try {
            // Check if checklist exists
            let checkQuery = supabase
                .from("checklists")
                .select("id, tenant_id")
                .eq("id", id);

            if (user.tenant_id) {
                checkQuery = checkQuery.eq("tenant_id", user.tenant_id);
            }

            const { data: existing, error: checkError } = await checkQuery.single();

            if (checkError || !existing) {
                throw ApiError.notFound("Checklist not found");
            }

            // Delete items first (cascade may not be set)
            await supabase
                .from("checklist_items")
                .delete()
                .eq("checklist_id", id);

            // Delete checklist
            const { error } = await supabase
                .from("checklists")
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
