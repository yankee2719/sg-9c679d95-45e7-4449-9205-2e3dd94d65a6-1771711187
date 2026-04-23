import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { getAccessibleMachine } from "@/lib/server/machineAccess";

export default withAuth(["owner", "admin", "supervisor", "technician", "viewer"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const machineId = typeof req.query.id === "string" ? req.query.id : null;
    if (!machineId) return res.status(400).json({ error: "Missing machine id" });

    const supabase = getServiceSupabase();
    try {
        const machine = await getAccessibleMachine < any > (
            supabase,
            req.user,
            machineId,
            "id, name, internal_code, serial_number, organization_id"
        );
        if (!machine) return res.status(404).json({ error: "Machine not found" });

        return res.status(200).json({ machine });
    } catch (error: any) {
        console.error("Machine documents context API error:", error);
        return res.status(error?.message === "Access denied" ? 403 : 500).json({ error: error?.message || "Failed to load documents context" });
    }
});
