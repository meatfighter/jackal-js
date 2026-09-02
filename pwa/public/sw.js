const APP_VERSION = "__APP_VERSION__";
const BUILD_STAMP = "__BUILD_STAMP__";
const RESOURCE_VERSIONS = __RESOURCE_VERSIONS__;
const SCOPE_CACHE_ID = encodeURIComponent(new URL(self.registration.scope).pathname);
const CACHE_PREFIX = `jackal|${SCOPE_CACHE_ID}|`;
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}-${BUILD_STAMP}`;
const APP_ROOT = appUrl("./");
const APP_INDEX = appUrl("index.html");
const RESOURCE_ROOT = new URL(appUrl("resources/"));
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
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin || !requestUrl.href.startsWith(self.registration.scope)) {
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
        return await fetchOnce(request);
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

    return fetchOnce(request);
}

function appUrl(path) {
    return new URL(path, self.registration.scope).href;
}

function cacheVersionForUrl(url) {
    if (url.origin === RESOURCE_ROOT.origin && url.pathname.startsWith(RESOURCE_ROOT.pathname)) {
        const ref = decodeURIComponent(url.pathname.slice(RESOURCE_ROOT.pathname.length));
        const contentVersion = RESOURCE_VERSIONS[ref];
        if (typeof contentVersion === "string") {
            return contentVersion;
        }
    }
    return BUILD_STAMP;
}

function createCacheUrl(requestOrUrl) {
    const url = new URL(typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url, self.registration.scope);
    if (url.origin === self.location.origin && url.href.startsWith(self.registration.scope) && !url.searchParams.has("v")) {
        url.searchParams.set("v", cacheVersionForUrl(url));
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
