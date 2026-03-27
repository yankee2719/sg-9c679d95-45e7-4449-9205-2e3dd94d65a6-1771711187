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

const STORAGE_KEY = "machina:offline-ops:v1";
const LAST_SYNC_KEY = "machina:offline-ops:last-sync";

function readRaw(): OfflineSyncOperation[] {
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

function writeRaw(items: OfflineSyncOperation[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listOfflineSyncOperations(): OfflineSyncOperation[] {
    return readRaw().sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
}

export function getOfflineSyncCount(): number {
    return listOfflineSyncOperations().length;
}

export function enqueueOfflineSyncOperation(
    input: Omit<OfflineSyncOperation, "id" | "client_timestamp" | "sequence_number">
): OfflineSyncOperation {
    const current = readRaw();
    const now = new Date().toISOString();
    const sequence = current.reduce((max, item) => Math.max(max, item.sequence_number || 0), 0) + 1;

    const next: OfflineSyncOperation = {
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        client_timestamp: now,
        sequence_number: sequence,
        ...input,
    };

    const dedupeKey = input.dedupe_key ?? null;
    const filtered = dedupeKey
        ? current.filter((item) => item.dedupe_key !== dedupeKey)
        : current;

    filtered.push(next);
    writeRaw(filtered);
    return next;
}

export function removeOfflineSyncOperations(ids: string[]) {
    if (!ids.length) return;
    const idSet = new Set(ids);
    writeRaw(readRaw().filter((item) => !idSet.has(item.id)));
}

export function setOfflineSyncLastRun(value: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_SYNC_KEY, value);
}

export function getOfflineSyncLastRun(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LAST_SYNC_KEY);
}

