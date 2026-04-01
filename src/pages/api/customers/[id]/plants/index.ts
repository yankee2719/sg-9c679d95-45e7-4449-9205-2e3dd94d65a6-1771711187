import type { NextApiResponse } from "next";
import { getServiceSupabase, type AuthenticatedRequest, withAuth } from "@/lib/apiAuth";

interface PlantPayload {
    name?: string | null;
    code?: string | null;
}

async function resolveCustomer(
    req: AuthenticatedRequest,
    customerId: string,
) {
    const serviceSupabase = getServiceSupabase();

    if (!req.user.organizationId || req.user.organizationType !== "manufacturer") {
        return { serviceSupabase, customer: null, error: "Questa funzione è disponibile solo nel contesto costruttore." };
    }

    const { data: customer, error } = await serviceSupabase
        .from("organizations")
        .select("id, name, type, manufacturer_org_id")
        .eq("id", customerId)
        .eq("type", "customer")
        .eq("manufacturer_org_id", req.user.organizationId)
        .maybeSingle();

    if (error) {
        return { serviceSupabase, customer: null, error: error.message };
    }

    if (!customer) {
        return { serviceSupabase, customer: null, error: "Cliente non trovato." };
    }

    return { serviceSupabase, customer, error: null };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const customerId = typeof req.query.id === "string" ? req.query.id : "";

    if (!customerId) {
        return res.status(400).json({ error: "Missing customer id" });
    }

    const { serviceSupabase, customer, error: customerError } = await resolveCustomer(req, customerId);
    if (customerError) {
        return res.status(customerError === "Cliente non trovato." ? 404 : 403).json({ error: customerError });
    }

    if (req.method === "GET") {
        const { data, error } = await serviceSupabase
            .from("plants")
            .select("id, name, code, organization_id, created_at")
            .eq("organization_id", customerId)
            .order("name", { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(data ?? []);
    }

    if (req.method === "POST") {
        if (!["owner", "admin", "supervisor"].includes(req.user.role)) {
            return res.status(403).json({ error: "Permessi insufficienti." });
        }

        const payload = (req.body ?? {}) as PlantPayload;
        const name = String(payload.name ?? "").trim();
        const code = String(payload.code ?? "").trim();

        if (!name) {
            return res.status(400).json({ error: "Il nome dello stabilimento è obbligatorio." });
        }

        const { data, error } = await serviceSupabase
            .from("plants")
            .insert({
                organization_id: customerId,
                name,
                code: code || null,
            })
            .select("id, name, code, organization_id, created_at")
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(201).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(["owner", "admin", "supervisor", "viewer"], handler);
