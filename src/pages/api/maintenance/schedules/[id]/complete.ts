import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    calculateNextDueDate,
    getAccessiblePlan,
    serializePlanAsLegacySchedule,
} from "@/lib/server/maintenanceScheduleCompat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const serviceSupabase = getServiceSupabase();
    const { id } = req.query;

    if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Schedule ID is required" });
    }

    try {
        const plan = await getAccessiblePlan(serviceSupabase, req.user, id);
        if (!plan) {
            return res.status(404).json({ error: "Maintenance schedule not found" });
        }

        const {
            notes,
            duration_minutes,
            checklist_execution_id,
            parts_used,
            cost,
        } = req.body ?? {};

        const completedAt = new Date().toISOString();
        const nextDueDate = calculateNextDueDate(
            (plan as any).frequency_type || "monthly",
            Number((plan as any).frequency_value ?? 1),
            new Date()
        );

        const { data: workOrder, error: workOrderError } = await serviceSupabase
            .from("work_orders")
            .insert({
                organization_id: (plan as any).organization_id,
                machine_id: (plan as any).machine_id ?? null,
                plant_id: null,
                maintenance_plan_id: id,
                title: (plan as any).title,
                description: typeof notes === "string" && notes.trim() ? notes.trim() : (plan as any).description ?? null,
                work_type: "preventive",
                priority: (plan as any).priority || "medium",
                status: "completed",
                due_date: (plan as any).next_due_date ?? null,
                scheduled_date: (plan as any).next_due_date ?? null,
                assigned_to: (plan as any).default_assignee_id ?? null,
                completed_at: completedAt,
                completed_by: req.user.userId,
                actual_duration_minutes: typeof duration_minutes === "number" ? duration_minutes : null,
                work_performed: typeof notes === "string" && notes.trim() ? notes.trim() : null,
                notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
                spare_parts_used: parts_used ?? null,
                total_cost: typeof cost === "number" ? cost : null,
            } as any)
            .select("id, completed_at, actual_duration_minutes, notes, status")
            .single();

        if (workOrderError) throw workOrderError;

        const { data: updatedPlan, error: updateError } = await serviceSupabase
            .from("maintenance_plans")
            .update({
                last_executed_at: completedAt,
                next_due_date: nextDueDate,
                updated_at: completedAt,
                is_active: true,
            })
            .eq("id", id)
            .select("*")
            .single();

        if (updateError) throw updateError;

        if (typeof checklist_execution_id === "string" && checklist_execution_id.trim()) {
            await serviceSupabase
                .from("checklist_executions")
                .update({ work_order_id: (workOrder as any).id })
                .eq("id", checklist_execution_id.trim())
                .then(() => undefined)
                .catch((error) => {
                    console.error("Checklist execution link update failed:", error);
                });
        }

        const schedule = await serializePlanAsLegacySchedule(serviceSupabase, updatedPlan, {
            includeRecentLogs: false,
        });

        return res.status(200).json({
            success: true,
            data: {
                schedule,
                log: {
                    id: (workOrder as any).id,
                    schedule_id: id,
                    equipment_id: (plan as any).machine_id ?? null,
                    performed_by: req.user.userId,
                    completed_at: (workOrder as any).completed_at,
                    notes: (workOrder as any).notes ?? null,
                    duration_minutes: (workOrder as any).actual_duration_minutes ?? null,
                    checklist_execution_id: typeof checklist_execution_id === "string" ? checklist_execution_id : null,
                    parts_used: parts_used ?? null,
                    cost: typeof cost === "number" ? cost : null,
                    status: (workOrder as any).status,
                },
                next_due_date: nextDueDate,
            },
        });
    } catch (error) {
        console.error("Maintenance complete compatibility error:", error);
        return res.status(500).json({
            error: "Failed to complete maintenance",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
}

export default withAuth(ALL_APP_ROLES, handler);

