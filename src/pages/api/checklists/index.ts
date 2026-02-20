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

    // GET - List checklist templates with pagination and filters
    if (req.method === "GET") {
        try {
            const {
                page = "1",
                limit = "20",
                search,
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
                ? "*, items:checklist_template_items(id, title, description, input_type, is_required, order_index, metadata, created_at)"
                : "*";

            let query = supabase
                .from("checklist_templates")
                .select(selectClause, { count: "exact" });

            // Apply org filter (multi-tenant)
            if (user.organization_id) {
                query = query.eq("organization_id", user.organization_id);
            }

            // Apply search filter
            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }

            // Apply active filter
            if (is_active !== undefined) {
                query = query.eq("is_active", is_active === "true");
            }

            // Apply sorting
            const validSortFields = ["created_at", "name"];
            const sortField = validSortFields.includes(sort as string) ? (sort as string) : "created_at";
            const sortOrder = order === "asc" ? true : false;

            query = query.order(sortField, { ascending: sortOrder });

            // Apply pagination
            query = query.range(offset, offset + limitNum - 1);

            const { data, error, count } = await query;

            if (error) {
                throw handleSupabaseError(error);
            }

            // Sort items by order_index if included
            const processedData = data?.map((tpl: any) => {
                if (tpl.items && Array.isArray(tpl.items)) {
                    tpl.items.sort((a: { order_index: number }, b: { order_index: number }) =>
                        (a.order_index || 0) - (b.order_index || 0)
                    );
                }
                return tpl;
            });

            return sendPaginated(res, processedData || [], count || 0, pageNum, limitNum);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // POST - Create new checklist template (admin/supervisor only)
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
                target_type = "machine",
                is_active = true,
                items // Optional: create template with items
            } = req.body;

            const templateData = {
                name,
                description,
                target_type,
                version: 1,
                is_active,
                organization_id: user.organization_id,
                created_at: new Date().toISOString(),
            };

            const { data: template, error: createError } = await supabase
                .from("checklist_templates")
                .insert(templateData)
                .select()
                .single();

            if (createError) {
                throw handleSupabaseError(createError);
            }

            // Create items if provided
            if (items && Array.isArray(items) && items.length > 0) {
                const itemsToInsert = items.map((item, index) => ({
                    template_id: template.id,
                    organization_id: user.organization_id,
                    title: item.title,
                    description: item.description,
                    input_type: item.input_type || "boolean",
                    is_required: item.is_required ?? true,
                    order_index: item.order_index ?? index,
                    metadata: item.metadata ?? {},
                    created_at: new Date().toISOString(),
                }));

                const { error: itemsError } = await supabase
                    .from("checklist_template_items")
                    .insert(itemsToInsert);

                if (itemsError) {
                    // Rollback: delete template
                    await supabase.from("checklist_templates").delete().eq("id", template.id);
                    throw handleSupabaseError(itemsError);
                }
            }

            // Return template with items
            const { data: fullTemplate, error: fetchError } = await supabase
                .from("checklist_templates")
                .select("*, items:checklist_template_items(*)")
                .eq("id", template.id)
                .single();

            if (fetchError) {
                throw handleSupabaseError(fetchError);
            }

            return sendSuccess(res, fullTemplate, 201);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // Method not allowed
    return sendError(res, ApiError.methodNotAllowed(req.method || ""));
}

export default withAuth(handler);

