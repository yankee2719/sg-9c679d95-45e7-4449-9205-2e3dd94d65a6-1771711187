import type { NextApiResponse } from "next";
import { ALL_APP_ROLES, withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getServiceSupabase();
    const { user } = req;
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ success: false, error: "Notification ID is required" });
    }

    if (req.method === "GET") {
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("id", id)
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }

            if (!data) {
                return res.status(404).json({ success: false, error: "Notification not found" });
            }

            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("Notification GET error:", error);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    if (req.method === "PATCH") {
        try {
            const { is_read } = req.body ?? {};
            const { data, error } = await supabase
                .from("notifications")
                .update({ is_read: is_read ?? true })
                .eq("id", id)
                .eq("user_id", user.id)
                .select()
                .maybeSingle();

            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }

            if (!data) {
                return res.status(404).json({ success: false, error: "Notification not found" });
            }

            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("Notification PATCH error:", error);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    if (req.method === "DELETE") {
        try {
            const { error } = await supabase
                .from("notifications")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }

            return res.status(204).end();
        } catch (error) {
            console.error("Notification DELETE error:", error);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withAuth(ALL_APP_ROLES, handler);
