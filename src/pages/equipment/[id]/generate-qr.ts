import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import { sendSuccess, sendError, ApiError, handleSupabaseError } from "@/lib/middleware/errorHandler";
import { validators } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;
    const { id } = req.query;

    // Only POST allowed
    if (req.method !== "POST") {
        return sendError(res, ApiError.methodNotAllowed(req.method || ""));
    }

    // Validate ID
    if (!id || typeof id !== "string") {
        return sendError(res, ApiError.badRequest("Equipment ID is required"));
    }

    const uuidError = validators.uuid(id, "id");
    if (uuidError) {
        return sendError(res, ApiError.badRequest(uuidError.message));
    }

    try {
        // Get equipment
        let query = supabase
            .from("equipment")
            .select("id, equipment_code, qr_code, tenant_id")
            .eq("id", id);

        if (user.tenant_id) {
            query = query.eq("tenant_id", user.tenant_id);
        }

        const { data: equipment, error: fetchError } = await query.single();

        if (fetchError || !equipment) {
            throw ApiError.notFound("Equipment not found");
        }

        // Generate unique QR code
        const codePart = equipment.equipment_code || equipment.id.substring(0, 8);
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 8);
        const qrCode = `EQ-${codePart}-${timestamp}-${randomPart}`.toUpperCase();

        // Update equipment with new QR code
        const { data, error } = await supabase
            .from("equipment")
            .update({
                qr_code: qrCode,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw handleSupabaseError(error);
        }

        return sendSuccess(res, {
            qr_code: qrCode,
            equipment: data
        });

    } catch (error) {
        return sendError(res, error as Error);
    }
}

export default withAuth(handler);
