import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const serviceSupabase = getServiceSupabase();

    // Get equipment list
    const { data: equipment, error } = await serviceSupabase
      .from("equipment")
      .select(`
        *,
        equipment_categories (
          id,
          name,
          description
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching equipment:", error);
      return res.status(500).json({ error: "Failed to fetch equipment" });
    }

    return res.status(200).json({ equipment: equipment || [] });
  } catch (error) {
    console.error("Unexpected error in /api/equipment/list:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withAuth(["admin", "supervisor", "technician"], handler);