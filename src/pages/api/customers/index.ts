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

        if (!organizationId || !organizationType) {
            return res.status(400).json({ error: "No active organization context" });
        }

        if (organizationType !== "manufacturer" && !req.user.isPlatformAdmin) {
            return res.status(403).json({ error: "Customers API available only for manufacturer" });
        }

        try {
            if (req.method === "GET") {
                const { data, error } = await serviceSupabase
                    .from("organizations")
                    .select(`
                        id,
                        name,
                        slug,
                        type,
                        manufacturer_org_id,
                        city,
                        country,
                        email,
                        phone,
                        subscription_status,
                        subscription_plan,
                        created_at,
                        is_deleted
                    `)
                    .eq("manufacturer_org_id", organizationId)
                    .eq("type", "customer")
                    .or("is_deleted.is.null,is_deleted.eq.false")
                    .order("created_at", { ascending: false });

                if (error) return res.status(500).json({ error: error.message });
                return res.status(200).json(data ?? []);
            }

            if (req.method === "POST") {
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
                    subscription_status,
                    subscription_plan,
                } = req.body ?? {};

                if (!name?.trim()) {
                    return res.status(400).json({ error: "Customer name is required" });
                }

                const { data, error } = await serviceSupabase
                    .from("organizations")
                    .insert({
                        name: name.trim(),
                        slug: slug?.trim() || null,
                        type: "customer",
                        manufacturer_org_id: organizationId,
                        city: city?.trim() || null,
                        country: country?.trim() || null,
                        email: email?.trim() || null,
                        phone: phone?.trim() || null,
                        subscription_status: subscription_status || "trial",
                        subscription_plan: subscription_plan || "free",
                    })
                    .select("*")
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "organization",
                    entity_id: data.id,
                    action: "create",
                    new_data: {
                        name: data.name,
                        type: data.type,
                    },
                });

                return res.status(201).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Customers API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);