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
import { validateChecklist } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;

    // GET - List checklists with pagination and filters
    if (req.method === "GET") {
        try {
            const {
                page = "1",
                limit = "20",
                search,
                category,
                is_active,
                include_items = "true",
                sort = "created_at",
                order = "desc"
            } = req.query;

            const pageNum = parseInt(page as string, 10);
            const limitNum = Math.min(parseInt(limit as string, 10), 100);
            const offset = (pageNum - 1) * limitNum;

            // Build query - optionally include items
            const selectClause = include_items === "true"
                ? "*, items:checklist_items(id, title, description, input_type, is_required, order_index, images)"
                : "*";

            let query = supabase
                .from("checklists")
                .select(selectClause, { count: "exact" });

            // Apply tenant filter
            if (user.tenant_id) {
                query = query.eq("tenant_id", user.tenant_id);
            }

            // Apply search filter
            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            // Apply category filter
            if (category) {
                query = query.eq("category", category);
            }

            // Apply active filter
            if (is_active !== undefined) {
                query = query.eq("is_active", is_active === "true");
            }

            // Apply sorting
            const validSortFields = ["created_at", "updated_at", "name", "category"];
            const sortField = validSortFields.includes(sort as string) ? sort as string : "created_at";
            const sortOrder = order === "asc" ? true : false;

            query = query.order(sortField, { ascending: sortOrder });

            // Apply pagination
            query = query.range(offset, offset + limitNum - 1);

            const { data, error, count } = await query;

            if (error) {
                throw handleSupabaseError(error);
            }

            // Sort items by order_index if included
            const processedData = data?.map(checklist => {
                if (checklist.items && Array.isArray(checklist.items)) {
                    checklist.items.sort((a: { order_index: number }, b: { order_index: number }) =>
                        (a.order_index || 0) - (b.order_index || 0)
                    );
                }
                return checklist;
            });

            return sendPaginated(res, processedData || [], count || 0, pageNum, limitNum);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // POST - Create new checklist (admin/supervisor only)
    if (req.method === "POST") {
        // Check permissions
        if (user.role === "technician") {
            return sendError(res, ApiError.forbidden("Only admins and supervisors can create checklists"));
        }

        try {
            // Validate input
            const validation = validateChecklist(req.body);
            if (!validation.valid) {
                return sendValidationError(res, validation);
            }

            const {
                name,
                description,
                category,
                is_active = true,
                items // Optional: create checklist with items
            } = req.body;

            // Create checklist
            const checklistData = {
                name,
                description,
                category,
                is_active,
                tenant_id: user.tenant_id,
                created_by: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: checklist, error: createError } = await supabase
                .from("checklists")
                .insert(checklistData)
                .select()
                .single();

            if (createError) {
                throw handleSupabaseError(createError);
            }

            // Create items if provided
            if (items && Array.isArray(items) && items.length > 0) {
                const itemsToInsert = items.map((item, index) => ({
                    checklist_id: checklist.id,
                    title: item.title,
                    description: item.description,
                    input_type: item.input_type || "checkbox",
                    is_required: item.is_required ?? true,
                    order_index: item.order_index ?? index,
                    images: item.images,
                    created_at: new Date().toISOString()
                }));

                const { error: itemsError } = await supabase
                    .from("checklist_items")
                    .insert(itemsToInsert);

                if (itemsError) {
                    // Rollback: delete the checklist
                    await supabase.from("checklists").delete().eq("id", checklist.id);
                    throw handleSupabaseError(itemsError);
                }
            }

            // Return checklist with items
            const { data: fullChecklist, error: fetchError } = await supabase
                .from("checklists")
                .select("*, items:checklist_items(*)")
                .eq("id", checklist.id)
                .single();

            if (fetchError) {
                throw handleSupabaseError(fetchError);
            }

            return sendSuccess(res, fullChecklist, 201);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // Method not allowed
    return sendError(res, ApiError.methodNotAllowed(req.method || ""));
}

export default withAuth(handler);
