import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
});

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRICE_IDS: Record<string, Record<string, string>> = {
    starter: {
        monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "price_starter_monthly",
        yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || "price_starter_yearly",
    },
    professional: {
        monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || "price_professional_monthly",
        yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || "price_professional_yearly",
    },
    enterprise: {
        monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "price_enterprise_monthly",
        yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || "price_enterprise_yearly",
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { tenantId, userId, plan, period, returnUrl } = req.body;

        if (!tenantId || !userId || !plan || !period) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!PRICE_IDS[plan] || !PRICE_IDS[plan][period]) {
            return res.status(400).json({ error: "Invalid plan or period" });
        }

        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from("tenants").select("*").eq("id", tenantId).single();
        if (tenantError || !tenant) return res.status(404).json({ error: "Tenant not found" });

        const { data: user, error: userError } = await supabaseAdmin
            .from("profiles").select("*").eq("id", userId).single();
        if (userError || !user) return res.status(404).json({ error: "User not found" });

        let customerId = tenant.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: tenant.name,
                metadata: { tenant_id: tenantId, user_id: userId },
            });
            customerId = customer.id;
            await supabaseAdmin.from("tenants").update({ stripe_customer_id: customerId }).eq("id", tenantId);
        }

        const baseUrl = returnUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: PRICE_IDS[plan][period], quantity: 1 }],
            success_url: `${baseUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${baseUrl}/settings/billing?canceled=true`,
            subscription_data: {
                metadata: { tenant_id: tenantId, plan, period },
            },
            metadata: { tenant_id: tenantId, user_id: userId, plan, period },
            allow_promotion_codes: true,
            billing_address_collection: "required",
        });

        return res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
        console.error("Stripe checkout error:", error);
        return res.status(500).json({ error: error.message });
    }
}