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

const WORK_ORDER_MUTABLE_FIELDS = new Set([
    "assigned_to",
    "actual_duration_minutes",
    "description",
    "due_date",
    "findings",
    "labor_cost",
    "notes",
    "parts_cost",
    "photos",
    "priority",
    "scheduled_date",
    "scheduled_start_time",
    "signature_data",
    "spare_parts_used",
    "started_at",
    "status",
    "title",
    "total_cost",
    "work_performed",
]);

const ALLOWED_WORK_ORDER_STATUSES = new Set([
    "draft",
    "scheduled",
    "in_progress",
    "pending_review",
    "completed",
    "cancelled",
]);

function sanitizeWorkOrderPayload(payload: Record<string, unknown>) {
    const next: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload ?? {})) {
        if (!WORK_ORDER_MUTABLE_FIELDS.has(key)) continue;
        if (key === "status") {
            if (typeof value === "string" && ALLOWED_WORK_ORDER_STATUSES.has(value)) {
                next.status = value;
            }
            continue;
        }
        next[key] = value;
    }

    if (next.status === "completed" && !next.completed_at) {
        next.completed_at = new Date().toISOString();
    }

    next.updated_at = new Date().toISOString();
    return next;
}

async function syncWorkOrder(supabase: any, op: SyncOperation, req: AuthenticatedRequest) {
    if (op.operation_type !== "update") {
        throw new Error("Unsupported work_order sync operation.");
    }

    if (!req.user.organizationId) {
        throw new Error("Active organization is required.");
    }

    const { data: existing, error: existingError } = await supabase
        .from("work_orders")
        .select("id, organization_id, status")
        .eq("id", op.entity_id)
        .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) throw new Error("Work order not found.");
    if ((existing as any).organization_id !== req.user.organizationId) {
        throw new Error("conflict: work order belongs to another organization context");
    }
    if (["completed", "cancelled"].includes((existing as any).status)) {
        throw new Error("conflict: work order is already closed on server");
    }

    const updatePayload = sanitizeWorkOrderPayload((op.payload ?? {}) as Record<string, unknown>);
    if (Object.keys(updatePayload).length === 1 && updatePayload.updated_at) {
        throw new Error("Nothing to sync for work order.");
    }

    const { error } = await supabase
        .from("work_orders")
        .update(updatePayload)
        .eq("id", op.entity_id)
        .eq("organization_id", req.user.organizationId);

    if (error) throw error;
}

async function syncMachineEvent(supabase: any, op: SyncOperation, req: AuthenticatedRequest) {
    if (!req.user.organizationId) {
        throw new Error("Active organization is required.");
    }

    const machineId = typeof op.payload?.machine_id === "string" && op.payload.machine_id.trim()
        ? op.payload.machine_id.trim()
        : op.entity_id;

    if (!machineId) {
        throw new Error("machine_id is required for machine_event sync.");
    }

    const { data: machine, error: machineError } = await supabase
        .from("machines")
        .select("id, organization_id")
        .eq("id", machineId)
        .maybeSingle();

    if (machineError) throw machineError;
    if (!machine) throw new Error("Machine not found.");
    if ((machine as any).organization_id !== req.user.organizationId) {
        throw new Error("conflict: machine belongs to another organization context");
    }

    const eventType = typeof op.payload?.event_type === "string" && op.payload.event_type.trim()
        ? op.payload.event_type.trim()
        : "offline_sync";

    const rawPayload = op.payload && typeof op.payload === "object" ? { ...op.payload } : {};
    delete (rawPayload as any).machine_id;
    delete (rawPayload as any).event_type;

    const eventPayload = {
        ...rawPayload,
        client_timestamp: op.client_timestamp || new Date().toISOString(),
        operation_type: op.operation_type,
        source: "offline_sync",
    };

    const { error } = await supabase.rpc("insert_machine_event", {
        p_actor_type: "user",
        p_event_type: eventType,
        p_machine_id: machineId,
        p_organization_id: req.user.organizationId,
        p_payload: eventPayload,
    });

    if (error) throw error;
}

async function syncChecklistExecutionComplete(supabase: any, op: SyncOperation, req: AuthenticatedRequest) {
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
}

async function applyOperation(supabase: any, op: SyncOperation, req: AuthenticatedRequest) {
    switch (op.entity_type) {
        case "work_order":
            return syncWorkOrder(supabase, op, req);
        case "machine_event":
            return syncMachineEvent(supabase, op, req);
        case "checklist_execution_complete":
            return syncChecklistExecutionComplete(supabase, op, req);
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

