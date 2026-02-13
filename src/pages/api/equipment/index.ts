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
import { validateEquipment } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;

    // GET - List equipment with pagination and filters
    if (req.method === "GET") {
        try {
            const {
                page = "1",
                limit = "20",
                search,
                category,
                status,
                location,
                sort = "created_at",
                order = "desc"
            } = req.query;

            const pageNum = parseInt(page as string, 10);
            const limitNum = Math.min(parseInt(limit as string, 10), 100); // Max 100 per page
            const offset = (pageNum - 1) * limitNum;

            // Build query
            let query = supabase
                .from("equipment")
                .select("*", { count: "exact" });

            // Apply tenant filter
            if (user.tenant_id) {
                query = query.eq("tenant_id", user.tenant_id);
            }

            // Apply search filter
            if (search) {
                query = query.or(`name.ilike.%${search}%,equipment_code.ilike.%${search}%,manufacturer.ilike.%${search}%,model.ilike.%${search}%`);
            }

            // Apply category filter
            if (category) {
                query = query.eq("category", category);
            }

            // Apply status filter
            if (status) {
                query = query.eq("status", status);
            }

            // Apply location filter
            if (location) {
                query = query.ilike("location", `%${location}%`);
            }

            // Apply sorting
            const validSortFields = ["created_at", "name", "equipment_code", "category", "status", "purchase_date"];
            const sortField = validSortFields.includes(sort as string) ? sort as string : "created_at";
            const sortOrder = order === "asc" ? true : false;

            query = query.order(sortField, { ascending: sortOrder });

            // Apply pagination
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

    // POST - Create new equipment
    if (req.method === "POST") {
        try {
            // Validate input
            const validation = validateEquipment(req.body);
            if (!validation.valid) {
                return sendValidationError(res, validation);
            }

            const {
                name,
                equipment_code,
                category,
                manufacturer,
                model,
                serial_number,
                location,
                status = "active",
                purchase_date,
                warranty_expiry,
                notes,
                image_url,
                qr_code
            } = req.body;

            // Check if equipment_code already exists for this tenant
            if (user.tenant_id) {
                const { data: existing } = await supabase
                    .from("equipment")
                    .select("id")
                    .eq("tenant_id", user.tenant_id)
                    .eq("equipment_code", equipment_code)
                    .single();

                if (existing) {
                    throw ApiError.conflict(`Equipment with code "${equipment_code}" already exists`);
                }
            }

            // Prepare data for insertion
            const equipmentData: Record<string, unknown> = {
                name,
                equipment_code,
                category,
                status,
                tenant_id: user.tenant_id,
            };

            // Add optional fields
            if (manufacturer) equipmentData.manufacturer = manufacturer;
            if (model) equipmentData.model = model;
            if (serial_number) equipmentData.serial_number = serial_number;
            if (location) equipmentData.location = location;
            if (purchase_date) equipmentData.purchase_date = purchase_date;
            if (warranty_expiry) equipmentData.warranty_expiry = warranty_expiry;
            if (notes) equipmentData.notes = notes;
            if (image_url) equipmentData.image_url = image_url;
            if (qr_code) equipmentData.qr_code = qr_code;

            const { data, error } = await supabase
                .from("equipment")
                .insert(equipmentData)
                .select()
                .single();

            if (error) {
                throw handleSupabaseError(error);
            }

            return sendSuccess(res, data, 201);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // Method not allowed
    return sendError(res, ApiError.methodNotAllowed(req.method || ""));
}

export default withAuth(handler);
