import { apiFetch } from "@/services/apiClient";

export interface CachedDocumentEntry {
    id: string;
    title: string;
    mimeType: string;
    fileName: string;
    fileSize: number | null;
    savedAt: string;
    category?: string | null;
    machineId?: string | null;
    machineLabel?: string | null;
}

const CACHE_NAME = "machina-offline-documents-v1";
const INDEX_KEY = "machina.offline.documents.index";

function hasWindow() {
    return typeof window !== "undefined";
}

function readIndex(): Record<string, CachedDocumentEntry> {
    if (!hasWindow()) return {};
    try {
        const raw = window.localStorage.getItem(INDEX_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeIndex(index: Record<string, CachedDocumentEntry>) {
    if (!hasWindow()) return;
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function cacheUrlForDocument(documentId: string) {
    return `/__offline/documents/${documentId}`;
}

async function getCache() {
    if (!hasWindow() || !("caches" in window)) {
        throw new Error("Offline cache non supportata su questo dispositivo");
    }
    return window.caches.open(CACHE_NAME);
}

function getExtensionFromMimeType(mimeType: string | null | undefined) {
    if (!mimeType) return "bin";
    if (mimeType.includes("pdf")) return "pdf";
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
    if (mimeType.includes("webp")) return "webp";
    if (mimeType.includes("text/plain")) return "txt";
    return "bin";
}

async function loadCachedBlob(documentId: string): Promise<Blob | null> {
    const cache = await getCache();
    const response = await cache.match(cacheUrlForDocument(documentId));
    if (!response) return null;
    return response.blob();
}

export function getCachedDocumentEntry(documentId: string): CachedDocumentEntry | null {
    const index = readIndex();
    return index[documentId] ?? null;
}

export function listCachedDocumentEntries(): CachedDocumentEntry[] {
    return Object.values(readIndex()).sort((a, b) => {
        const da = new Date(a.savedAt).getTime();
        const db = new Date(b.savedAt).getTime();
        return db - da;
    });
}

export function getCachedDocumentCount(): number {
    return listCachedDocumentEntries().length;
}

export async function cacheDocumentForOffline(documentId: string): Promise<CachedDocumentEntry> {
    const detailPayload = await apiFetch<any>(`/api/documents/${documentId}`);
    const detail = detailPayload?.document;
    if (!detail) {
        throw new Error("Documento non trovato");
    }

    const downloadPayload = await apiFetch<any>(`/api/documents/${documentId}/download?redirect=0`);
    const signedUrl = downloadPayload?.signedUrl || downloadPayload?.data?.signedUrl;
    const fileName = downloadPayload?.fileName || downloadPayload?.data?.fileName || detail.title || `document-${documentId}`;
    const mimeType = downloadPayload?.mimeType || downloadPayload?.data?.mimeType || detail.mime_type || "application/octet-stream";

    if (!signedUrl) {
        throw new Error("Signed URL non disponibile");
    }

    const response = await fetch(signedUrl);
    if (!response.ok) {
        throw new Error("Download documento fallito");
    }

    const blob = await response.blob();
    const cache = await getCache();
    await cache.put(
        cacheUrlForDocument(documentId),
        new Response(blob, {
            headers: {
                "Content-Type": mimeType,
                "Content-Length": String(blob.size),
                "X-Machina-File-Name": fileName,
            },
        })
    );

    const entry: CachedDocumentEntry = {
        id: detail.id,
        title: detail.title || fileName,
        mimeType,
        fileName,
        fileSize: detail.file_size ?? blob.size ?? null,
        savedAt: new Date().toISOString(),
        category: detail.category ?? null,
        machineId: detail.machine_id ?? null,
        machineLabel: detail.machine_label ?? null,
    };

    const index = readIndex();
    index[documentId] = entry;
    writeIndex(index);
    return entry;
}

export async function removeCachedDocument(documentId: string): Promise<void> {
    const cache = await getCache();
    await cache.delete(cacheUrlForDocument(documentId));
    const index = readIndex();
    delete index[documentId];
    writeIndex(index);
}

export async function openCachedDocument(documentId: string): Promise<void> {
    const blob = await loadCachedBlob(documentId);
    const entry = getCachedDocumentEntry(documentId);
    if (!blob || !entry) {
        throw new Error("Documento non disponibile offline");
    }

    const objectUrl = window.URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
}

export async function downloadCachedDocument(documentId: string): Promise<void> {
    const blob = await loadCachedBlob(documentId);
    const entry = getCachedDocumentEntry(documentId);
    if (!blob || !entry) {
        throw new Error("Documento non disponibile offline");
    }

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const preferredName = entry.fileName?.includes(".")
        ? entry.fileName
        : `${entry.fileName}.${getExtensionFromMimeType(entry.mimeType)}`;
    anchor.href = url;
    anchor.download = preferredName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 5_000);
}
