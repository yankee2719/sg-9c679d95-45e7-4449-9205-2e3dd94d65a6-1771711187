import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

export default withAuth(
    ["owner", "admin", "supervisor", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const supabase = getServiceSupabase();
        const manufacturerOrgId = req.user.organizationId;
        const customerId = typeof req.query.id === "string" ? req.query.id : "";

        if (!manufacturerOrgId || req.user.organizationType !== "manufacturer") {
            return res.status(403).json({ error: "Customer plants API available only for manufacturer context" });
        }

        if (!customerId) {
            return res.status(400).json({ error: "Missing customer id" });
        }

        try {
            const { data: customer, error: customerError } = await supabase
                .from("organizations")
                .select("id, name")
                .eq("id", customerId)
                .eq("type", "customer")
                .eq("manufacturer_org_id", manufacturerOrgId)
                .maybeSingle();

            if (customerError) {
                return res.status(500).json({ error: customerError.message });
            }

            if (!customer) {
                return res.status(404).json({ error: "Customer not found" });
            }

            if (req.method === "GET") {
                const { data, error } = await supabase
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
                    return res.status(403).json({ error: "Not allowed" });
                }

                const name = String(req.body?.name ?? "").trim();
                const code = typeof req.body?.code === "string" ? req.body.code.trim() || null : null;

                if (!name) {
                    return res.status(400).json({ error: "Plant name is required" });
                }

                const { data, error } = await supabase
                    .from("plants")
                    .insert({
                        organization_id: customerId,
                        name,
                        code,
                    })
                    .select("id, name, code, organization_id, created_at")
                    .single();

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                await supabase.from("audit_logs").insert({
                    organization_id: manufacturerOrgId,
                    actor_user_id: req.user.userId,
                    entity_type: "plant",
                    entity_id: data.id,
                    action: "create",
                    new_data: {
                        customer_id: customerId,
                        customer_name: customer.name,
                        name: data.name,
                        code: data.code,
                    },
                });

                return res.status(201).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Customer plants API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true },
);
