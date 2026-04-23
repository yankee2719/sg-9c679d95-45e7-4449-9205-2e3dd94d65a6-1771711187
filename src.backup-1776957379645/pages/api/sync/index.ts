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
            if (["completed", "cancelled"].includes((existing as any).status)) {
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
            const payload = op.payload ?? {};
            const machineId = typeof payload.machine_id === "string" ? payload.machine_id : null;
            const eventType = typeof payload.event_type === "string" ? payload.event_type : null;

            if (!machineId || !eventType) {
                throw new Error("machine_id and event_type are required for machine_event");
            }

            if (!req.user.organizationId) {
                throw new Error("No active organization context");
            }

            const { error } = await supabase.rpc("insert_machine_event", {
                p_actor_type: "user",
                p_event_type: eventType,
                p_machine_id: machineId,
                p_organization_id: req.user.organizationId,
                p_payload: {
                    ...(payload.payload ?? {}),
                    client_timestamp: op.client_timestamp || new Date().toISOString(),
                    source: "offline_sync",
                },
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

        return res.status(200).json({ success: true, results, summary });
    } catch (error) {
        console.error("Sync API error:", error);
        return res.status(500).json({ error: error instanceof Error ? error.message : "Sync failed" });
    }
}

export default withAuth(ALL_APP_ROLES, handler);
