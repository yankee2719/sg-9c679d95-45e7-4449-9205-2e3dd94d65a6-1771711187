import { authService } from "@/services/authService";
import {
    addOfflineSyncHistory,
    getOfflineSyncLastRun,
    listOfflineSyncOperations,
    removeOfflineSyncOperations,
    setOfflineSyncLastRun,
} from "@/lib/offlineOpsQueue";

export interface OfflineSyncRunResult {
    ok: boolean;
    synced: number;
    failed: number;
    conflicts: number;
    total: number;
    message: string;
    lastSync: string | null;
}

function parseErrorPayload(payload: any): string {
    return payload?.error || payload?.message || "Sincronizzazione fallita";
}

export async function runOfflineSync(): Promise<OfflineSyncRunResult> {
    const operations = listOfflineSyncOperations();
    if (operations.length === 0) {
        return {
            ok: true,
            synced: 0,
            failed: 0,
            conflicts: 0,
            total: 0,
            message: "Nessuna operazione in coda",
            lastSync: getOfflineSyncLastRun(),
        };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
        return {
            ok: false,
            synced: 0,
            failed: operations.length,
            conflicts: 0,
            total: operations.length,
            message: "Sei offline: sincronizzazione non disponibile",
            lastSync: getOfflineSyncLastRun(),
        };
    }

    const session = await authService.getCurrentSession();
    if (!session?.access_token) {
        return {
            ok: false,
            synced: 0,
            failed: operations.length,
            conflicts: 0,
            total: operations.length,
            message: "Accesso richiesto per sincronizzare",
            lastSync: getOfflineSyncLastRun(),
        };
    }

    const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            operations,
            plant_id: operations.find((item) => item.plant_id)?.plant_id ?? null,
            device_id:
                typeof window !== "undefined" ? window.localStorage.getItem("offline_device_id") || null : null,
        }),
    });

    let payload: any = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const message = parseErrorPayload(payload);
        addOfflineSyncHistory({
            ok: false,
            synced: 0,
            failed: operations.length,
            conflicts: 0,
            total: operations.length,
            message,
            operation_ids: operations.map((item) => item.id),
        });
        return {
            ok: false,
            synced: 0,
            failed: operations.length,
            conflicts: 0,
            total: operations.length,
            message,
            lastSync: getOfflineSyncLastRun(),
        };
    }

    const results = Array.isArray(payload?.results) ? payload.results : [];
    const syncedIds = results
        .filter((row: any) => row?.status === "synced")
        .map((row: any) => String(row.id));

    removeOfflineSyncOperations(syncedIds);

    const summary = payload?.summary ?? {};
    const synced = Number(summary.synced ?? syncedIds.length ?? 0);
    const failed = Number(summary.failed ?? 0);
    const conflicts = Number(summary.conflicts ?? 0);
    const total = Number(summary.total ?? operations.length);
    const ok = failed === 0 && conflicts === 0;
    const message = ok
        ? `${synced} operazioni sincronizzate`
        : `${synced} sincronizzate, ${failed + conflicts} non riuscite`;

    const now = new Date().toISOString();
    setOfflineSyncLastRun(now);
    addOfflineSyncHistory({
        ok,
        synced,
        failed,
        conflicts,
        total,
        message,
        operation_ids: operations.map((item) => item.id),
    });

    return {
        ok,
        synced,
        failed,
        conflicts,
        total,
        message,
        lastSync: now,
    };
}
