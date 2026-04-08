import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    assertCanReferenceMachine,
    listLegacySchedules,
    parseLegacyFrequency,
    serializePlanAsLegacySchedule,
    upsertSinglePlanChecklist,
} from "@/lib/server/maintenanceScheduleCompat";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    const serviceSupabase = getServiceSupabase();

    if (req.method === "GET") {
        try {
            const result = await listLegacySchedules(serviceSupabase, req.user, req.query);

            return res.status(200).json({
                success: true,
                data: result.rows,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / result.limit) || 1,
                },
            });
        } catch (error) {
            console.error("Maintenance schedules compatibility list error:", error);
            return res.status(500).json({
                error: "Failed to list maintenance schedules",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    if (req.method === "POST") {
        if (!["admin", "supervisor"].includes(req.user.role)) {
            return res.status(403).json({
                error: "Only admins and supervisors can create schedules",
            });
        }

        try {
            const {
                equipment_id,
                title,
                description,
                frequency,
                next_due_date,
                assigned_to,
                checklist_id,
                priority,
                estimated_duration_minutes,
                notes,
            } = req.body ?? {};

            if (!equipment_id || typeof equipment_id !== "string" || !title || typeof title !== "string") {
                return res.status(400).json({
                    error: "equipment_id and title are required",
                });
            }

            if (!req.user.organizationId) {
                return res.status(400).json({ error: "Active organization is required" });
            }

            const machine = await assertCanReferenceMachine(serviceSupabase, req.user, equipment_id);
            if (!machine) {
                return res.status(404).json({ error: "Equipment not found" });
            }

            const normalizedFrequency = parseLegacyFrequency(frequency);

            const { data: inserted, error: insertError } = await serviceSupabase
                .from("maintenance_plans")
                .insert({
                    organization_id: req.user.organizationId,
                    machine_id: equipment_id,
                    title: title.trim(),
                    description: typeof description === "string" && description.trim() ? description.trim() : null,
                    frequency_type: normalizedFrequency.frequency_type,
                    frequency_value: normalizedFrequency.frequency_value,
                    estimated_duration_minutes:
                        typeof estimated_duration_minutes === "number" ? estimated_duration_minutes : null,
                    instructions: typeof notes === "string" && notes.trim() ? notes.trim() : null,
                    safety_notes: null,
                    priority: typeof priority === "string" && priority ? priority : "medium",
                    default_assignee_id: typeof assigned_to === "string" && assigned_to ? assigned_to : null,
                    next_due_date:
                        typeof next_due_date === "string" && next_due_date ? new Date(next_due_date).toISOString() : null,
                    created_by: req.user.userId,
                    is_active: true,
                } as any)
                .select("*")
                .single();

            if (insertError) throw insertError;

            await upsertSinglePlanChecklist(
                serviceSupabase,
                (inserted as any).id,
                req.user.organizationId,
                typeof checklist_id === "string" ? checklist_id : null
            );

            const payload = await serializePlanAsLegacySchedule(serviceSupabase, inserted, {
                includeRecentLogs: false,
            });

            return res.status(201).json({ success: true, data: payload });
        } catch (error) {
            console.error("Maintenance schedules compatibility create error:", error);
            return res.status(500).json({
                error: "Failed to create maintenance schedule",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export default withAuth(ALL_APP_ROLES, handler);

