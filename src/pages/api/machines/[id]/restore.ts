// ============================================================================
// API: POST /api/machines/[id]/restore
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    type AppRole,
    getServiceSupabase,
} from "@/lib/apiAuth";

const ALLOWED_ROLES: AppRole[] = ["owner", "admin", "supervisor"];

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Invalid machine ID" });
        }

        if (!req.user.organizationId) {
            return res
                .status(400)
                .json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();

        // Verify machine belongs to organization and is soft-deleted
        const { data: machine, error: fetchError } = await serviceSupabase
            .from("machines")
            .select("id, organization_id, deleted_at")
            .eq("id", id)
            .eq("organization_id", req.user.organizationId)
            .single();

        if (fetchError || !machine) {
            return res.status(404).json({ error: "Machine not found" });
        }

        if (!machine.deleted_at) {
            return res
                .status(400)
                .json({ error: "Machine is not in trash" });
        }

        const { data: restored, error: updateError } = await serviceSupabase
            .from("machines")
            .update({
                deleted_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        return res.status(200).json({
            success: true,
            message: "Machine restored successfully",
            machine: restored,
        });
    } catch (error) {
        console.error("Machine restore error:", error);
        return res.status(500).json({
            error: "Failed to restore machine",
            message:
                error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALLOWED_ROLES, handler);

