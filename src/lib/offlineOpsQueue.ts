export type OfflineSyncEntityType = "checklist_execution_complete";

export interface OfflineSyncOperation {
    id: string;
    entity_type: OfflineSyncEntityType;
    entity_id: string;
    plant_id?: string | null;
    client_timestamp: string;
    sequence_number: number;
    dedupe_key?: string | null;
    payload: Record<string, any>;
}

export interface OfflineSyncHistoryEntry {
    id: string;
    created_at: string;
    ok: boolean;
    synced: number;
    failed: number;
    conflicts: number;
    total: number;
    message: string;
    operation_ids: string[];
}

const STORAGE_KEY = "machina:offline-ops:v1";
const LAST_SYNC_KEY = "machina:offline-ops:last-sync";
const HISTORY_KEY = "machina:offline-ops:history";
const HISTORY_LIMIT = 25;

function readQueueRaw(): OfflineSyncOperation[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeQueueRaw(items: OfflineSyncOperation[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function readHistoryRaw(): OfflineSyncHistoryEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeHistoryRaw(items: OfflineSyncHistoryEntry[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)));
}

export function listOfflineSyncOperations(): OfflineSyncOperation[] {
    return readQueueRaw().sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
}

export function getOfflineSyncCount(): number {
    return listOfflineSyncOperations().length;
}

export function enqueueOfflineSyncOperation(
    input: Omit<OfflineSyncOperation, "id" | "client_timestamp" | "sequence_number">
): OfflineSyncOperation {
    const current = readQueueRaw();
    const now = new Date().toISOString();
    const sequence = current.reduce((max, item) => Math.max(max, item.sequence_number || 0), 0) + 1;

    const next: OfflineSyncOperation = {
        id:
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        client_timestamp: now,
        sequence_number: sequence,
        ...input,
    };

    const dedupeKey = input.dedupe_key ?? null;
    const filtered = dedupeKey ? current.filter((item) => item.dedupe_key !== dedupeKey) : current;

    filtered.push(next);
    writeQueueRaw(filtered);
    return next;
}

export function removeOfflineSyncOperations(ids: string[]) {
    if (!ids.length) return;
    const idSet = new Set(ids);
    writeQueueRaw(readQueueRaw().filter((item) => !idSet.has(item.id)));
}

export function clearOfflineSyncQueue() {
    writeQueueRaw([]);
}

export function setOfflineSyncLastRun(value: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_SYNC_KEY, value);
}

export function getOfflineSyncLastRun(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LAST_SYNC_KEY);
}

export function addOfflineSyncHistory(entry: Omit<OfflineSyncHistoryEntry, "id" | "created_at">) {
    const current = readHistoryRaw();
    const next: OfflineSyncHistoryEntry = {
        id:
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `history-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        created_at: new Date().toISOString(),
        ...entry,
    };

    current.unshift(next);
    writeHistoryRaw(current);
    return next;
}

export function listOfflineSyncHistory(): OfflineSyncHistoryEntry[] {
    return readHistoryRaw().sort((a, b) => {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return db - da;
    });
}

export function clearOfflineSyncHistory() {
    writeHistoryRaw([]);
}
