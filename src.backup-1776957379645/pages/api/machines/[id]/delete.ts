import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Invalid machine ID" });
        }

        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();

        const { data: machine, error: machineError } = await serviceSupabase
            .from("machines")
            .select("id, name, organization_id, is_deleted")
            .eq("id", id)
            .maybeSingle();

        if (machineError) {
            return res.status(500).json({ error: machineError.message });
        }

        if (!machine) {
            return res.status(404).json({ error: "Machine not found" });
        }

        if (
            !req.user.isPlatformAdmin &&
            machine.organization_id !== req.user.organizationId
        ) {
            return res.status(403).json({ error: "Machine does not belong to active organization" });
        }

        if (machine.is_deleted) {
            return res.status(200).json({
                success: true,
                message: "Machine already deleted",
                machine_id: machine.id,
            });
        }

        const now = new Date().toISOString();

        const { error: updateMachineError } = await serviceSupabase
            .from("machines")
            .update({
                is_deleted: true,
                deleted_at: now,
                deleted_by: req.user.id,
                updated_at: now,
            } as any)
            .eq("id", machine.id);

        if (updateMachineError) {
            return res.status(500).json({ error: updateMachineError.message });
        }

        const { error: deactivateAssignmentsError } = await serviceSupabase
            .from("machine_assignments")
            .update({
                is_active: false,
            } as any)
            .eq("machine_id", machine.id)
            .eq("is_active", true);

        if (deactivateAssignmentsError) {
            return res.status(500).json({ error: deactivateAssignmentsError.message });
        }

        await serviceSupabase
            .from("audit_logs")
            .insert({
                organization_id: req.user.organizationId,
                actor_user_id: req.user.id,
                entity_type: "machine",
                entity_id: machine.id,
                action: "soft_delete",
                machine_id: machine.id,
                metadata: {
                    machine_name: machine.name,
                    trash_system: true,
                },
                new_data: {
                    is_deleted: true,
                    deleted_at: now,
                    deleted_by: req.user.id,
                },
            } as any)
            .then(undefined, (err) => {
                console.error("Audit log insert failed:", err);
            });

        return res.status(200).json({
            success: true,
            message: "Machine moved to trash successfully",
            machine_id: machine.id,
        });
    } catch (error) {
        console.error("Unexpected error in /api/machines/[id]/delete:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["owner", "admin"], handler, {
    requireAal2: true,
    allowPlatformAdmin: true,
});