import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { getMaintenanceOverview } from "@/lib/server/maintenanceOverviewService";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const supabase = getServiceSupabase();
        const data = await getMaintenanceOverview(supabase, req.user);
        return res.status(200).json(data);
    } catch (error: any) {
        console.error("Maintenance overview API error:", error);
        return res.status(500).json({ error: error?.message || "Failed to load maintenance overview" });
    }
}

export default withAuth(["technician"], handler);
