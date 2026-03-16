import type { NextApiResponse } from "next";
import {
    withAuth,
    type AuthenticatedRequest,
    getSupabaseAdmin,
} from "@/lib/middleware/auth";

function normalizeWorkType(value: unknown) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["preventive", "corrective", "predictive", "inspection", "emergency"].includes(normalized)) {
        return normalized;
    }
    return "preventive";
}

function mapWorkOrder(row: any) {
    return {
        ...row,
        wo_number: row.wo_number || `WO-${String(row.id).slice(0, 8).toUpperCase()}`,
        wo_type: row.wo_type || row.work_type,
        scheduled_start: row.scheduled_start || row.scheduled_start_time || null,
        scheduled_end: row.scheduled_end || null,
    };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const supabase = getSupabaseAdmin();
    const organizationId = req.user.organization_id;

    if (!organizationId) {
        return res.status(400).json({ error: "Active organization not found" });
    }

    try {
        if (req.method === "POST") {
            const body = req.body ?? {};
            const machineId = body.machine_id || body.equipment_id || null;
            const title = typeof body.title === "string" ? body.title.trim() : "";

            if (!machineId || !title) {
                return res.status(400).json({
                    error: "machine_id and title are required",
                });
            }

            const { data: machine, error: machineError } = await supabase
                .from("machines")
                .select("id, plant_id, organization_id")
                .eq("id", machineId)
                .eq("organization_id", organizationId)
                .maybeSingle();

            if (machineError) {
                return res.status(500).json({ error: machineError.message });
            }

            if (!machine) {
                return res.status(404).json({ error: "Machine not found in active organization" });
            }

            const payload = {
                organization_id: organizationId,
                machine_id: machine.id,
                plant_id: body.plant_id || machine.plant_id || null,
                maintenance_plan_id: body.maintenance_plan_id || null,
                title,
                description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
                work_type: normalizeWorkType(body.work_type || body.wo_type),
                priority: body.priority || "medium",
                status: body.status || "draft",
                scheduled_date: body.scheduled_date || null,
                scheduled_start_time: body.scheduled_start || body.scheduled_start_time || null,
                due_date: body.due_date || body.scheduled_end || null,
                assigned_to: body.assigned_to || null,
                created_by: req.user.id,
                notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
            };

            const { data, error } = await supabase
                .from("work_orders")
                .insert(payload)
                .select("*")
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            return res.status(201).json({
                success: true,
                message: "Work order created successfully",
                workOrder: mapWorkOrder(data),
            });
        }

        if (req.method === "GET") {
            const machineId =
                (typeof req.query.machine_id === "string" && req.query.machine_id) ||
                (typeof req.query.equipment_id === "string" && req.query.equipment_id) ||
                null;
            const myOrders = req.query.my_orders === "true";
            const status = req.query.status;

            let query = supabase
                .from("work_orders")
                .select("*")
                .eq("organization_id", organizationId)
                .order("created_at", { ascending: false });

            if (myOrders) {
                query = query.eq("assigned_to", req.user.id);
            }

            if (machineId) {
                query = query.eq("machine_id", machineId);
            }

            if (status) {
                if (Array.isArray(status)) {
                    query = query.in("status", status);
                } else {
                    query = query.eq("status", status);
                }
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            const workOrders = (data ?? []).map(mapWorkOrder);

            return res.status(200).json({
                success: true,
                workOrders,
                total: workOrders.length,
            });
        }

        return res.status(405).json({
            error: "Method not allowed",
            allowedMethods: ["GET", "POST"],
        });
    } catch (error) {
        console.error("Work Orders API Error:", error);

        return res.status(500).json({
            success: false,
            error: "Operation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(handler);
