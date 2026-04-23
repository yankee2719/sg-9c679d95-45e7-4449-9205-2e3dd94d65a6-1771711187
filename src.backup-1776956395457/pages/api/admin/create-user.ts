import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import {
    createOrganizationUser,
    isValidOrganizationUserRole,
    UserProvisioningError,
    type OrganizationUserRole,
} from "@/lib/server/userProvisioning";
import { normalizeRoleForStorage } from "@/lib/roles";

/**
 * Legacy compatibility endpoint.
 *
 * Old clients still call /api/admin/create-user with { fullName, role, phone }.
 * The platform is now organization-based, so this route provisions the user
 * inside the caller's active organization and mirrors the legacy response shape.
 */
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password, fullName, full_name, role, organization_id } = req.body ?? {};

    const normalizedRole = String(role || "") as OrganizationUserRole;
    const normalizedFullName =
        typeof full_name === "string"
            ? full_name
            : typeof fullName === "string"
                ? fullName
                : null;

    const targetOrganizationId =
        typeof organization_id === "string" && organization_id.trim().length > 0
            ? organization_id.trim()
            : req.user.organizationId;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    if (!targetOrganizationId) {
        return res.status(400).json({ error: "No active organization context" });
    }

    if (!isValidOrganizationUserRole(normalizedRole) || !normalizeRoleForStorage(normalizedRole)) {
        return res.status(400).json({
            error: "Invalid role. Allowed roles: admin, supervisor, technician",
        });
    }

    try {
        const serviceSupabase = getServiceSupabase();
        const created = await createOrganizationUser(serviceSupabase, {
            actor: req.user,
            organizationId: targetOrganizationId,
            email: String(email),
            password: String(password),
            fullName: normalizedFullName,
            role: normalizedRole,
        });

        return res.status(201).json({
            message: "User created successfully",
            user: {
                id: created.userId,
                email: created.email,
                profile: {
                    id: created.userId,
                    email: created.email,
                    display_name: created.displayName,
                    default_organization_id: created.organizationId,
                    role: created.role,
                },
                membership: {
                    id: created.membershipId,
                    organization_id: created.organizationId,
                    role: created.role,
                    is_active: true,
                },
            },
        });
    } catch (error) {
        console.error("Error in create-user API:", error);

        if (error instanceof UserProvisioningError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}

export default withAuth(["admin"], handler, {
    requireAal2: true,
    allowPlatformAdmin: true,
});

