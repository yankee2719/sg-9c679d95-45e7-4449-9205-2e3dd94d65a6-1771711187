const CACHE_VERSION = "v4";
const STATIC_CACHE = `machina-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `machina-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = ["/offline", "/dashboard", "/equipment", "/maintenance", "/work-orders"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (!url.protocol.startsWith("http")) return;

    if (request.method !== "GET") {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(networkFirst(request, STATIC_CACHE, true));
        return;
    }

    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    if (url.hostname.includes("supabase.co") && url.pathname.includes("/storage/")) {
        event.respondWith(cacheFirst(request, RUNTIME_CACHE));
        return;
    }

    if (url.origin === self.location.origin) {
        event.respondWith(networkFirst(request, RUNTIME_CACHE, false));
        return;
    }
});

self.addEventListener("message", (event) => {
    const type = event.data?.type;
    if (type === "PING") {
        event.source?.postMessage({ type: "PONG" });
    }
});

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

async function networkFirst(request, cacheName, allowOfflinePage) {
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
        if (allowOfflinePage) {
            const offline = await caches.match("/offline");
            if (offline) return offline;
        }
        return new Response(JSON.stringify({ error: "offline", message: "Sei offline." }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
        });
    }
}

