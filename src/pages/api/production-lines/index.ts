import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const supabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;

        if (!organizationId || organizationType !== "customer") {
            return res.status(403).json({ error: "Production lines are available only in customer organization context" });
        }

        try {
            if (req.method !== "POST") {
                return res.status(405).json({ error: "Method not allowed" });
            }

            if (!["owner", "admin", "supervisor"].includes(req.user.role)) {
                return res.status(403).json({ error: "Not allowed" });
            }

            const plantId = String(req.body?.plant_id ?? "").trim();
            const name = String(req.body?.name ?? "").trim();
            const codeRaw = req.body?.code;
            const code = typeof codeRaw === "string" ? codeRaw.trim() || null : null;

            if (!plantId) {
                return res.status(400).json({ error: "plant_id is required" });
            }

            if (!name) {
                return res.status(400).json({ error: "Line name is required" });
            }

            const { data: plant, error: plantError } = await supabase
                .from("plants")
                .select("id")
                .eq("id", plantId)
                .eq("organization_id", organizationId)
                .maybeSingle();

            if (plantError) return res.status(500).json({ error: plantError.message });
            if (!plant) return res.status(404).json({ error: "Plant not found" });

            const { data, error } = await supabase
                .from("production_lines")
                .insert({
                    organization_id: organizationId,
                    plant_id: plantId,
                    name,
                    code,
                })
                .select("id, name, code, plant_id, organization_id")
                .single();

            if (error) return res.status(500).json({ error: error.message });

            await supabase.from("audit_logs").insert({
                organization_id: organizationId,
                actor_user_id: req.user.userId,
                entity_type: "production_line",
                entity_id: data.id,
                action: "create",
                new_data: {
                    plant_id: data.plant_id,
                    name: data.name,
                    code: data.code,
                },
            });

            return res.status(201).json(data);
        } catch (error: any) {
            console.error("Production lines API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);
