import { apiFetch } from "@/services/apiClient";
import {
    appendSyncHistory,
    listOfflineOperations,
    replaceOfflineOperations,
    type OfflineOperation,
} from "@/lib/offlineOpsQueue";

export interface OfflineSyncSummary {
    synced: number;
    failed: number;
    conflicts: number;
    total: number;
}

export async function runOfflineSync(): Promise<OfflineSyncSummary> {
    const operations = listOfflineOperations();

    if (operations.length === 0) {
        const summary = { synced: 0, failed: 0, conflicts: 0, total: 0 };
        appendSyncHistory({
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ok: true,
            message: "Nessuna operazione in coda.",
            ...summary,
        });
        return summary;
    }

    const firstWithPlant = operations.find((operation) => operation.plant_id);
    const firstWithDevice = operations.find((operation) => operation.device_id);

    const response = await apiFetch<{
results?: Array<{ id: string; status: "synced" | "failed" | "conflict"; error?: string }>;
summary?: OfflineSyncSummary;
}>("/api/sync", {
        method: "POST",
        body: JSON.stringify({
            operations,
            plant_id: firstWithPlant?.plant_id ?? null,
            device_id: firstWithDevice?.device_id ?? null,
        }),
    });

    const summary = response.summary ?? { synced: 0, failed: 0, conflicts: 0, total: operations.length };
    const results = response.results ?? [];
    const failedIds = new Set(
        results.filter((row) => row.status !== "synced").map((row) => row.id)
    );

    const remaining = operations.filter((operation) => failedIds.has(operation.id));
    replaceOfflineOperations(remaining);

    appendSyncHistory({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ok: summary.failed === 0 && summary.conflicts === 0,
        message:
            summary.failed === 0 && summary.conflicts === 0
                ? `${summary.synced} operazioni sincronizzate.`
                : `${summary.synced} sincronizzate, ${summary.failed} fallite, ${summary.conflicts} conflitti.`,
        ...summary,
    });

    return summary;
}

export function queueOfflineOperation(operation: OfflineOperation) {
    const current = listOfflineOperations();
    const nextSequence =
        current.reduce((max, item) => Math.max(max, item.sequence_number ?? 0), 0) + 1;

    current.push({
        ...operation,
        sequence_number: operation.sequence_number ?? nextSequence,
        client_timestamp: operation.client_timestamp || new Date().toISOString(),
    });

    replaceOfflineOperations(current);
}
