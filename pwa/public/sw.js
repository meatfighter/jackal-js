const APP_VERSION = "__APP_VERSION__";
const BUILD_STAMP = "__BUILD_STAMP__";
const CACHE_PREFIX = "jackal-";
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}-${BUILD_STAMP}`;
const SCOPE_URL = new URL(self.registration.scope);
const APP_ROOT = appUrl("./");
const APP_INDEX = appUrl("index.html");
const APP_SHELL = [
    APP_ROOT,
    APP_INDEX,
    appUrl("manifest.webmanifest"),
    appUrl("favicon.ico"),
    appUrl("resources/icons/32x32.png"),
    appUrl("resources/icons/192x192.png"),
    appUrl("resources/icons/512x512.png"),
    appUrl(`index.html?v=${encodeURIComponent(BUILD_STAMP)}`)
];
const MAX_FETCH_RETRIES = 5;

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
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
        const cached = (await cache.match(APP_INDEX)) || (await cache.match(APP_ROOT));
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
    if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) {
        return false;
    }
    const scopedPath = url.pathname.slice(SCOPE_URL.pathname.length);
    if (scopedPath === "sw.js" || scopedPath.startsWith("src/") || scopedPath.startsWith("@vite") || scopedPath.includes("node_modules/")) {
        return false;
    }
    return response.type === "basic" || response.type === "default";
}

function appUrl(path) {
    return new URL(path, self.registration.scope).href;
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
