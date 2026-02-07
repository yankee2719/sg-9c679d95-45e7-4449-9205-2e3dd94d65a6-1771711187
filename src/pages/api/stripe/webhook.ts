import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { buffer } from "micro";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
});

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
    api: { bodyParser: false },
};

const PLAN_LIMITS: Record<string, { maxUsers: number; maxEquipment: number }> = {
    starter: { maxUsers: 6, maxEquipment: 100 },
    professional: { maxUsers: 19, maxEquipment: 500 },
    enterprise: { maxUsers: 9999, maxEquipment: 9999 },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const tenantId = session.metadata?.tenant_id;
                const plan = session.metadata?.plan || "starter";
                const period = session.metadata?.period || "monthly";
                if (!tenantId) break;

                const limits = PLAN_LIMITS[plan];
                await supabaseAdmin.from("tenants").update({
                    stripe_subscription_id: session.subscription as string,
                    subscription_plan: plan,
                    subscription_period: period,
                    subscription_status: "active",
                    max_users: limits.maxUsers,
                    max_equipment: limits.maxEquipment,
                    trial_ends_at: null,
                }).eq("id", tenantId);
                console.log(`✅ Checkout completed for tenant ${tenantId}`);
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const { data: tenant } = await supabaseAdmin
                    .from("tenants").select("id").eq("stripe_subscription_id", subscription.id).single();
                if (!tenant) break;

                const plan = subscription.metadata?.plan || "starter";
                const limits = PLAN_LIMITS[plan];
                await supabaseAdmin.from("tenants").update({
                    subscription_status: subscription.status === "active" ? "active" : subscription.status,
                    subscription_plan: plan,
                    max_users: limits.maxUsers,
                    max_equipment: limits.maxEquipment,
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                }).eq("id", tenant.id);
                console.log(`✅ Subscription updated for tenant ${tenant.id}`);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const { data: tenant } = await supabaseAdmin
                    .from("tenants").select("id").eq("stripe_subscription_id", subscription.id).single();
                if (!tenant) break;

                await supabaseAdmin.from("tenants").update({
                    subscription_status: "canceled",
                    stripe_subscription_id: null,
                }).eq("id", tenant.id);
                console.log(`✅ Subscription canceled for tenant ${tenant.id}`);
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                if (!invoice.subscription) break;
                const { data: tenant } = await supabaseAdmin
                    .from("tenants").select("id").eq("stripe_subscription_id", invoice.subscription as string).single();
                if (!tenant) break;

                await supabaseAdmin.from("tenants").update({ subscription_status: "past_due" }).eq("id", tenant.id);
                console.log(`⚠️ Payment failed for tenant ${tenant.id}`);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return res.status(200).json({ received: true });
    } catch (error: any) {
        console.error("Webhook handler error:", error);
        return res.status(500).json({ error: error.message });
    }
}