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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { tenantId } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: "Tenant ID required" });
        }

        // Get tenant's Stripe customer ID
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from("tenants")
            .select("stripe_customer_id, name")
            .eq("id", tenantId)
            .single();

        if (tenantError || !tenant) {
            return res.status(404).json({ error: "Tenant not found" });
        }

        if (!tenant.stripe_customer_id) {
            return res.status(400).json({ error: "No active subscription found" });
        }

        // Create Stripe Customer Portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: tenant.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
        });

        return res.status(200).json({ url: portalSession.url });
    } catch (error: any) {
        console.error("Create portal error:", error);
        return res.status(500).json({ error: error.message });
    }
}