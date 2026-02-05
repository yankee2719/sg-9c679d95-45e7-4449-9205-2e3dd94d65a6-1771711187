import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const serviceSupabase = getServiceSupabase();

    // Step 1: Delete profile from database
    const { error: profileError } = await serviceSupabase
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      return res.status(500).json({ error: "Failed to delete user profile" });
    }

    // Step 2: Delete user from Supabase Auth
    const { error: authError } = await serviceSupabase.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Error deleting auth user:", authError);
      return res.status(500).json({ error: "Failed to delete user from auth" });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Unexpected error in /api/users/[id]/delete:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withAuth(["admin"], handler);