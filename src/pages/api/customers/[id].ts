import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

export default withAuth(
    ["owner", "admin", "supervisor", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const serviceSupabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;
        const customerId = String(req.query.id || "");

        if (!organizationId || organizationType !== "manufacturer") {
            return res.status(403).json({ error: "Customers API available only for manufacturer" });
        }

        if (!customerId) {
            return res.status(400).json({ error: "Missing customer id" });
        }

        try {
            // Verify customer belongs to this manufacturer
            const { data: customer, error: customerError } = await serviceSupabase
                .from("organizations")
                .select("*")
                .eq("id", customerId)
                .eq("manufacturer_org_id", organizationId)
                .eq("type", "customer")
                .maybeSingle();

            if (customerError) return res.status(500).json({ error: customerError.message });
            if (!customer) return res.status(404).json({ error: "Customer not found" });

            // GET: return customer
            if (req.method === "GET") {
                return res.status(200).json(customer);
            }

            // PUT: update customer
            if (req.method === "PUT") {
                if (!["owner", "admin", "supervisor"].includes(req.user.role)) {
                    return res.status(403).json({ error: "Not allowed" });
                }

                const {
                    name,
                    slug,
                    city,
                    country,
                    email,
                    phone,
                    address_line1,
                    address_line2,
                    province,
                    postal_code,
                    vat_number,
                    fiscal_code,
                    website,
                } = req.body ?? {};

                const payload: Record<string, any> = {};

                if (name !== undefined) payload.name = name?.trim() || customer.name;
                if (slug !== undefined) payload.slug = slug?.trim() || null;
                if (city !== undefined) payload.city = city?.trim() || null;
                if (country !== undefined) payload.country = country?.trim() || null;
                if (email !== undefined) payload.email = email?.trim() || null;
                if (phone !== undefined) payload.phone = phone?.trim() || null;
                if (address_line1 !== undefined) payload.address_line1 = address_line1?.trim() || null;
                if (address_line2 !== undefined) payload.address_line2 = address_line2?.trim() || null;
                if (province !== undefined) payload.province = province?.trim() || null;
                if (postal_code !== undefined) payload.postal_code = postal_code?.trim() || null;
                if (vat_number !== undefined) payload.vat_number = vat_number?.trim() || null;
                if (fiscal_code !== undefined) payload.fiscal_code = fiscal_code?.trim() || null;
                if (website !== undefined) payload.website = website?.trim() || null;

                const { data, error } = await serviceSupabase
                    .from("organizations")
                    .update(payload)
                    .eq("id", customerId)
                    .select("*")
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "organization",
                    entity_id: customerId,
                    action: "update",
                    new_data: payload,
                });

                return res.status(200).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Customer detail API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);
