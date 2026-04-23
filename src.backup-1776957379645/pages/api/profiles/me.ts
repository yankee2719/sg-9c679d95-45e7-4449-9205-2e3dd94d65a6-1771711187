import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const serviceSupabase = getServiceSupabase();

    // Get user profile
    const { data: profile, error } = await serviceSupabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json({ profile });
  } catch (error) {
    console.error("Unexpected error in /api/profiles/me:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withAuth(["admin", "supervisor", "technician"], handler);