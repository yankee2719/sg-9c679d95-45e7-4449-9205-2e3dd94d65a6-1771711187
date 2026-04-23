import type { NextApiResponse } from "next";
import { withAuth, ALL_APP_ROLES, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { hasMinimumRole } from "@/lib/roles";

export default withAuth(
    ALL_APP_ROLES,
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const supabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const organizationType = req.user.organizationType;

        if (!organizationId || organizationType !== "customer") {
            return res.status(403).json({ error: "Plants are available only in customer organization context" });
        }

        try {
            if (req.method === "GET") {
                const [plantsRes, linesRes, machinesRes] = await Promise.all([
                    supabase
                        .from("plants")
                        .select("id, name, code, organization_id")
                        .eq("organization_id", organizationId)
                        .order("name"),
                    supabase
                        .from("production_lines")
                        .select("id, name, code, plant_id, organization_id")
                        .eq("organization_id", organizationId)
                        .order("name"),
                    supabase
                        .from("machines")
                        .select("id, name, internal_code, lifecycle_state, plant_id, production_line_id")
                        .eq("organization_id", organizationId)
                        .eq("is_archived", false)
                        .or("is_deleted.is.null,is_deleted.eq.false"),
                ]);

                if (plantsRes.error) return res.status(500).json({ error: plantsRes.error.message });
                if (linesRes.error) return res.status(500).json({ error: linesRes.error.message });
                if (machinesRes.error) return res.status(500).json({ error: machinesRes.error.message });

                return res.status(200).json({
                    plants: plantsRes.data ?? [],
                    lines: linesRes.data ?? [],
                    machines: machinesRes.data ?? [],
                });
            }

            if (req.method === "POST") {
                if (!hasMinimumRole(req.user.role, "supervisor")) {
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
                    .insert({
                        organization_id: organizationId,
                        name,
                        code,
                    })
                    .select("id, name, code, organization_id")
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                await supabase.from("audit_logs").insert({
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
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);
