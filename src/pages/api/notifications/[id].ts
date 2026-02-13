import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import {
    sendSuccess,
    sendError,
    ApiError,
    handleSupabaseError
} from "@/lib/middleware/errorHandler";
import { validators } from "@/lib/validators";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;
    const { id } = req.query;

    // Validate ID
    if (!id || typeof id !== "string") {
        return sendError(res, ApiError.badRequest("Notification ID is required"));
    }

    const uuidError = validators.uuid(id, "id");
    if (uuidError) {
        return sendError(res, ApiError.badRequest(uuidError.message));
    }

    // GET - Get notification
    if (req.method === "GET") {
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("id", id)
                .eq("user_id", user.id)
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    throw ApiError.notFound("Notification not found");
                }
                throw handleSupabaseError(error);
            }

            return sendSuccess(res, data);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // PATCH - Mark as read/unread
    if (req.method === "PATCH") {
        try {
            const { is_read } = req.body;

            const { data, error } = await supabase
                .from("notifications")
                .update({ is_read: is_read ?? true })
                .eq("id", id)
                .eq("user_id", user.id)
                .select()
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    throw ApiError.notFound("Notification not found");
                }
                throw handleSupabaseError(error);
            }

            return sendSuccess(res, data);

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // DELETE - Delete notification
    if (req.method === "DELETE") {
        try {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

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