import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

export class StripePortalError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "StripePortalError";
        this.statusCode = statusCode;
    }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
});

function resolveBaseUrl(returnUrl?: string | null) {
    const candidate =
        typeof returnUrl === "string" && returnUrl.trim().length > 0
            ? returnUrl.trim()
            : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    return candidate.replace(/\/$/, "");
}

export async function createOrganizationBillingPortalSession(
    serviceSupabase: SupabaseClient,
    organizationId: string,
    returnUrl?: string | null
) {
    if (!organizationId) {
        throw new StripePortalError("No active organization", 400);
    }

    const { data: organization, error } = await serviceSupabase
        .from("organizations")
        .select("id, stripe_customer_id")
        .eq("id", organizationId)
        .maybeSingle();

    if (error) {
        throw new StripePortalError(error.message, 500);
    }

    if (!organization) {
        throw new StripePortalError("Organization not found", 404);
    }

    if (!organization.stripe_customer_id) {
        throw new StripePortalError(
            "No Stripe customer found. Please subscribe first.",
            400
        );
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: organization.stripe_customer_id,
        return_url: `${resolveBaseUrl(returnUrl)}/settings/billing`,
    });

    return { url: session.url };
}

