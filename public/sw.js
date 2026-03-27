const CACHE_VERSION = "v3";
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

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(PRECACHE_URLS).catch(() => undefined);
        })
    );
    self.skipWaiting();
});

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

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (!url.protocol.startsWith("http")) return;

    if (request.method !== "GET") {
        event.respondWith(
            fetch(request.clone()).catch(() =>
                new Response(
                    JSON.stringify({ error: "offline", message: "Operazione non eseguita: gestiscila tramite la coda offline dell'app." }),
                    { status: 503, headers: { "Content-Type": "application/json" } }
                )
            )
        );
        return;
    }

    if (url.hostname.includes("supabase.co") && url.pathname.includes("/rest/")) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    if (url.hostname.includes("supabase.co") && url.pathname.includes("/storage/")) {
        event.respondWith(cacheFirst(request, IMAGE_CACHE));
        return;
    }

    if (url.pathname.startsWith("/_next/static/")) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    if (url.origin === self.location.origin) {
        event.respondWith(networkFirst(request, STATIC_CACHE));
        return;
    }

    event.respondWith(networkFirst(request, STATIC_CACHE));
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
        return new Response(JSON.stringify({ error: "offline", message: "Sei offline." }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
        });
    }
}

