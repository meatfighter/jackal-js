const APP_VERSION = "0.1.1";
const BUILD_STAMP = "20260804T000000Z";
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
    event.respondWith(networkFirstWithRetry(event.request));
});

async function networkFirstWithRetry(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetchWithRetry(request);
        if (response.ok && shouldCache(request, response)) {
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

function shouldCache(request, response) {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return false;
    }
    if (url.pathname === "/sw.js" || url.pathname.startsWith("/src/") || url.pathname.startsWith("/@vite") || url.pathname.includes("/node_modules/")) {
        return false;
    }
    return response.type === "basic" || response.type === "default";
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
