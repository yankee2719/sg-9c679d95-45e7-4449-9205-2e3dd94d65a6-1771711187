import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import { isWritableOrgRole, toWritableOrgRole } from "@/lib/roles";

type CustomerCreateBody = {
    name?: string;
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
    create_primary_user?: boolean;
    primary_user_name?: string;
    primary_user_email?: string;
    primary_user_password?: string;
    primary_user_role?: string;
    manufacturer_org_id?: string;
};

const ALLOWED_PRIMARY_ROLES = ["admin", "supervisor", "technician"];

function slugify(input: string): string {
    return input
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

async function generateUniqueSlug(
    serviceSupabase: ReturnType<typeof getServiceSupabase>,
    baseName: string
): Promise<string> {
    const base = slugify(baseName) || "customer";

    for (let i = 0; i < 50; i += 1) {
        const candidate = i === 0 ? base : `${base}-${i + 1}`;

        const { data, error } = await serviceSupabase
            .from("organizations")
            .select("id")
            .eq("slug", candidate)
            .maybeSingle();

        if (error) throw error;
        if (!data) return candidate;
    }

    return `${base}-${Date.now()}`;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const body = (req.body ?? {}) as CustomerCreateBody;

    try {
        const serviceSupabase = getServiceSupabase();

        const customerName = String(body.name ?? "").trim();
        const city = String(body.city ?? "").trim() || null;
        const country = String(body.country ?? "").trim() || "IT";
        const email = String(body.email ?? "").trim().toLowerCase() || null;
        const phone = String(body.phone ?? "").trim() || null;
        const createPrimaryUser = Boolean(body.create_primary_user);
        const primaryUserName = String(body.primary_user_name ?? "").trim();
        const primaryUserEmail = String(body.primary_user_email ?? "").trim().toLowerCase();
        const primaryUserPassword = String(body.primary_user_password ?? "");
        const primaryUserRole = toWritableOrgRole(String(body.primary_user_role ?? "admin"), "technician");

        if (!customerName) {
            return res.status(400).json({ error: "Customer name is required" });
        }

        let manufacturerOrgId = req.user.organizationId ?? null;

        if (req.user.isPlatformAdmin && body.manufacturer_org_id) {
            manufacturerOrgId = body.manufacturer_org_id;
        }

        if (!manufacturerOrgId) {
            return res.status(400).json({ error: "No active manufacturer organization context" });
        }

        const { data: manufacturerOrg, error: manufacturerOrgError } = await serviceSupabase
            .from("organizations")
            .select("id, name, type, is_deleted")
            .eq("id", manufacturerOrgId)
            .maybeSingle();

        if (manufacturerOrgError) {
            return res.status(500).json({ error: manufacturerOrgError.message });
        }

        if (!manufacturerOrg) {
            return res.status(404).json({ error: "Manufacturer organization not found" });
        }

        if (manufacturerOrg.type !== "manufacturer") {
            return res
                .status(403)
                .json({ error: "Active organization is not a manufacturer organization" });
        }

        if ((manufacturerOrg as any).is_deleted === true) {
            return res.status(400).json({ error: "Manufacturer organization is deleted" });
        }

        if (
            !req.user.isPlatformAdmin &&
            req.user.organizationId !== manufacturerOrgId
        ) {
            return res.status(403).json({
                error: "You can only create customers under the active manufacturer organization",
            });
        }

        if (createPrimaryUser) {
            if (!primaryUserName || !primaryUserEmail || !primaryUserPassword) {
                return res.status(400).json({
                    error: "Primary user name, email and password are required",
                });
            }

            if (!isWritableOrgRole(primaryUserRole) || !ALLOWED_PRIMARY_ROLES.includes(primaryUserRole)) {
                return res.status(400).json({ error: "Invalid primary user role" });
            }
        }

        const slug = await generateUniqueSlug(serviceSupabase, customerName);
        const now = new Date().toISOString();

        let createdCustomerId: string | null = null;
        let createdPrimaryUserId: string | null = null;
        let createdMembershipId: string | null = null;

        try {
            const { data: insertedCustomer, error: insertCustomerError } = await serviceSupabase
                .from("organizations")
                .insert({
                    name: customerName,
                    slug,
                    type: "customer",
                    manufacturer_org_id: manufacturerOrgId,
                    city,
                    country,
                    email,
                    phone,
                    subscription_status: "trial",
                    subscription_plan: "free",
                    is_deleted: false,
                    deleted_at: null,
                    deleted_by: null,
                    created_at: now,
                    updated_at: now,
                } as any)
                .select("id, name, slug")
                .single();

            if (insertCustomerError || !insertedCustomer) {
                return res.status(500).json({
                    error: insertCustomerError?.message ?? "Failed to create customer organization",
                });
            }

            createdCustomerId = insertedCustomer.id;

            if (createPrimaryUser) {
                const authRes = await serviceSupabase.auth.admin.createUser({
                    email: primaryUserEmail,
                    password: primaryUserPassword,
                    email_confirm: true,
                    user_metadata: {
                        full_name: primaryUserName,
                        display_name: primaryUserName,
                    },
                });

                if (authRes.error || !authRes.data.user) {
                    throw new Error(authRes.error?.message || "Failed to create primary user");
                }

                createdPrimaryUserId = authRes.data.user.id;

                const parts = primaryUserName.split(" ").filter(Boolean);

                const { error: profileError } = await serviceSupabase
                    .from("profiles")
                    .upsert(
                        {
                            id: createdPrimaryUserId,
                            email: primaryUserEmail,
                            display_name: primaryUserName,
                            first_name: parts[0] ?? null,
                            last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
                            default_organization_id: createdCustomerId,
                            updated_at: now,
                        } as any,
                        { onConflict: "id" }
                    );

                if (profileError) {
                    throw new Error(profileError.message);
                }

                const { data: membershipRow, error: membershipError } = await serviceSupabase
                    .from("organization_memberships")
                    .insert({
                        organization_id: createdCustomerId,
                        user_id: createdPrimaryUserId,
                        role: primaryUserRole,
                        is_active: true,
                        accepted_at: now,
                        invited_by: req.user.id,
                    } as any)
                    .select("id")
                    .single();

                if (membershipError || !membershipRow) {
                    throw new Error(membershipError?.message || "Failed to create primary membership");
                }

                createdMembershipId = membershipRow.id;
            }

            await serviceSupabase
                .from("audit_logs")
                .insert({
                    organization_id: manufacturerOrgId,
                    actor_user_id: req.user.id,
                    entity_type: "organization",
                    entity_id: createdCustomerId,
                    action: "create",
                    metadata: {
                        trash_system_ready: true,
                        customer_name: customerName,
                        create_primary_user: createPrimaryUser,
                        primary_user_email: createPrimaryUser ? primaryUserEmail : null,
                    },
                    new_data: {
                        name: customerName,
                        slug,
                        type: "customer",
                        manufacturer_org_id: manufacturerOrgId,
                        city,
                        country,
                        email,
                        phone,
                    },
                } as any)
                .then(() => undefined)
                .catch((err) => {
                    console.error("Audit log insert failed:", err);
                });

            return res.status(200).json({
                success: true,
                customer_id: createdCustomerId,
                customer_name: customerName,
                primary_user_id: createdPrimaryUserId,
                membership_id: createdMembershipId,
            });
        } catch (innerError: any) {
            console.error("Customer create rollback path:", innerError);

            if (createdMembershipId) {
                await serviceSupabase
                    .from("organization_memberships")
                    .delete()
                    .eq("id", createdMembershipId)
                    .then(() => undefined)
                    .catch((err) => console.error("Rollback membership delete error:", err));
            }

            if (createdPrimaryUserId) {
                await serviceSupabase.auth.admin
                    .deleteUser(createdPrimaryUserId)
                    .then(() => undefined)
                    .catch((err) => console.error("Rollback auth user delete error:", err));
            }

            if (createdCustomerId) {
                await serviceSupabase
                    .from("organizations")
                    .delete()
                    .eq("id", createdCustomerId)
                    .then(() => undefined)
                    .catch((err) => console.error("Rollback customer delete error:", err));
            }

            return res.status(500).json({
                error: innerError?.message ?? "Failed to create customer",
            });
        }
    } catch (error: any) {
        console.error("Unexpected error in /api/customers/create:", error);
        return res.status(500).json({
            error: error?.message ?? "Internal server error",
        });
    }
}

export default withAuth(["admin"], handler, {
    requireAal2: true,
    allowPlatformAdmin: true,
});