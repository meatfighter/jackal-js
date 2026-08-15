const APP_VERSION = "0.1.17";
const BUILD_STAMP = "20260815T013000Z";
const CACHE_NAME = `jackal-${APP_VERSION}-${BUILD_STAMP}`;
const APP_INDEX = "/index.html";
const APP_SHELL = [
    "/",
    APP_INDEX,
    "/manifest.webmanifest",
    "/favicon.ico",
    "/resources/icons/32x32.png",
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
    if (event.request.mode === "navigate") {
        event.respondWith(networkFirstNavigation(event.request));
        return;
    }
    event.respondWith(networkFirstWithRetry(event.request));
});

async function networkFirstNavigation(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetchWithRetry(request);
        if (response.ok) {
            await cache.put(APP_INDEX, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(APP_INDEX) || await cache.match("/");
        if (cached) {
            return cached;
        }
        throw error;
    }
}

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
