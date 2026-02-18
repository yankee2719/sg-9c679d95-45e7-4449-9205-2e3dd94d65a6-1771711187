import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import {
    sendSuccess,
    sendError,
    sendValidationError,
    ApiError,
    handleSupabaseError
} from "@/lib/middleware/errorHandler";
import { validateEquipment, validators } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;
    const { id } = req.query;

    // Validate ID
    if (!id || typeof id !== "string") {
        return sendError(res, ApiError.badRequest("Equipment ID is required"));
    }

    const uuidError = validators.uuid(id, "id");
    if (uuidError) {
        return sendError(res, ApiError.badRequest(uuidError.message));
    }

    // ========================================================================
    // GET - Get single equipment
    // ========================================================================
    if (req.method === "GET") {
        try {
            let query = supabase
                .from("equipment")
                .select(`
                    *,
                    documents:documents(id, title, file_path, file_type, created_at),
                    maintenance_schedules:maintenance_schedules(id, title, frequency, next_due_date, status)
                `)
                .eq("id", id);

            // Apply tenant filter
            if (user.tenant_id) {
                query = query.eq("tenant_id", user.tenant_id);
            }

            const { data, error } = await query.single();

            if (error) {
                return handleSupabaseError(res, error, "equipment");
            }

            return sendSuccess(res, data);
        } catch (err) {
            return sendError(res, ApiError.internal("Failed to fetch equipment"));
        }
    }

    // ========================================================================
    // PUT - Update equipment
    // ========================================================================
    else if (req.method === "PUT") {
        try {
            const body = req.body;

            // Validate input
            const validation = validateEquipment(body, true);
            if (!validation.valid) {
                return sendValidationError(res, validation.errors);
            }

            // Check equipment exists and belongs to tenant
            let checkQuery = supabase
                .from("equipment")
                .select("id, tenant_id")
                .eq("id", id);

            if (user.tenant_id) {
                checkQuery = checkQuery.eq("tenant_id", user.tenant_id);
            }

            const { data: existing, error: checkError } = await checkQuery.single();

            if (checkError || !existing) {
                return sendError(res, ApiError.notFound("Equipment not found"));
            }

            // Build update data
            const updateData: Record<string, unknown> = {};
            const allowedFields = [
                "name", "internal_code", "equipment_code", "serial_number",
                "category", "manufacturer", "model", "year_of_manufacture",
                "lifecycle_state", "location", "plant_id", "notes",
                "photo_url", "customer_id"
            ];

            for (const field of allowedFields) {
                if (body[field] !== undefined) {
                    updateData[field] = body[field];
                }
            }

            updateData.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from("equipment")
                .update(updateData)
                .eq("id", id)
                .select()
                .single();

            if (error) {
                return handleSupabaseError(res, error, "equipment");
            }

            return sendSuccess(res, data, "Equipment updated successfully");
        } catch (err) {
            return sendError(res, ApiError.internal("Failed to update equipment"));
        }
    }

    // ========================================================================
    // DELETE - Delete equipment
    // ========================================================================
    else if (req.method === "DELETE") {
        try {
            // Check role - only admin can delete
            if (user.role !== "admin") {
                return sendError(res, ApiError.forbidden("Only admins can delete equipment"));
            }

            // Check equipment exists and belongs to tenant
            let checkQuery = supabase
                .from("equipment")
                .select("id, tenant_id")
                .eq("id", id);

            if (user.tenant_id) {
                checkQuery = checkQuery.eq("tenant_id", user.tenant_id);
            }

            const { data: existing, error: checkError } = await checkQuery.single();

            if (checkError || !existing) {
                return sendError(res, ApiError.notFound("Equipment not found"));
            }

            // Delete related records first
            await supabase.from("documents").delete().eq("equipment_id", id);
            await supabase.from("maintenance_schedules").delete().eq("equipment_id", id);

            // Delete equipment
            const { error } = await supabase
                .from("equipment")
                .delete()
                .eq("id", id);

            if (error) {
                return handleSupabaseError(res, error, "equipment");
            }

            return sendSuccess(res, { id }, "Equipment deleted successfully");
        } catch (err) {
            return sendError(res, ApiError.internal("Failed to delete equipment"));
        }
    }

    // ========================================================================
    // Method not allowed
    // ========================================================================
    return sendError(res, ApiError.methodNotAllowed(req.method || "UNKNOWN"));
}

export default withAuth(handler);
