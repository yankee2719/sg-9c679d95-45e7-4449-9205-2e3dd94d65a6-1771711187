import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { ADMIN_ONLY_ROLES } from "@/lib/roles";
import { createOrganizationBillingPortalSession, StripePortalError } from "@/lib/server/stripePortal";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    try {
        const { returnUrl } = req.body ?? {};
        const organizationId = req.user.organizationId;
        if (!organizationId) return res.status(400).json({ error: "No active organization" });

        const serviceSupabase = getServiceSupabase();
        const session = await createOrganizationBillingPortalSession(serviceSupabase, organizationId, typeof returnUrl === "string" ? returnUrl : null);
        return res.status(200).json(session);
    } catch (error) {
        console.error("Stripe portal error:", error);
        if (error instanceof StripePortalError) return res.status(error.statusCode).json({ error: error.message });
        return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
}

export default withAuth(ADMIN_ONLY_ROLES, handler, { requireAal2: false, allowPlatformAdmin: true });

