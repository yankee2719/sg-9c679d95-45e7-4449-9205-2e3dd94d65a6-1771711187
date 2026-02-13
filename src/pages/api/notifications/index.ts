import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getSupabaseAdmin } from "@/lib/middleware/auth";
import {
    sendSuccess,
    sendError,
    sendPaginated,
    ApiError,
    handleSupabaseError
} from "@/lib/middleware/errorHandler";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const { user } = req;

    // GET - List user's notifications
    if (req.method === "GET") {
        try {
            const {
                page = "1",
                limit = "20",
                is_read,
                type
            } = req.query;

            const pageNum = parseInt(page as string, 10);
            const limitNum = Math.min(parseInt(limit as string, 10), 100);
            const offset = (pageNum - 1) * limitNum;

            let query = supabase
                .from("notifications")
                .select("*", { count: "exact" })
                .eq("user_id", user.id);

            if (is_read !== undefined) {
                query = query.eq("is_read", is_read === "true");
            }

            if (type) {
                query = query.eq("type", type);
            }

            query = query
                .order("created_at", { ascending: false })
                .range(offset, offset + limitNum - 1);

            const { data, error, count } = await query;

            if (error) {
                throw handleSupabaseError(error);
            }

            // Get unread count
            const { count: unreadCount } = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("is_read", false);

            return res.status(200).json({
                success: true,
                data: data || [],
                unread_count: unreadCount || 0,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limitNum),
                    hasMore: pageNum < Math.ceil((count || 0) / limitNum)
                }
            });

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    // POST - Create notification (admin only or system)
    if (req.method === "POST") {
        if (user.role !== "admin") {
            return sendError(res, ApiError.forbidden("Only admins can create notifications"));
        }

        try {
            const {
                user_id,
                title,
                message,
                type = "info",
                link
            } = req.body;

            if (!user_id || !title || !message) {
                throw ApiError.badRequest("user_id, title, and message are required");
            }

            const { data, error } = await supabase
                .from("notifications")
                .insert({
                    user_id,
                    title,
                    message,
                    type,
                    link,
                    is_read: false,
                    created_at: new Date().toISOString()
                })
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

    // PATCH - Mark all as read
    if (req.method === "PATCH") {
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);

            if (error) {
                throw handleSupabaseError(error);
            }

            return sendSuccess(res, { message: "All notifications marked as read" });

        } catch (error) {
            return sendError(res, error as Error);
        }
    }

    return sendError(res, ApiError.methodNotAllowed(req.method || ""));
}

export default withAuth(handler);