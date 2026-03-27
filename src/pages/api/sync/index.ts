import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    createExecutionFromAssignment,
    completeExecution,
} from "@/lib/server/checklistExecutionService";

interface SyncOperation {
    id: string;
    operation_type?: "create" | "update" | "delete";
    entity_type: string;
    entity_id: string;
    payload: any;
    plant_id?: string | null;
    client_timestamp: string;
    sequence_number?: number;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const serviceSupabase = getServiceSupabase();
        const { operations, plant_id, device_id } = req.body ?? {};

        if (!operations || !Array.isArray(operations) || operations.length === 0) {
            return res.status(400).json({ error: "operations array is required" });
        }

        const sorted = [...operations].sort(
            (a, b) => (a.sequence_number || 0) - (b.sequence_number || 0)
        );

        const results: {
            id: string;
            status: "synced" | "failed" | "conflict";
            error?: string;
        }[] = [];

        for (const op of sorted as SyncOperation[]) {
            try {
                await applyOperation(serviceSupabase, op, req.user);
                results.push({ id: op.id, status: "synced" });
            } catch (err: any) {
                const message = err?.message || "Sync operation failed";
                const isConflict = message.toLowerCase().includes("conflict");
                results.push({
                    id: op.id,
                    status: isConflict ? "conflict" : "failed",
                    error: message,
                });
            }
        }

        const synced = results.filter((r) => r.status === "synced").length;
        const failed = results.filter((r) => r.status === "failed").length;
        const conflicts = results.filter((r) => r.status === "conflict").length;

        await serviceSupabase.from("sync_sessions").insert({
            organization_id: req.user.organizationId,
            plant_id: plant_id || inferPlantId(sorted) || null,
            user_id: req.user.userId,
            device_id: device_id || null,
            operations_synced: synced,
            operations_failed: failed + conflicts,
            conflicts_detected: conflicts,
            status: "completed",
            completed_at: new Date().toISOString(),
        } as any);

        return res.status(200).json({
            success: true,
            results,
            summary: { synced, failed, conflicts, total: operations.length },
        });
    } catch (error) {
        console.error("Sync API Error:", error);
        return res.status(500).json({ error: "Sync failed" });
    }
}

function inferPlantId(operations: SyncOperation[]) {
    for (const op of operations) {
        if (op.plant_id) return op.plant_id;
        if (op.payload?.plant_id) return op.payload.plant_id;
    }
    return null;
}

async function applyOperation(
    supabase: ReturnType<typeof getServiceSupabase>,
    op: SyncOperation,
    user: AuthenticatedRequest["user"]
): Promise<void> {
    switch (op.entity_type) {
        case "checklist_execution_complete": {
            const assignmentId = String(op.payload?.assignment_id ?? "");
            const workOrderId = String(op.payload?.work_order_id ?? "");
            const items = Array.isArray(op.payload?.items) ? op.payload.items : [];
            const notes = op.payload?.notes ?? null;

            if (!assignmentId || !workOrderId) {
                throw new Error("checklist_execution_complete requires assignment_id and work_order_id");
            }

            const created = await createExecutionFromAssignment(supabase, user, {
                assignmentId,
                workOrderId,
            });

            await completeExecution(supabase, user, created.id, {
                items,
                notes,
            });
            break;
        }

        case "work_order": {
            if (op.operation_type === "update") {
                const { data: existing } = await supabase
                    .from("work_orders")
                    .select("is_closed, updated_at")
                    .eq("id", op.entity_id)
                    .single();

                if ((existing as any)?.is_closed) {
                    throw new Error("conflict: work order is closed on server");
                }

                const { error } = await supabase
                    .from("work_orders")
                    .update({
                        ...op.payload,
                        updated_at: new Date().toISOString(),
                    } as any)
                    .eq("id", op.entity_id);

                if (error) throw error;
            }
            break;
        }

        case "checklist": {
            const { work_order_id, checklist, percentage } = op.payload || {};
            const { error } = await supabase
                .from("work_orders")
                .update({
                    checklist,
                    checklist_completion_percentage: percentage,
                } as any)
                .eq("id", work_order_id);
            if (error) throw error;
            break;
        }

        case "machine_event": {
            const { error } = await supabase
                .from("machine_events")
                .insert({
                    ...op.payload,
                    recorded_by: user.userId,
                    recorded_at: op.client_timestamp,
                } as any);
            if (error) throw error;
            break;
        }

        default:
            throw new Error(`Unknown entity_type: ${op.entity_type}`);
    }
}

export default withAuth(ALL_APP_ROLES, handler);
