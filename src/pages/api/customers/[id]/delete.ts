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
            return res.status(400).json({ error: "Invalid customer ID" });
        }

        if (!req.user.organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        const serviceSupabase = getServiceSupabase();

        const { data: customerOrg, error: customerError } = await serviceSupabase
            .from("organizations")
            .select("id, name, type, manufacturer_org_id, subscription_status")
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
            return res.status(403).json({ error: "Customer does not belong to active manufacturer" });
        }

        if (customerOrg.subscription_status === "deleted") {
            return res.status(200).json({
                success: true,
                message: "Customer already deleted",
                customer_id: customerOrg.id,
            });
        }

        const now = new Date().toISOString();

        const { error: updateOrgError } = await serviceSupabase
            .from("organizations")
            .update({
                subscription_status: "deleted",
                updated_at: now,
            } as any)
            .eq("id", customerOrg.id);

        if (updateOrgError) {
            return res.status(500).json({ error: updateOrgError.message });
        }

        const { error: deactivateMembershipsError } = await serviceSupabase
            .from("organization_memberships")
            .update({
                is_active: false,
            } as any)
            .eq("organization_id", customerOrg.id)
            .eq("is_active", true);

        if (deactivateMembershipsError) {
            return res.status(500).json({ error: deactivateMembershipsError.message });
        }

        const { error: deactivateAssignmentsError } = await serviceSupabase
            .from("machine_assignments")
            .update({
                is_active: false,
            } as any)
            .eq("customer_org_id", customerOrg.id)
            .eq("is_active", true);

        if (deactivateAssignmentsError) {
            return res.status(500).json({ error: deactivateAssignmentsError.message });
        }

        await serviceSupabase
            .from("profiles")
            .update({
                default_organization_id: null,
                updated_at: now,
            } as any)
            .eq("default_organization_id", customerOrg.id)
            .then(() => undefined)
            .catch((err) => {
                console.error("Profiles cleanup failed (non-fatal):", err);
            });

        await serviceSupabase
            .from("audit_logs")
            .insert({
                organization_id: req.user.organizationId,
                actor_user_id: req.user.id,
                entity_type: "organization",
                entity_id: customerOrg.id,
                action: "delete",
                metadata: {
                    target_customer_name: customerOrg.name,
                    soft_delete: true,
                },
                new_data: {
                    subscription_status: "deleted",
                },
            } as any)
            .then(() => undefined)
            .catch((err) => {
                console.error("Audit log insert failed:", err);
            });

        return res.status(200).json({
            success: true,
            message: "Customer deleted successfully",
            customer_id: customerOrg.id,
        });
    } catch (error) {
        console.error("Unexpected error in /api/customers/[id]/delete:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withAuth(["owner", "admin"], handler, {
    requireAal2: true,
    allowPlatformAdmin: true,
});