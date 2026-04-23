import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

export default withAuth(["owner", "admin", "supervisor", "viewer"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const serviceSupabase = getServiceSupabase();
    const customerId = typeof req.query.id === "string" ? req.query.id : "";

    if (!customerId) {
        return res.status(400).json({ error: "Missing customer id" });
    }

    if (!req.user.organizationId || req.user.organizationType !== "manufacturer") {
        return res.status(403).json({ error: "Customer assignments view is available only for manufacturer context" });
    }

    const { data: customer, error: customerError } = await serviceSupabase
        .from("organizations")
        .select("id")
        .eq("id", customerId)
        .eq("type", "customer")
        .eq("manufacturer_org_id", req.user.organizationId)
        .maybeSingle();

    if (customerError) {
        return res.status(500).json({ error: customerError.message });
    }

    if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
    }

    const { data, error } = await serviceSupabase
        .from("machine_assignments")
        .select("id, machine_id, customer_org_id, manufacturer_org_id, assigned_at, assigned_by, is_active")
        .eq("manufacturer_org_id", req.user.organizationId)
        .eq("customer_org_id", customerId)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data ?? []);
});

