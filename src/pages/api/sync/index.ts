// ============================================================================
// API: POST /api/sync
// ============================================================================
import type { NextApiResponse } from "next";
import {
    withAuth,
    ALL_APP_ROLES,
    type AuthenticatedRequest,
    getServiceSupabase,
} from "@/lib/apiAuth";

interface SyncOperation {
    id: string;
    operation_type: "create" | "update" | "delete";
    entity_type: string;
    entity_id: string;
    payload: any;
    client_timestamp: string;
    sequence_number?: number;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const serviceSupabase = getServiceSupabase();
        const { operations, plant_id, device_id } = req.body;

        if (
            !operations ||
            !Array.isArray(operations) ||
            operations.length === 0
        ) {
            return res
                .status(400)
                .json({ error: "operations array is required" });
        }

        if (!plant_id) {
            return res.status(400).json({ error: "plant_id is required" });
        }

        // Process operations in sequence order
        const sorted = [...operations].sort(
            (a, b) => (a.sequence_number || 0) - (b.sequence_number || 0)
        );

        const results: {
            id: string;
            status: "synced" | "failed" | "conflict";
            error?: string;
        }[] = [];

        for (const op of sorted) {
            try {
                await applyOperation(serviceSupabase, op, req.user.userId);
                results.push({ id: op.id, status: "synced" });
            } catch (err: any) {
                const isConflict = err.message
                    ?.toLowerCase()
                    .includes("conflict");
                results.push({
                    id: op.id,
                    status: isConflict ? "conflict" : "failed",
                    error: err.message,
                });
            }
        }

        const synced = results.filter((r) => r.status === "synced").length;
        const failed = results.filter((r) => r.status === "failed").length;
        const conflicts = results.filter(
            (r) => r.status === "conflict"
        ).length;

        // Log sync session
        await serviceSupabase.from("sync_sessions").insert({
            organization_id: req.user.organizationId,
            plant_id,
            user_id: req.user.userId,
            device_id: device_id || null,
            operations_synced: synced,
            operations_failed: failed + conflicts,
            conflicts_detected: conflicts,
            status: "completed",
            completed_at: new Date().toISOString(),
        });

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

// -----------------------------------------------------------------------
// Apply single operation to DB
// -----------------------------------------------------------------------
async function applyOperation(
    supabase: any,
    op: SyncOperation,
    userId: string
): Promise<void> {
    switch (op.entity_type) {
        case "work_order": {
            if (op.operation_type === "update") {
                const { data: existing } = await supabase
                    .from("work_orders")
                    .select("is_closed, updated_at")
                    .eq("id", op.entity_id)
                    .single();

                if (existing?.is_closed) {
                    throw new Error(
                        "conflict: work order is closed on server"
                    );
                }

                const { error } = await supabase
                    .from("work_orders")
                    .update({
                        ...op.payload,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", op.entity_id);

                if (error) throw error;
            }
            break;
        }

        case "checklist": {
            const { work_order_id, checklist, percentage } = op.payload;
            const { error } = await supabase
                .from("work_orders")
                .update({
                    checklist,
                    checklist_completion_percentage: percentage,
                })
                .eq("id", work_order_id);
            if (error) throw error;
            break;
        }

        case "machine_event": {
            const { error } = await supabase
                .from("machine_events")
                .insert({
                    ...op.payload,
                    recorded_by: userId,
                    recorded_at: op.client_timestamp,
                });
            if (error) throw error;
            break;
        }

        default:
            throw new Error(`Unknown entity_type: ${op.entity_type}`);
    }
}

export default withAuth(ALL_APP_ROLES, handler);

