import type { NextApiResponse } from "next";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const supabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;
        const plantId = String(req.query.id || "");

        if (!organizationId || organizationType !== "customer") {
            return res.status(403).json({ error: "Plants are available only in customer organization context" });
        }

        if (!plantId) {
            return res.status(400).json({ error: "Missing plant id" });
        }

        try {
            const { data: plant, error: plantError } = await supabase
                .from("plants")
                .select("id, name, code, organization_id")
                .eq("id", plantId)
                .eq("organization_id", organizationId)
                .maybeSingle();

            if (plantError) return res.status(500).json({ error: plantError.message });
            if (!plant) return res.status(404).json({ error: "Plant not found" });

            if (req.method === "GET") {
                const [linesRes, machinesRes] = await Promise.all([
                    supabase
                        .from("production_lines")
                        .select("id, name, code, plant_id, organization_id")
                        .eq("organization_id", organizationId)
                        .eq("plant_id", plantId)
                        .order("name"),
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, lifecycle_state, plant_id, production_line_id")
                        .eq("organization_id", organizationId)
                        .eq("plant_id", plantId)
                        .eq("is_archived", false)
                        .or("is_deleted.is.null,is_deleted.eq.false"),
                ]);

                if (linesRes.error) return res.status(500).json({ error: linesRes.error.message });
                if (machinesRes.error) return res.status(500).json({ error: machinesRes.error.message });

                return res.status(200).json({
                    plant,
                    lines: linesRes.data ?? [],
                    machines: machinesRes.data ?? [],
                });
            }

            if (req.method === "PUT") {
                if (!["owner", "admin", "supervisor"].includes(req.user.role)) {
                    return res.status(403).json({ error: "Not allowed" });
                }

                const name = String(req.body?.name ?? "").trim();
                const codeRaw = req.body?.code;
                const code = typeof codeRaw === "string" ? codeRaw.trim() || null : null;

                if (!name) {
                    return res.status(400).json({ error: "Plant name is required" });
                }

                const { data, error } = await supabase
                    .from("plants")
                    .update({ name, code })
                    .eq("id", plantId)
                    .eq("organization_id", organizationId)
                    .select("id, name, code, organization_id")
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                await supabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "plant",
                    entity_id: plantId,
                    action: "update",
                    old_data: {
                        name: plant.name,
                        code: plant.code,
                    },
                    new_data: {
                        name: data.name,
                        code: data.code,
                    },
                });

                return res.status(200).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Plant detail API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);
