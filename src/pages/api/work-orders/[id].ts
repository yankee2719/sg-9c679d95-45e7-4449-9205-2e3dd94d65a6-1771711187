import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

const ALLOWED_STATUSES = [
    "draft",
    "scheduled",
    "in_progress",
    "pending_review",
    "completed",
    "cancelled",
] as const;

const ALLOWED_PRIORITIES = ["low", "medium", "high", "critical"] as const;

function normalizeStatus(value: unknown, fallback: string) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ALLOWED_STATUSES.includes(normalized as (typeof ALLOWED_STATUSES)[number])
        ? normalized
        : fallback;
}

function normalizePriority(value: unknown, fallback: string) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ALLOWED_PRIORITIES.includes(normalized as (typeof ALLOWED_PRIORITIES)[number])
        ? normalized
        : fallback;
}

export default withAuth(
    ["owner", "admin", "supervisor", "technician", "viewer"],
    async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
        const serviceSupabase = getServiceSupabase();
        const organizationId = req.user.organizationId;
        const workOrderId = String(req.query.id || "");

        if (!organizationId) {
            return res.status(400).json({ error: "No active organization context" });
        }

        if (!workOrderId) {
            return res.status(400).json({ error: "Missing work order id" });
        }

        try {
            const { data: row, error: rowError } = await serviceSupabase
                .from("work_orders")
                .select("*")
                .eq("id", workOrderId)
                .eq("organization_id", organizationId)
                .maybeSingle();

            if (rowError) return res.status(500).json({ error: rowError.message });
            if (!row) return res.status(404).json({ error: "Work order not found" });

            if (req.method === "GET") {
                return res.status(200).json(row);
            }

            if (req.method === "PUT") {
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

                const payload = {
                    title: title !== undefined ? title?.trim() || row.title : row.title,
                    description:
                        description !== undefined
                            ? description?.trim() || null
                            : row.description,
                    status: normalizeStatus(status, row.status || "draft"),
                    priority: normalizePriority(priority, row.priority || "medium"),
                    due_date: due_date !== undefined ? due_date || null : row.due_date,
                    machine_id: machine_id !== undefined ? machine_id || null : row.machine_id,
                    assigned_to:
                        assigned_to !== undefined ? assigned_to || null : row.assigned_to,
                    updated_at: new Date().toISOString(),
                };

                const { data, error } = await serviceSupabase
                    .from("work_orders")
                    .update(payload)
                    .eq("id", workOrderId)
                    .eq("organization_id", organizationId)
                    .select("*")
                    .single();

                if (error) return res.status(500).json({ error: error.message });

                await serviceSupabase.from("audit_logs").insert({
                    organization_id: organizationId,
                    actor_user_id: req.user.userId,
                    entity_type: "work_order",
                    entity_id: data.id,
                    action: "update",
                    machine_id: data.machine_id ?? null,
                    old_data: {
                        title: row.title,
                        status: row.status,
                        priority: row.priority,
                        due_date: row.due_date,
                        assigned_to: row.assigned_to,
                    },
                    new_data: {
                        title: data.title,
                        status: data.status,
                        priority: data.priority,
                        due_date: data.due_date,
                        assigned_to: data.assigned_to,
                    },
                });

                return res.status(200).json(data);
            }

            return res.status(405).json({ error: "Method not allowed" });
        } catch (error: any) {
            console.error("Work order detail API error:", error);
            return res.status(500).json({ error: error?.message || "Internal server error" });
        }
    },
    { allowPlatformAdmin: true }
);