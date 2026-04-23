import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { getWorkOrderCreateContext } from "@/lib/server/workOrderCreateContextService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const supabase = getServiceSupabase();
        const data = await getWorkOrderCreateContext(supabase, req.user);
        return res.status(200).json(data);
    } catch (error: any) {
        console.error("Work order create context API error:", error);
        return res.status(500).json({ error: error?.message || "Failed to load work order create context" });
    }
}

export default withAuth(["owner", "admin", "supervisor", "technician"], handler);
