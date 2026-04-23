import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ error: "Invalid customer ID" });
        }

        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();

        const { data: customerOrg, error: customerError } = await serviceSupabase
            .from("organizations")
            .select("id, name, type, manufacturer_org_id, is_deleted")
            .eq("id", id)
            .eq("type", "customer")
            .maybeSingle();

        if (customerError) {
            return res.status(500).json({ error: customerError.message });
        }

        if (!customerOrg) {
            return res.status(404).json({ error: "Customer not found" });
        }

        if (
            !req.user.isPlatformAdmin &&
            customerOrg.manufacturer_org_id !== req.user.organizationId
        ) {
            return res
                .status(403)
                .json({ error: "Customer does not belong to active manufacturer" });
        }

        if (!customerOrg.is_deleted) {
            return res.status(200).json({
                success: true,
                message: "Customer already active",
                customer_id: customerOrg.id,
            });
        }

        const now = new Date().toISOString();

        const { error: restoreOrgError } = await serviceSupabase
            .from("organizations")
            .update({
                is_deleted: false,
                deleted_at: null,
                deleted_by: null,
                updated_at: now,
            } as any)
            .eq("id", customerOrg.id);

        if (restoreOrgError) {
            return res.status(500).json({ error: restoreOrgError.message });
        }

        const { error: reactivateMembershipsError } = await serviceSupabase
            .from("organization_memberships")
            .update({
                is_active: true,
            } as any)
            .eq("organization_id", customerOrg.id);

        if (reactivateMembershipsError) {
            return res.status(500).json({ error: reactivateMembershipsError.message });
        }

        await serviceSupabase
            .from("audit_logs")
            .insert({
                organization_id: req.user.organizationId,
                actor_user_id: req.user.id,
                entity_type: "organization",
                entity_id: customerOrg.id,
                action: "restore",
                metadata: {
                    target_customer_name: customerOrg.name,
                    trash_system: true,
                    note: "machine assignments remain inactive after restore",
                },
                new_data: {
                    is_deleted: false,
                    deleted_at: null,
                    deleted_by: null,
                },
            } as any)
            .then(() => undefined)
            .catch((err) => {
                console.error("Audit log insert failed:", err);
            });

        return res.status(200).json({
            success: true,
            message: "Customer restored successfully",
            customer_id: customerOrg.id,
        });
    } catch (error) {
        console.error("Unexpected error in /api/customers/[id]/restore:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["owner", "admin"], handler, {
    requireAal2: true,
    allowPlatformAdmin: true,
});