import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

type AllowedCustomerUserRole = "supervisor" | "technician";

function isAllowedCustomerUserRole(value: unknown): value is AllowedCustomerUserRole {
    return value === "supervisor" || value === "technician";
}

async function resolveCustomerForManufacturer(
    req: AuthenticatedRequest,
    customerId: string,
    serviceSupabase: ReturnType<typeof getServiceSupabase>
) {
    const manufacturerOrgId = req.user.organizationId;
    const organizationType = req.user.organizationType;

    if (!manufacturerOrgId || organizationType !== "manufacturer") {
        return { customer: null, error: "Customers user management is available only for manufacturer context", status: 403 };
    }

    const { data: customer, error } = await serviceSupabase
        .from("organizations")
        .select("id, name, type, manufacturer_org_id")
        .eq("id", customerId)
        .eq("type", "customer")
        .eq("manufacturer_org_id", manufacturerOrgId)
        .maybeSingle();

    if (error) {
        return { customer: null, error: error.message, status: 500 };
    }

    if (!customer) {
        return { customer: null, error: "Customer not found", status: 404 };
    }

    return { customer, error: null, status: 200 };
}

export default withAuth(["owner", "admin", "supervisor"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    const serviceSupabase = getServiceSupabase();
    const customerId = typeof req.query.id === "string" ? req.query.id : "";
    const membershipId = typeof req.query.membershipId === "string" ? req.query.membershipId : "";

    if (!customerId || !membershipId) {
        return res.status(400).json({ error: "Missing customer id or membership id" });
    }

    const customerResult = await resolveCustomerForManufacturer(req, customerId, serviceSupabase);
    if (!customerResult.customer) {
        return res.status(customerResult.status).json({ error: customerResult.error });
    }

    try {
        const { data: targetMembership, error: membershipError } = await serviceSupabase
            .from("organization_memberships")
            .select("id, user_id, organization_id, role, is_active")
            .eq("id", membershipId)
            .eq("organization_id", customerId)
            .maybeSingle();

        if (membershipError) {
            return res.status(500).json({ error: membershipError.message });
        }

        if (!targetMembership) {
            return res.status(404).json({ error: "Customer user membership not found" });
        }

        if (req.method === "PATCH") {
            if (req.user.aal !== "aal2") {
                return res.status(403).json({ error: "AAL2 required. Complete MFA verification first." });
            }

            const { display_name, role, is_active } = req.body ?? {};

            if (role !== undefined && !isAllowedCustomerUserRole(role)) {
                return res.status(400).json({ error: "Invalid role" });
            }

            const membershipUpdate: Record<string, unknown> = {};
            if (role !== undefined) membershipUpdate.role = role;
            if (is_active !== undefined) {
                membershipUpdate.is_active = Boolean(is_active);
                if (Boolean(is_active)) {
                    membershipUpdate.deactivated_at = null;
                    membershipUpdate.deactivated_by = null;
                } else {
                    membershipUpdate.deactivated_at = new Date().toISOString();
                    membershipUpdate.deactivated_by = req.user.id;
                }
            }

            if (Object.keys(membershipUpdate).length > 0) {
                const { error: updateMembershipError } = await serviceSupabase
                    .from("organization_memberships")
                    .update(membershipUpdate as any)
                    .eq("id", membershipId)
                    .eq("organization_id", customerId);

                if (updateMembershipError) {
                    return res.status(500).json({ error: updateMembershipError.message });
                }
            }

            if (display_name !== undefined) {
                const normalizedName = String(display_name || "").trim();
                const parts = normalizedName.split(" ").filter(Boolean);
                const { error: profileError } = await serviceSupabase
                    .from("profiles")
                    .update({
                        display_name: normalizedName || null,
                        first_name: parts[0] ?? null,
                        last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
                        updated_at: new Date().toISOString(),
                    } as any)
                    .eq("id", targetMembership.user_id);

                if (profileError) {
                    return res.status(500).json({ error: profileError.message });
                }
            }

            await serviceSupabase
                .from("audit_logs")
                .insert({
                    organization_id: req.user.organizationId,
                    actor_user_id: req.user.id,
                    entity_type: "customer_user_membership",
                    entity_id: targetMembership.id,
                    action: "update",
                    metadata: {
                        customer_org_id: customerId,
                        target_user_id: targetMembership.user_id,
                    },
                    new_data: {
                        role: role ?? targetMembership.role,
                        is_active: is_active !== undefined ? Boolean(is_active) : targetMembership.is_active,
                        display_name: display_name !== undefined ? String(display_name || "").trim() : undefined,
                    },
                } as any)
                .then(() => undefined)
                .catch((error) => {
                    console.error("Audit log insert failed:", error);
                });

            return res.status(200).json({
                membership_id: targetMembership.id,
                user_id: targetMembership.user_id,
                success: true,
            });
        }

        if (req.method === "DELETE") {
            if (req.user.aal !== "aal2") {
                return res.status(403).json({ error: "AAL2 required. Complete MFA verification first." });
            }

            const { error: deleteError } = await serviceSupabase
                .from("organization_memberships")
                .delete()
                .eq("id", membershipId)
                .eq("organization_id", customerId);

            if (deleteError) {
                return res.status(500).json({ error: deleteError.message });
            }

            await serviceSupabase
                .from("audit_logs")
                .insert({
                    organization_id: req.user.organizationId,
                    actor_user_id: req.user.id,
                    entity_type: "customer_user_membership",
                    entity_id: targetMembership.id,
                    action: "delete",
                    metadata: {
                        customer_org_id: customerId,
                        target_user_id: targetMembership.user_id,
                        target_role: targetMembership.role,
                    },
                } as any)
                .then(() => undefined)
                .catch((error) => {
                    console.error("Audit log insert failed:", error);
                });

            return res.status(200).json({ success: true, membership_id: targetMembership.id });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Customer user membership API error:", error);
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
});

