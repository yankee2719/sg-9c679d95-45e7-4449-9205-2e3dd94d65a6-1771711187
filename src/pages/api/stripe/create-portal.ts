// ============================================================================
// API: POST /api/stripe/create-portal
// ============================================================================
import type { NextApiResponse } from "next";
import Stripe from "stripe";
import {
    withAuth,
    type AuthenticatedRequest,
    type AppRole,
    getServiceSupabase,
} from "@/lib/apiAuth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
});

const ALLOWED_ROLES: AppRole[] = ["owner", "admin"];

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        if (!req.user.organizationId) {
            return res
                .status(400)
                .json({ error: "No active organization" });
        }

        const serviceSupabase = getServiceSupabase();

        const { data: org, error: orgError } = await serviceSupabase
            .from("organizations")
            .select("stripe_customer_id, name")
            .eq("id", req.user.organizationId)
            .single();

        if (orgError || !org) {
            return res
                .status(404)
                .json({ error: "Organization not found" });
        }

        if (!org.stripe_customer_id) {
            return res
                .status(400)
                .json({ error: "No active subscription found" });
        }

        const portalSession =
            await stripe.billingPortal.sessions.create({
                customer: org.stripe_customer_id,
                return_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/settings/billing`,
            });

        return res.status(200).json({ url: portalSession.url });
    } catch (error: any) {
        console.error("Create portal error:", error);
        return res.status(500).json({ error: error.message });
    }
}

export default withAuth(ALLOWED_ROLES, handler);
