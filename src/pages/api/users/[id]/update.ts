import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { full_name, role, phone, is_active } = req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (role && !["admin", "supervisor", "technician"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const serviceSupabase = getServiceSupabase();

    // Update profile
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { error: profileError } = await serviceSupabase
      .from("profiles")
      .update(updateData)
      .eq("id", id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      return res.status(500).json({ error: "Failed to update user profile" });
    }

    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Unexpected error in /api/users/[id]/update:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withAuth(["admin"], handler);