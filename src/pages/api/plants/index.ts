import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

type PlantRow = {
    id: string;
    name: string | null;
    code: string | null;
    organization_id: string;
    created_at?: string | null;
    updated_at?: string | null;
};

type ProductionLineRow = {
    id: string;
    name: string | null;
    code: string | null;
    plant_id: string | null;
};

type MachineRow = {
    id: string;
    plant_id: string | null;
};

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const serviceSupabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;

        if (!organizationId || !organizationType) {
            return res.status(400).json({ error: "No active organization context" });
        }

        if (organizationType !== "customer") {
            return res.status(403).json({
                error: "Plants are available only for customer organizations",
            });
        }

        try {
            if (req.method === "GET") {
                const [plantsRes, linesRes, machinesRes] = await Promise.all([
                    serviceSupabase
                        .from("plants")
                        .select("id, name, code, organization_id")
                        .eq("organization_id", organizationId)
                        .order("name"),
                    serviceSupabase
                        .from("production_lines")
                        .select("id, name, code, plant_id")
                        .eq("organization_id", organizationId)
                        .order("name"),
                    serviceSupabase
                        .from("machines")
                        .select("id, plant_id")
                        .eq("organization_id", organizationId)
                        .eq("is_archived", false)
                        .or("is_deleted.is.null,is_deleted.eq.false"),
                ]);

                if (plantsRes.error) {
                    return res.status(500).json({ error: plantsRes.error.message });
                }
                if (linesRes.error) {
                    return res.status(500).json({ error: linesRes.error.message });
                }
                if (machinesRes.error) {
                    return res.status(500).json({ error: machinesRes.error.message });
                }

                const plants = (plantsRes.data ?? []) as PlantRow[];
                const lines = (linesRes.data ?? []) as ProductionLineRow[];
                const machines = (machinesRes.data ?? []) as MachineRow[];

                const linesByPlant = new Map < string, ProductionLineRow[]> ();
                const machineCountByPlant = new Map < string, number> ();

                for (const line of lines) {
                    if (!line.plant_id) continue;
                    const current = linesByPlant.get(line.plant_id) ?? [];
                    current.push(line);
                    linesByPlant.set(line.plant_id, current);
                }

                for (const machine of machines) {
                    if (!machine.plant_id) continue;
                    machineCountByPlant.set(
                        machine.plant_id,
                        (machineCountByPlant.get(machine.plant_id) ?? 0) + 1
                    );
                }

                const response = plants.map((plant) => {
                    const plantLines = linesByPlant.get(plant.id) ?? [];
                    return {
                        ...plant,
                        lines: plantLines,
                        lines_count: plantLines.length,
                        machines_count: machineCountByPlant.get(plant.id) ?? 0,
                    };
                });

                return res.status(200).json(response);
            }

            if (req.method === "POST") {
                if (!["owner", "admin", "supervisor"].includes(req.user.role)) {
                    return res.status(403).json({ error: "Not allowed" });
                }

                const name = String(req.body?.name ?? "").trim();
                const code = String(req.body?.code ?? "").trim() || null;

                if (!name) {
                    return res.status(400).json({ error: "Plant name is required" });
                }

                const { data, error } = await serviceSupabase
                    .from("plants")
                    .insert({
                        organization_id: organizationId,
                        name,
                        code,
                    })
                    .select("id, name, code, organization_id")
                    .single();

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "plant",
                    entity_id: data.id,
                    action: "create",
                    new_data: {
                        name: data.name,
                        code: data.code,
                    },
                });

                return res.status(201).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Plants API error:", error);
            return res.status(500).json({
                error: error?.message || "Internal server error",
            });
        }
    },
    { allowPlatformAdmin: true }
);
