// ============================================================================
// API: POST /api/stripe/create-checkout-session
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

const PRICE_IDS: Record<string, Record<string, string>> = {
    starter: {
        monthly:
            process.env.STRIPE_PRICE_STARTER_MONTHLY ||
            "price_starter_monthly",
        yearly:
            process.env.STRIPE_PRICE_STARTER_YEARLY ||
            "price_starter_yearly",
    },
    professional: {
        monthly:
            process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ||
            "price_professional_monthly",
        yearly:
            process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY ||
            "price_professional_yearly",
    },
    enterprise: {
        monthly:
            process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ||
            "price_enterprise_monthly",
        yearly:
            process.env.STRIPE_PRICE_ENTERPRISE_YEARLY ||
            "price_enterprise_yearly",
    },
};

const ALLOWED_ROLES: AppRole[] = ["owner", "admin"];

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { plan, period, returnUrl } = req.body;

        if (!plan || !period) {
            return res
                .status(400)
                .json({ error: "Missing required fields: plan, period" });
        }

        if (!PRICE_IDS[plan] || !PRICE_IDS[plan][period]) {
            return res
                .status(400)
                .json({ error: "Invalid plan or period" });
        }

        if (!req.user.organizationId) {
            return res
                .status(400)
                .json({ error: "No active organization" });
        }

        const serviceSupabase = getServiceSupabase();

        const { data: org, error: orgError } = await serviceSupabase
            .from("organizations")
            .select("*")
            .eq("id", req.user.organizationId)
            .single();

        if (orgError || !org) {
            return res
                .status(404)
                .json({ error: "Organization not found" });
        }

        let customerId = org.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                name: org.name,
                metadata: {
                    organization_id: req.user.organizationId,
                    user_id: req.user.userId,
                },
            });
            customerId = customer.id;
            await serviceSupabase
                .from("organizations")
                .update({ stripe_customer_id: customerId })
                .eq("id", req.user.organizationId);
        }

        const baseUrl =
            returnUrl ||
            process.env.NEXT_PUBLIC_SITE_URL ||
            "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                { price: PRICE_IDS[plan][period], quantity: 1 },
            ],
            success_url: `${baseUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${baseUrl}/settings/billing?canceled=true`,
            subscription_data: {
                metadata: {
                    organization_id: req.user.organizationId,
                    plan,
                    period,
                },
            },
            metadata: {
                organization_id: req.user.organizationId,
                user_id: req.user.userId,
                plan,
                period,
            },
            allow_promotion_codes: true,
            billing_address_collection: "required",
        });

        return res
            .status(200)
            .json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
        console.error("Stripe checkout error:", error);
        return res.status(500).json({ error: error.message });
    }
}

export default withAuth(ALLOWED_ROLES, handler);
