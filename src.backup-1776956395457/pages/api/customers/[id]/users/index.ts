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

async function getExistingMembership(
    serviceSupabase: ReturnType<typeof getServiceSupabase>,
    customerId: string,
    userId: string
) {
    const { data, error } = await serviceSupabase
        .from("organization_memberships")
        .select("id, user_id, organization_id, role, is_active, created_at, accepted_at")
        .eq("organization_id", customerId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export default withAuth(["supervisor"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    const serviceSupabase = getServiceSupabase();
    const customerId = typeof req.query.id === "string" ? req.query.id : "";

    if (!customerId) {
        return res.status(400).json({ error: "Missing customer id" });
    }

    const customerResult = await resolveCustomerForManufacturer(req, customerId, serviceSupabase);
    if (!customerResult.customer) {
        return res.status(customerResult.status).json({ error: customerResult.error });
    }

    try {
        if (req.method === "GET") {
            const { data: memberships, error: membershipsError } = await serviceSupabase
                .from("organization_memberships")
                .select("id, user_id, role, is_active, accepted_at, created_at")
                .eq("organization_id", customerId)
                .order("created_at", { ascending: false });

            if (membershipsError) {
                return res.status(500).json({ error: membershipsError.message });
            }

            const rows = memberships ?? [];
            const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));

            let profileMap = new Map < string, any> ();
            if (userIds.length > 0) {
                const { data: profiles, error: profilesError } = await serviceSupabase
                    .from("profiles")
                    .select("id, display_name, first_name, last_name, email")
                    .in("id", userIds);

                if (profilesError) {
                    return res.status(500).json({ error: profilesError.message });
                }

                profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
            }

            const payload = rows.map((row: any) => {
                const profile = profileMap.get(row.user_id);
                return {
                    membership_id: row.id,
                    user_id: row.user_id,
                    role: row.role,
                    is_active: row.is_active ?? true,
                    created_at: row.created_at ?? null,
                    accepted_at: row.accepted_at ?? null,
                    display_name: profile?.display_name ?? null,
                    first_name: profile?.first_name ?? null,
                    last_name: profile?.last_name ?? null,
                    email: profile?.email ?? null,
                };
            });

            return res.status(200).json(payload);
        }

        if (req.method === "POST") {
            if (req.user.aal !== "aal2") {
                return res.status(403).json({ error: "AAL2 required. Complete MFA verification first." });
            }

            const { email, password, full_name, role } = req.body ?? {};

            if (!email || !password || !isAllowedCustomerUserRole(role)) {
                return res.status(400).json({ error: "email, password and a valid role are required" });
            }

            const normalizedEmail = String(email).trim().toLowerCase();
            const displayName = full_name ? String(full_name).trim() : null;
            const nameParts = displayName ? displayName.split(" ").filter(Boolean) : [];
            const firstName = nameParts.length > 0 ? nameParts[0] : null;
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
            const acceptedAt = new Date().toISOString();

            let createdUserId: string | null = null;

            try {
                const { data: createdAuthUser, error: createUserError } = await serviceSupabase.auth.admin.createUser({
                    email: normalizedEmail,
                    password: String(password),
                    email_confirm: true,
                    user_metadata: {
                        full_name: displayName,
                        display_name: displayName,
                    },
                });

                if (createUserError || !createdAuthUser.user) {
                    return res.status(400).json({ error: createUserError?.message ?? "User creation failed" });
                }

                createdUserId = createdAuthUser.user.id;

                const { error: profileError } = await serviceSupabase.from("profiles").upsert(
                    {
                        id: createdUserId,
                        email: normalizedEmail,
                        display_name: displayName,
                        first_name: firstName,
                        last_name: lastName,
                    } as any,
                    { onConflict: "id" }
                );

                if (profileError) {
                    await serviceSupabase.auth.admin.deleteUser(createdUserId);
                    return res.status(500).json({ error: profileError.message });
                }

                let membership = await getExistingMembership(serviceSupabase, customerId, createdUserId);

                if (!membership) {
                    const { data: insertedMembership, error: insertMembershipError } = await serviceSupabase
                        .from("organization_memberships")
                        .insert({
                            organization_id: customerId,
                            user_id: createdUserId,
                            role,
                            is_active: true,
                            accepted_at: acceptedAt,
                            invited_by: req.user.id,
                        } as any)
                        .select("id, user_id, organization_id, role, is_active, created_at, accepted_at")
                        .single();

                    if (insertMembershipError && !String(insertMembershipError.message || "").includes("organization_memberships_organization_id_user_id_key")) {
                        await serviceSupabase.auth.admin.deleteUser(createdUserId);
                        return res.status(500).json({ error: insertMembershipError.message || "Membership creation failed" });
                    }

                    membership = insertedMembership ?? await getExistingMembership(serviceSupabase, customerId, createdUserId);
                }

                if (!membership) {
                    await serviceSupabase.auth.admin.deleteUser(createdUserId);
                    return res.status(500).json({ error: "Membership resolution failed" });
                }

                const { data: updatedMembership, error: updateMembershipError } = await serviceSupabase
                    .from("organization_memberships")
                    .update({
                        role,
                        is_active: true,
                        accepted_at: membership.accepted_at ?? acceptedAt,
                        invited_by: req.user.id,
                    } as any)
                    .eq("id", membership.id)
                    .select("id, user_id, role, is_active, created_at, accepted_at")
                    .single();

                if (updateMembershipError || !updatedMembership) {
                    await serviceSupabase.auth.admin.deleteUser(createdUserId);
                    return res.status(500).json({ error: updateMembershipError?.message ?? "Membership update failed" });
                }

                const { error: defaultOrgError } = await serviceSupabase
                    .from("profiles")
                    .update({ default_organization_id: customerId } as any)
                    .eq("id", createdUserId);

                if (defaultOrgError) {
                    console.error("Default organization update failed:", defaultOrgError);
                }

                await serviceSupabase
                    .from("audit_logs")
                    .insert({
                        organization_id: req.user.organizationId,
                        actor_user_id: req.user.id,
                        entity_type: "customer_user_membership",
                        entity_id: updatedMembership.id,
                        action: "create",
                        metadata: {
                            customer_org_id: customerId,
                            target_user_id: createdUserId,
                            target_email: normalizedEmail,
                            target_role: role,
                        },
                    } as any)
                    .then(() => undefined)
                    .catch((error) => {
                        console.error("Audit log insert failed:", error);
                    });

                return res.status(201).json({
                    membership_id: updatedMembership.id,
                    user_id: createdUserId,
                    email: normalizedEmail,
                    display_name: displayName,
                    role: updatedMembership.role,
                    is_active: updatedMembership.is_active ?? true,
                    created_at: updatedMembership.created_at ?? null,
                    accepted_at: updatedMembership.accepted_at ?? acceptedAt,
                });
            } catch (error: any) {
                if (createdUserId) {
                    await serviceSupabase.auth.admin.deleteUser(createdUserId).catch((rollbackError) => {
                        console.error("Rollback deleteUser failed:", rollbackError);
                    });
                }
                return res.status(500).json({ error: error?.message ?? "Unexpected server error" });
            }
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error: any) {
        console.error("Customer users API error:", error);
        return res.status(500).json({ error: error?.message || "Internal server error" });
    }
});
