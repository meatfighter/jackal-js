const APP_VERSION = "0.1.0";
const BUILD_STAMP = "20260803T000000Z";
const CACHE_NAME = `jackal-${APP_VERSION}-${BUILD_STAMP}`;
const APP_SHELL = [
    "/",
    `/index.html?v=${encodeURIComponent(BUILD_STAMP)}`
];
const MAX_FETCH_RETRIES = 5;

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }
    event.respondWith(cacheFirstWithRetry(event.request));
});

async function cacheFirstWithRetry(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }
    const response = await fetchWithRetry(request);
    if (response.ok) {
        cache.put(request, response.clone());
    }
    return response;
}

async function fetchWithRetry(request) {
    let lastError = null;
    for (let attempt = 0; attempt < MAX_FETCH_RETRIES; attempt++) {
        try {
            const response = await fetch(request);
            if (response.ok) {
                return response;
            }
            lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError ?? new Error("Fetch failed");
}
