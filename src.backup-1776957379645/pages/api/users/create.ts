import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import {
    createOrganizationUser,
    isValidOrganizationUserRole,
    UserProvisioningError,
} from "@/lib/server/userProvisioning";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { email, password, full_name, role, organization_id } = req.body ?? {};

    const targetOrganizationId =
        typeof organization_id === "string" && organization_id.trim().length > 0
            ? organization_id.trim()
            : req.user.organizationId;

    if (!email || !password || !targetOrganizationId || !isValidOrganizationUserRole(role)) {
        return res.status(400).json({ ok: false, error: "Missing or invalid required fields" });
    }

    try {
        const serviceSupabase = getServiceSupabase();
        const created = await createOrganizationUser(serviceSupabase, {
            actor: req.user,
            organizationId: targetOrganizationId,
            email: String(email),
            password: String(password),
            fullName: typeof full_name === "string" ? full_name : null,
            role: String(role),
        });

        return res.status(200).json({
            ok: true,
            user_id: created.userId,
            membership_id: created.membershipId,
            email: created.email,
            role: created.role,
        });
    } catch (error) {
        console.error("API /users/create error:", error);

        if (error instanceof UserProvisioningError) {
            return res.status(error.statusCode).json({ ok: false, error: error.message });
        }

        return res.status(500).json({ ok: false, error: "Unexpected server error" });
    }
}

export default withAuth(["admin"], handler, { requireAal2: true });
