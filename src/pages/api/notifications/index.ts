import type { NextApiResponse } from "next";
import { ALL_APP_ROLES, withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

function buildNotificationLink(relatedEntityType?: string, relatedEntityId?: string) {
    if (!relatedEntityType || !relatedEntityId) return null;

    switch (relatedEntityType) {
        case "work_order":
            return `/work-orders/${relatedEntityId}`;
        case "maintenance_plan":
            return `/maintenance/${relatedEntityId}`;
        case "machine":
            return `/equipment/${relatedEntityId}`;
        case "checklist_execution":
            return `/checklist/${relatedEntityId}`;
        default:
            return null;
    }
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getServiceSupabase();
    const { user } = req;

    if (req.method === "GET") {
        try {
            const { page = "1", limit = "20", is_read, type } = req.query;
            const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
            const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 100);
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

            const { data, error, count } = await query
                .order("created_at", { ascending: false })
                .range(offset, offset + limitNum - 1);

            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }

            const unread = await supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("is_read", false);

            return res.status(200).json({
                success: true,
                data: data || [],
                unread_count: unread.count || 0,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limitNum),
                    hasMore: pageNum < Math.ceil((count || 0) / limitNum),
                },
            });
        } catch (error) {
            console.error("Notifications GET error:", error);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    if (req.method === "POST") {
        if (!["owner", "admin", "supervisor"].includes(user.role)) {
            return res.status(403).json({ success: false, error: "Insufficient permissions" });
        }

        try {
            const { user_id, title, message, type = "system", link, related_entity_type, related_entity_id } = req.body ?? {};

            if (!user_id || !title || !message) {
                return res.status(400).json({ success: false, error: "user_id, title, and message are required" });
            }

            const payload = {
                user_id,
                title,
                message,
                type,
                link: link ?? buildNotificationLink(related_entity_type, related_entity_id),
                related_entity_type: related_entity_type ?? null,
                related_entity_id: related_entity_id ?? null,
                is_read: false,
                is_email_sent: false,
                created_at: new Date().toISOString(),
            };

            let insert = await supabase.from("notifications").insert(payload as any).select().single();

            if (insert.error) {
                const fallbackPayload = {
                    user_id,
                    title,
                    message,
                    type,
                    link: payload.link,
                    is_read: false,
                    created_at: payload.created_at,
                };
                insert = await supabase.from("notifications").insert(fallbackPayload as any).select().single();
            }

            if (insert.error) {
                return res.status(500).json({ success: false, error: insert.error.message });
            }

            return res.status(201).json({ success: true, data: insert.data });
        } catch (error) {
            console.error("Notifications POST error:", error);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    if (req.method === "PATCH") {
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);

            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }

            return res.status(200).json({ success: true, data: { message: "All notifications marked as read" } });
        } catch (error) {
            console.error("Notifications PATCH error:", error);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(ALL_APP_ROLES, handler);
