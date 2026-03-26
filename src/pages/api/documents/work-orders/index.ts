import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

type WorkOrderRow = {
    id: string;
    organization_id: string;
    machine_id: string | null;
    plant_id: string | null;
    title: string | null;
    description: string | null;
    status: string | null;
    priority: string | null;
    work_type: string | null;
    assigned_to: string | null;
    due_date: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    estimated_duration_minutes: number | null;
    created_at: string | null;
};

const ALLOWED_PRIORITIES = ["low", "medium", "high", "critical"] as const;
const ALLOWED_WORK_TYPES = [
    "preventive",
    "corrective",
    "predictive",
    "inspection",
    "emergency",
] as const;

function normalizePriority(value: unknown) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ALLOWED_PRIORITIES.includes(normalized as (typeof ALLOWED_PRIORITIES)[number])
        ? normalized
        : "medium";
}

function normalizeWorkType(value: unknown) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ALLOWED_WORK_TYPES.includes(normalized as (typeof ALLOWED_WORK_TYPES)[number])
        ? normalized
        : "preventive";
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();
    const organizationId = req.user.organizationId;

    if (!organizationId) {
        return res.status(400).json({ success: false, error: "No active organization context" });
    }

    try {
        if (req.method === "GET") {
            const rawMachineId = req.query.machine_id ?? req.query.equipment_id;
            const machineId = typeof rawMachineId === "string" ? rawMachineId : null;
            const status = typeof req.query.status === "string" ? req.query.status : null;
            const myOrders = req.query.my_orders === "true";

            let query = serviceSupabase
                .from("work_orders")
                .select(
                    `id, organization_id, machine_id, plant_id, title, description, status, priority, work_type, assigned_to, due_date, scheduled_start, scheduled_end, estimated_duration_minutes, created_at`
                )
                .eq("organization_id", organizationId)
                .order("created_at", { ascending: false });

            if (myOrders) {
                query = query.eq("assigned_to", req.user.userId);
            }

            if (machineId) {
                query = query.eq("machine_id", machineId);
            }

            if (status) {
                query = query.eq("status", status);
            }

            const { data, error } = await query;
            if (error) throw error;

            return res.status(200).json({
                success: true,
                workOrders: (data ?? []) as WorkOrderRow[],
                total: data?.length ?? 0,
            });
        }

        if (req.method === "POST") {
            if (!["owner", "admin", "supervisor", "technician"].includes(req.user.role)) {
                return res.status(403).json({ success: false, error: "Not allowed" });
            }

            const body = req.body ?? {};
            const machineId = body.machine_id ?? body.equipment_id ?? null;

            if (!machineId || !body.title) {
                return res.status(400).json({
                    success: false,
                    error: "machine_id/equipment_id and title are required",
                });
            }

            const { data: machine, error: machineError } = await serviceSupabase
                .from("machines")
                .select("id, organization_id, plant_id")
                .eq("id", machineId)
                .eq("organization_id", organizationId)
                .maybeSingle();

            if (machineError) throw machineError;
            if (!machine) {
                return res.status(404).json({ success: false, error: "Machine not found" });
            }

            const payload = {
                organization_id: organizationId,
                machine_id: machine.id,
                plant_id: body.plant_id ?? machine.plant_id ?? null,
                title: String(body.title).trim(),
                description: body.description ? String(body.description).trim() : null,
                priority: normalizePriority(body.priority),
                status: body.status ? String(body.status).trim().toLowerCase() : "draft",
                work_type: normalizeWorkType(body.work_type ?? body.wo_type),
                due_date: body.due_date ?? null,
                scheduled_start: body.scheduled_start ?? null,
                scheduled_end: body.scheduled_end ?? null,
                assigned_to: body.assigned_to ?? null,
                estimated_duration_minutes: body.estimated_duration_minutes ?? null,
                created_by: req.user.userId,
            };

            const { data, error } = await serviceSupabase
                .from("work_orders")
                .insert(payload)
                .select(
                    `id, organization_id, machine_id, plant_id, title, description, status, priority, work_type, assigned_to, due_date, scheduled_start, scheduled_end, estimated_duration_minutes, created_at`
                )
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                message: "Work order created successfully",
                workOrder: data as WorkOrderRow,
            });
        }

        return res.status(405).json({ success: false, error: "Method not allowed" });
    } catch (error) {
        console.error("Documents work-orders API error:", error);
        return res.status(500).json({
            success: false,
            error: "Operation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

