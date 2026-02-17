const CACHE_NAME = "maintops-v1";
const STATIC_CACHE = "maintops-static-v1";
const API_CACHE = "maintops-api-v1";

// Pages to pre-cache for offline shell
const PRECACHE_URLS = [
    "/dashboard",
    "/equipment",
    "/maintenance",
    "/offline",
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log("[SW] Pre-caching app shell");
            return cache.addAll(PRECACHE_URLS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET for caching (mutations handled separately)
    if (request.method !== "GET") {
        // Queue failed POST/PATCH/DELETE for offline sync
        if (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE") {
            event.respondWith(
                fetch(request.clone()).catch(async () => {
                    // Store failed mutation for later sync
                    await queueOfflineMutation(request);
                    return new Response(
                        JSON.stringify({ offline: true, message: "Operazione salvata. Verrà sincronizzata quando torni online." }),
                        { status: 200, headers: { "Content-Type": "application/json" } }
                    );
                })
            );
            return;
        }
        return;
    }

    // Supabase REST API: network-first, fallback to cache
    if (url.hostname.includes("supabase.co") && url.pathname.includes("/rest/")) {
        event.respondWith(networkFirstWithCache(request, API_CACHE));
        return;
    }

    // Next.js static assets (_next/static): cache-first
    if (url.pathname.startsWith("/_next/static/")) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // Next.js pages and data: network-first
    if (url.pathname.startsWith("/_next/data/") || url.origin === self.location.origin) {
        event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
        return;
    }

    // Default: network with cache fallback
    event.respondWith(networkFirstWithCache(request, CACHE_NAME));
});

// Cache-first strategy (for immutable static assets)
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

// Network-first with cache fallback
async function networkFirstWithCache(request, cacheName) {
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

        // For navigation requests, show offline page
        if (request.mode === "navigate") {
            const offlinePage = await caches.match("/offline");
            if (offlinePage) return offlinePage;
        }

        return new Response(
            JSON.stringify({ error: "offline", message: "Sei offline. Dati dalla cache non disponibili." }),
            { status: 503, headers: { "Content-Type": "application/json" } }
        );
    }
}

// Offline mutation queue using IndexedDB
async function queueOfflineMutation(request) {
    try {
        const db = await openDB();
        const body = await request.clone().text();
        const tx = db.transaction("mutations", "readwrite");
        const store = tx.objectStore("mutations");
        store.add({
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: body,
            timestamp: Date.now(),
        });
    } catch (err) {
        console.error("[SW] Failed to queue mutation:", err);
    }
}

function openDB() {
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

// Sync queued mutations when back online
self.addEventListener("message", async (event) => {
    if (event.data && event.data.type === "SYNC_OFFLINE") {
        await syncOfflineMutations();
        // Notify all clients
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
            client.postMessage({ type: "SYNC_COMPLETE" });
        });
    }
});

async function syncOfflineMutations() {
    try {
        const db = await openDB();
        const tx = db.transaction("mutations", "readwrite");
        const store = tx.objectStore("mutations");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = async () => {
            const mutations = getAllRequest.result;
            console.log(`[SW] Syncing ${mutations.length} offline mutations`);

            for (const mutation of mutations) {
                try {
                    await fetch(mutation.url, {
                        method: mutation.method,
                        headers: mutation.headers,
                        body: mutation.body,
                    });
                    // Remove synced mutation
                    const deleteTx = db.transaction("mutations", "readwrite");
                    deleteTx.objectStore("mutations").delete(mutation.id);
                    console.log(`[SW] Synced mutation ${mutation.id}`);
                } catch (err) {
                    console.error(`[SW] Failed to sync mutation ${mutation.id}:`, err);
                }
            }
        };
    } catch (err) {
        console.error("[SW] Sync failed:", err);
    }
}
