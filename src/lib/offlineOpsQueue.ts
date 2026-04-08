export interface OfflineOperation {
    id: string;
    operation_type: "create" | "update" | "delete";
    entity_type: string;
    entity_id: string;
    payload: Record<string, unknown>;
    client_timestamp: string;
    sequence_number?: number;
    plant_id?: string | null;
    device_id?: string | null;
}

export interface OfflineSyncHistoryEntry {
    id: string;
    created_at: string;
    synced: number;
    failed: number;
    conflicts: number;
    total: number;
    ok: boolean;
    message: string;
}

const OPS_KEY = "machina.offline.ops.v1";
const HISTORY_KEY = "machina.offline.history.v1";
export const OFFLINE_QUEUE_CHANGED_EVENT = "machina-offline-queue-changed";

function isBrowser() {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function notifyQueueChanged() {
    if (!isBrowser()) return;
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT));
}

function readJson<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function writeJson<T>(key: string, value: T, notify = false) {
    if (!isBrowser()) return;
    localStorage.setItem(key, JSON.stringify(value));
    if (notify) {
        notifyQueueChanged();
    }
}

export function listOfflineOperations(): OfflineOperation[] {
    return readJson < OfflineOperation[] > (OPS_KEY, []);
}

export function getOfflineOperationCount(): number {
    return listOfflineOperations().length;
}

export function replaceOfflineOperations(operations: OfflineOperation[]) {
    writeJson(OPS_KEY, operations, true);
}

export function clearOfflineOperations() {
    writeJson(OPS_KEY, [], true);
}

export function appendSyncHistory(entry: OfflineSyncHistoryEntry) {
    const current = readJson < OfflineSyncHistoryEntry[] > (HISTORY_KEY, []);
    const next = [entry, ...current].slice(0, 30);
    writeJson(HISTORY_KEY, next);
}

export function listSyncHistory(): OfflineSyncHistoryEntry[] {
    return readJson < OfflineSyncHistoryEntry[] > (HISTORY_KEY, []);
}

export function clearSyncHistory() {
    writeJson(HISTORY_KEY, []);
}

function openLegacyDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("maintops-offline", 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("mutations")) {
                db.createObjectStore("mutations", { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getLegacyMutationCount(): Promise<number> {
    if (typeof indexedDB === "undefined") return 0;

    try {
        const db = await openLegacyDb();
        const tx = db.transaction("mutations", "readonly");
        const store = tx.objectStore("mutations");
        const request = store.count();

        return await new Promise < number > ((resolve, reject) => {
            request.onsuccess = () => resolve(request.result ?? 0);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return 0;
    }
}

export async function clearLegacyMutations(): Promise<void> {
    if (typeof indexedDB === "undefined") return;

    const db = await openLegacyDb();
    const tx = db.transaction("mutations", "readwrite");
    tx.objectStore("mutations").clear();

    await new Promise < void> ((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

