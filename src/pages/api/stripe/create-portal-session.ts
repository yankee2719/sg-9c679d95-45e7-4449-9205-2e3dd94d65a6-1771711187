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
        const { tenantId, returnUrl } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: "Missing tenantId" });
        }

        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from("tenants")
            .select("stripe_customer_id")
            .eq("id", tenantId)
            .single();

        if (tenantError || !tenant) {
            return res.status(404).json({ error: "Tenant not found" });
        }

        if (!tenant.stripe_customer_id) {
            return res.status(400).json({ error: "No Stripe customer found. Please subscribe first." });
        }

        const baseUrl = returnUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

        const session = await stripe.billingPortal.sessions.create({
            customer: tenant.stripe_customer_id,
            return_url: `${baseUrl}/settings/billing`,
        });

        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error("Stripe portal error:", error);
        return res.status(500).json({ error: error.message });
    }
}