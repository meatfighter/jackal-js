const APP_VERSION = "__APP_VERSION__";
const BUILD_STAMP = "__BUILD_STAMP__";
const CACHE_PREFIX = "jackal-";
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}-${BUILD_STAMP}`;
const IGNORED_CACHE_SEARCH_PARAMS = new Set(["v"]);
const SCOPE_URL = new URL(self.registration.scope);
const APP_ROOT = appUrl("./");
const APP_INDEX = appUrl("index.html");
const APP_STATIC_RESOURCES = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./favicon.ico",
    "./resources/icons/32x32.png",
    "./resources/icons/192x192.png",
    "./resources/icons/512x512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(APP_STATIC_RESOURCES.map((url) => createCacheUrl(url)));
            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }
    if (event.request.mode === "navigate") {
        event.respondWith(networkFirstNavigation(event.request));
        return;
    }
    event.respondWith(cacheFirst(event.request));
});

async function networkFirstNavigation(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetchOnce(request);
        if (response.ok) {
            await cache.put(createCacheUrl(APP_INDEX), response.clone());
        }
        return response;
    } catch (error) {
        const cached = (await cache.match(createCacheUrl(APP_INDEX))) || (await cache.match(createCacheUrl(APP_ROOT)));
        if (cached) {
            return cached;
        }
        throw error;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cacheUrl = createCacheUrl(request);
    const cached = await cache.match(cacheUrl);
    if (cached) {
        return cached;
    }

    const response = await fetchOnce(request);
    if (shouldCache(request, response)) {
        await cache.put(cacheUrl, response.clone());
    }
    return response;
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

function createCacheUrl(requestOrUrl) {
    const url = new URL(typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url, self.registration.scope);
    if (url.origin === self.location.origin && url.href.startsWith(self.registration.scope)) {
        for (const param of IGNORED_CACHE_SEARCH_PARAMS) {
            url.searchParams.delete(param);
        }
    }
    url.hash = "";
    return url.href;
}

async function fetchOnce(request) {
    const response = await fetch(request);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response;
}
