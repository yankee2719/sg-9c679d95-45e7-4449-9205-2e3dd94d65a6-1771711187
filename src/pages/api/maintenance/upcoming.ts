import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const serviceSupabase = getServiceSupabase();

        // Get upcoming maintenance (next 7 days)
        const today = new Date().toISOString();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const { data: schedules, error } = await serviceSupabase
            .from("maintenance_schedules")
            .select(`
        *,
        equipment (
          id,
          name,
          code
        ),
        assigned_to:profiles!maintenance_schedules_assigned_to_fkey (
          id,
          full_name,
          email
        )
      `)
            .gte("scheduled_date", today)
            .lte("scheduled_date", nextWeek.toISOString())
            .eq("status", "scheduled")
            .order("scheduled_date", { ascending: true });

        if (error) {
            console.error("Error fetching maintenance schedules:", error);
            return res.status(500).json({ error: "Failed to fetch maintenance schedules" });
        }

        return res.status(200).json({ schedules: schedules || [] });
    } catch (error) {
        console.error("Unexpected error in /api/maintenance/upcoming:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["admin", "supervisor", "technician"], handler);