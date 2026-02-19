// =============================================================================
// MACHINA — Service Worker
// =============================================================================

const CACHE_VERSION = "v2";
const STATIC_CACHE = `machina-static-${CACHE_VERSION}`;
const API_CACHE = `machina-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `machina-images-${CACHE_VERSION}`;

const PRECACHE_URLS = [
    "/dashboard",
    "/equipment",
    "/maintenance",
    "/work-orders",
    "/offline",
];

// INSTALL
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log("[SW] Pre-caching app shell");
            return cache.addAll(PRECACHE_URLS).catch(() => {
                console.warn("[SW] Some precache URLs failed");
            });
        })
    );
    self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== IMAGE_CACHE)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (!url.protocol.startsWith("http")) return;

    // Non-GET: queue failed mutations
    if (request.method !== "GET") {
        if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
            event.respondWith(
                fetch(request.clone()).catch(async () => {
                    await queueOfflineMutation(request);
                    return new Response(
                        JSON.stringify({ offline: true, queued: true, message: "Operazione salvata offline." }),
                        { status: 200, headers: { "Content-Type": "application/json" } }
                    );
                })
            );
        }
        return;
    }

    // Supabase REST API: network-first
    if (url.hostname.includes("supabase.co") && url.pathname.includes("/rest/")) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    // Supabase Storage: cache-first
    if (url.hostname.includes("supabase.co") && url.pathname.includes("/storage/")) {
        event.respondWith(cacheFirst(request, IMAGE_CACHE));
        return;
    }

    // Next.js static: cache-first
    if (url.pathname.startsWith("/_next/static/")) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // Same origin: network-first
    if (url.origin === self.location.origin) {
        event.respondWith(networkFirst(request, STATIC_CACHE));
        return;
    }

    event.respondWith(networkFirst(request, STATIC_CACHE));
});

// STRATEGIES
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response("Offline", { status: 503 });
    }
}

async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;

        if (request.mode === "navigate") {
            const offlinePage = await caches.match("/offline");
            if (offlinePage) return offlinePage;
        }

        return new Response(
            JSON.stringify({ error: "offline", message: "Sei offline." }),
            { status: 503, headers: { "Content-Type": "application/json" } }
        );
    }
}

// OFFLINE QUEUE (IndexedDB)
async function queueOfflineMutation(request) {
    try {
        const db = await openDB();
        const body = await request.clone().text();
        const tx = db.transaction("mutations", "readwrite");
        tx.objectStore("mutations").add({
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: body,
            timestamp: Date.now(),
        });
    } catch (err) {
        console.error("[SW] Queue failed:", err);
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("maintops-offline", 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains("mutations")) {
                db.createObjectStore("mutations", { keyPath: "id", autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// SYNC
self.addEventListener("message", async (event) => {
    if (event.data?.type === "SYNC_OFFLINE") {
        const result = await syncOfflineMutations();
        const clients = await self.clients.matchAll();
        clients.forEach((c) => c.postMessage({ type: "SYNC_COMPLETE", result }));
    }
});

async function syncOfflineMutations() {
    const result = { synced: 0, failed: 0 };
    try {
        const db = await openDB();
        const mutations = await new Promise((resolve, reject) => {
            const tx = db.transaction("mutations", "readonly");
            const req = tx.objectStore("mutations").getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });

        for (const m of mutations) {
            try {
                const resp = await fetch(m.url, { method: m.method, headers: m.headers, body: m.body });
                if (resp.ok || resp.status < 500) {
                    const dtx = db.transaction("mutations", "readwrite");
                    dtx.objectStore("mutations").delete(m.id);
                    result.synced++;
                } else {
                    result.failed++;
                }
            } catch {
                result.failed++;
            }
        }
    } catch (err) {
        console.error("[SW] Sync error:", err);
    }
    return result;
}

