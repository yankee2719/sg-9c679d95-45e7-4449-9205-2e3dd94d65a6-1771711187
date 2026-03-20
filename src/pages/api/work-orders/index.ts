import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const serviceSupabase = getServiceSupabase();
        const organizationId = req.user.organizationId;

        if (!organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        try {
            if (req.method === "GET") {
                const { data, error } = await serviceSupabase
                    .from("work_orders")
                    .select(`
                        id,
                        title,
                        description,
                        status,
                        priority,
                        due_date,
                        machine_id,
                        assigned_to,
                        organization_id,
                        created_at,
                        updated_at
                    `)
                    .eq("organization_id", organizationId)
                    .order("created_at", { ascending: false });

                if (error) return res.status(500).json({ error: error.message });
                return res.status(200).json(data ?? []);
            }

            if (req.method === "POST") {
                if (!["owner", "admin", "supervisor", "technician"].includes(req.user.role)) {
                    return res.status(403).json({ error: "Not allowed" });
                }

                const {
                    title,
                    description,
                    status,
                    priority,
                    due_date,
                    machine_id,
                    assigned_to,
                } = req.body ?? {};

                if (!title?.trim()) {
                    return res.status(400).json({ error: "Title is required" });
                }

                const { data, error } = await serviceSupabase
                    .from("work_orders")
                    .insert({
                        organization_id: organizationId,
                        title: title.trim(),
                        description: description?.trim() || null,
                        status: status || "open",
                        priority: priority || "medium",
                        due_date: due_date || null,
                        machine_id: machine_id || null,
                        assigned_to: assigned_to || null,
                    })
                    .select("*")
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "work_order",
                    entity_id: data.id,
                    action: "create",
                    machine_id: data.machine_id ?? null,
                    new_data: {
                        title: data.title,
                        status: data.status,
                        priority: data.priority,
                    },
                });

                return res.status(201).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Work orders API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);