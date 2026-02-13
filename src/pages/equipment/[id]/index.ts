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

    // GET - Get single equipment
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
