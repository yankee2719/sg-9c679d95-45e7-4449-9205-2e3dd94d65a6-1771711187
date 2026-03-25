import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

async function loadPlantContext(
    plantId: string,
    organizationId: string
) {
    const serviceSupabase = getServiceSupabase();

    const [plantRes, linesRes, machinesRes] = await Promise.all([
        serviceSupabase
            .from("plants")
            .select("id, name, code, organization_id")
            .eq("id", plantId)
            .eq("organization_id", organizationId)
            .maybeSingle(),
        serviceSupabase
            .from("production_lines")
            .select("id, name, code, plant_id, organization_id")
            .eq("organization_id", organizationId)
            .eq("plant_id", plantId)
            .order("name"),
        serviceSupabase
            .from("machines")
            .select(
                "id, name, internal_code, lifecycle_state, plant_id, production_line_id, organization_id"
            )
            .eq("organization_id", organizationId)
            .eq("plant_id", plantId)
            .eq("is_archived", false)
            .or("is_deleted.is.null,is_deleted.eq.false")
            .order("name"),
    ]);

    if (plantRes.error) throw plantRes.error;
    if (linesRes.error) throw linesRes.error;
    if (machinesRes.error) throw machinesRes.error;
    if (!plantRes.data) return null;

    return {
        plant: plantRes.data,
        lines: linesRes.data ?? [],
        machines: machinesRes.data ?? [],
    };
}

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;
        const plantId = String(req.query.id || "");

        if (!organizationId || !organizationType) {
            return res.status(400).json({ error: "No active organization context" });
        }

        if (organizationType !== "customer") {
            return res.status(403).json({
                error: "Plants are available only for customer organizations",
            });
        }

        if (!plantId) {
            return res.status(400).json({ error: "Missing plant id" });
        }

        const serviceSupabase = getServiceSupabase();

        try {
            if (req.method === "GET") {
                const data = await loadPlantContext(plantId, organizationId);
                if (!data) {
                    return res.status(404).json({ error: "Plant not found" });
                }
                return res.status(200).json(data);
            }

            if (req.method === "PUT") {
                if (!["owner", "admin", "supervisor"].includes(req.user.role)) {
                    return res.status(403).json({ error: "Not allowed" });
                }

                const existing = await loadPlantContext(plantId, organizationId);
                if (!existing) {
                    return res.status(404).json({ error: "Plant not found" });
                }

                const payload: Record<string, any> = {};
                if (req.body?.name !== undefined) {
                    const name = String(req.body?.name ?? "").trim();
                    if (!name) {
                        return res.status(400).json({ error: "Plant name is required" });
                    }
                    payload.name = name;
                }
                if (req.body?.code !== undefined) {
                    payload.code = String(req.body?.code ?? "").trim() || null;
                }

                if (Object.keys(payload).length === 0) {
                    return res.status(200).json(existing.plant);
                }

                const { data, error } = await serviceSupabase
                    .from("plants")
                    .update(payload)
                    .eq("id", plantId)
                    .eq("organization_id", organizationId)
                    .select("id, name, code, organization_id")
                    .single();

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "plant",
                    entity_id: plantId,
                    action: "update",
                    old_data: {
                        name: existing.plant.name,
                        code: existing.plant.code,
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
            return res.status(500).json({
                error: error?.message || "Internal server error",
            });
        }
    },
    { allowPlatformAdmin: true }
);
