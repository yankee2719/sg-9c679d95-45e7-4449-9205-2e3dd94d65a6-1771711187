import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";
import {
    completeExecution,
    createExecutionFromAssignment,
    type ChecklistExecutionItemInput,
} from "@/lib/server/checklistExecutionService";

interface SyncOperation {
    id: string;
    operation_type: "create" | "update" | "delete";
    entity_type: string;
    entity_id: string;
    payload: any;
    client_timestamp: string;
    sequence_number?: number;
}

async function applyOperation(supabase: any, op: SyncOperation, req: AuthenticatedRequest) {
    switch (op.entity_type) {
        case "work_order": {
            if (op.operation_type !== "update") {
                throw new Error("Unsupported work_order sync operation.");
            }

            const { data: existing, error: existingError } = await supabase
                .from("work_orders")
                .select("id, status, updated_at")
                .eq("id", op.entity_id)
                .maybeSingle();

            if (existingError) throw existingError;
            if (!existing) throw new Error("Work order not found.");
            if (["completed", "approved", "cancelled"].includes((existing as any).status)) {
                throw new Error("conflict: work order is already closed on server");
            }

            const { error } = await supabase
                .from("work_orders")
                .update({ ...(op.payload ?? {}), updated_at: new Date().toISOString() })
                .eq("id", op.entity_id);

            if (error) throw error;
            return;
        }

        case "machine_event": {
            const { error } = await supabase
                .from("machine_events")
                .insert({
                    ...(op.payload ?? {}),
                    recorded_by: req.user.userId,
                    recorded_at: op.client_timestamp || new Date().toISOString(),
                });
            if (error) throw error;
            return;
        }

        case "checklist_execution_complete": {
            const assignmentId = `${op.payload?.assignment_id ?? ""}`.trim();
            if (!assignmentId) {
                throw new Error("assignment_id is required for checklist_execution_complete");
            }

            const execution = await createExecutionFromAssignment(supabase, req.user, {
                assignmentId,
                workOrderId: op.payload?.work_order_id ?? null,
            });

            const items = Array.isArray(op.payload?.items)
                ? (op.payload.items as ChecklistExecutionItemInput[])
                : [];

            await completeExecution(supabase, req.user, execution.id, {
                items,
                notes: op.payload?.notes ?? null,
                overall_status: op.payload?.overall_status ?? null,
            });
            return;
        }

        default:
            throw new Error(`Unknown entity_type: ${op.entity_type}`);
    }
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const supabase = getServiceSupabase();
        const operations = Array.isArray(req.body?.operations) ? (req.body.operations as SyncOperation[]) : [];
        const plantId = typeof req.body?.plant_id === "string" ? req.body.plant_id : null;
        const deviceId = typeof req.body?.device_id === "string" ? req.body.device_id : null;

        if (operations.length === 0) {
            return res.status(400).json({ error: "operations array is required" });
        }

        const results: Array<{ id: string; status: "synced" | "failed" | "conflict"; error?: string }> = [];
        const sorted = [...operations].sort((a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0));

        for (const operation of sorted) {
            try {
                await applyOperation(supabase, operation, req);
                results.push({ id: operation.id, status: "synced" });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Sync operation failed";
                results.push({
                    id: operation.id,
                    status: message.toLowerCase().includes("conflict") ? "conflict" : "failed",
                    error: message,
                });
            }
        }

        const summary = {
            synced: results.filter((row) => row.status === "synced").length,
            failed: results.filter((row) => row.status === "failed").length,
            conflicts: results.filter((row) => row.status === "conflict").length,
            total: operations.length,
        };

        await supabase.from("sync_sessions").insert({
            organization_id: req.user.organizationId,
            plant_id: plantId,
            user_id: req.user.userId,
            device_id: deviceId,
            operations_synced: summary.synced,
            operations_failed: summary.failed + summary.conflicts,
            conflicts_detected: summary.conflicts,
            status: summary.failed === 0 && summary.conflicts === 0 ? "completed" : "completed_with_errors",
            completed_at: new Date().toISOString(),
        } as any).then(() => undefined).catch((error) => {
            console.error("Sync session log failed:", error);
        });

        return res.status(200).json({ success: true, results, summary });
    } catch (error) {
        console.error("Sync API error:", error);
        return res.status(500).json({ error: error instanceof Error ? error.message : "Sync failed" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
