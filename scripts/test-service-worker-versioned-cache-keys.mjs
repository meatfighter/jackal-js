import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const SERVICE_WORKER_SOURCE = readFileSync(new URL("../pwa/public/sw.js", import.meta.url), "utf8");
const SCOPE = "https://example.test/pwa/";
const STAGING_SCOPE = "https://example.test/stage/pwa/";
const PRODUCTION_SCOPE = "https://example.test/production/pwa/";

function loadServiceWorker({
    appVersion = "1.0.0",
    buildStamp = "current",
    cacheBackend = createCacheBackend(),
    fetchHandler = async () => createResponse("network"),
    scope = SCOPE,
    selfLocation = scope
} = {}) {
    const listeners = new Map();
    const claimCalls = [];
    const skipWaitingCalls = [];
    const self = {
        location: new URL(selfLocation),
        registration: {
            scope
        },
        clients: {
            claim: async () => {
                claimCalls.push(true);
            }
        },
        skipWaiting: async () => {
            skipWaitingCalls.push(true);
        },
        addEventListener(type, listener) {
            listeners.set(type, listener);
        }
    };
    const context = {
        URL,
        caches: cacheBackend.caches,
        fetch: fetchHandler,
        self
    };
    const source = SERVICE_WORKER_SOURCE.replaceAll("__APP_VERSION__", appVersion).replaceAll("__BUILD_STAMP__", buildStamp);

    vm.runInNewContext(`${source}\nglobalThis.__worker = { APP_STATIC_RESOURCES, CACHE_NAME, CACHE_PREFIX, createCacheUrl };`, context);

    return {
        ...context.__worker,
        cacheBackend,
        claimCalls,
        listeners,
        skipWaitingCalls
    };
}

function createCacheBackend(initialEntries = [], initialCacheNames = []) {
    const cacheNames = new Set(initialCacheNames);
    const deletedNames = [];
    const entries = new Map(initialEntries);
    const addedUrls = [];
    const matchedUrls = [];
    const openedNames = [];
    const putUrls = [];
    const cache = {
        async addAll(urls) {
            addedUrls.push(...urls);
            for (const url of urls) {
                entries.set(url, createResponse(`precache:${url}`));
            }
        },
        async match(url) {
            matchedUrls.push(url);
            return entries.get(url);
        },
        async put(url, response) {
            putUrls.push(url);
            entries.set(url, response);
        }
    };

    return {
        addedUrls,
        deletedNames,
        entries,
        matchedUrls,
        openedNames,
        putUrls,
        caches: {
            open: async (name) => {
                openedNames.push(name);
                cacheNames.add(name);
                return cache;
            },
            keys: async () => Array.from(cacheNames),
            delete: async (name) => {
                deletedNames.push(name);
                return cacheNames.delete(name);
            }
        }
    };
}

function createResponse(label, { ok = true, type = "basic" } = {}) {
    return {
        label,
        ok,
        type,
        clone() {
            return createResponse(`${label}:clone`, { ok, type });
        }
    };
}

async function runInstall(worker) {
    let installPromise = Promise.resolve();
    const listener = worker.listeners.get("install");
    assert.equal(typeof listener, "function");
    listener({
        waitUntil(promise) {
            installPromise = Promise.resolve(promise);
        }
    });
    await installPromise;
}

async function runActivate(worker) {
    let activatePromise = Promise.resolve();
    const listener = worker.listeners.get("activate");
    assert.equal(typeof listener, "function");
    listener({
        waitUntil(promise) {
            activatePromise = Promise.resolve(promise);
        }
    });
    await activatePromise;
}

async function runFetch(worker, request) {
    let responsePromise = null;
    const listener = worker.listeners.get("fetch");
    assert.equal(typeof listener, "function");
    listener({
        request,
        respondWith(promise) {
            responsePromise = Promise.resolve(promise);
        }
    });
    assert.notEqual(responsePromise, null);
    return responsePromise;
}

test("service worker cache keys add the current build stamp when v is absent", () => {
    const worker = loadServiceWorker({ buildStamp: "current" });

    assert.equal(worker.createCacheUrl("./resources/images/map.dat"), `${SCOPE}resources/images/map.dat?v=current`);
    assert.equal(worker.createCacheUrl("./resources/images/map.dat?palette=blue"), `${SCOPE}resources/images/map.dat?palette=blue&v=current`);
    assert.notEqual(worker.createCacheUrl("./resources/images/map.dat"), worker.createCacheUrl("./resources/images/map.dat?palette=blue"));
});

test("service worker cache keys preserve explicit deployment versions", () => {
    const worker = loadServiceWorker({ buildStamp: "old" });

    const oldUrl = worker.createCacheUrl("./resources/images/map.dat?v=old");
    const newUrl = worker.createCacheUrl("./resources/images/map.dat?v=new");

    assert.equal(oldUrl, `${SCOPE}resources/images/map.dat?v=old`);
    assert.equal(newUrl, `${SCOPE}resources/images/map.dat?v=new`);
    assert.notEqual(oldUrl, newUrl);
});

test("install-time precache URLs include the current build stamp", async () => {
    const worker = loadServiceWorker({ buildStamp: "current" });

    await runInstall(worker);

    assert.equal(worker.cacheBackend.addedUrls.length, worker.APP_STATIC_RESOURCES.length);
    assert.ok(worker.cacheBackend.addedUrls.every((url) => new URL(url).searchParams.get("v") === "current"));
});

test("install does not bypass the browser's waiting-worker lifecycle", async () => {
    const worker = loadServiceWorker();

    await runInstall(worker);

    assert.deepEqual(worker.skipWaitingCalls, []);
});

test("activation deletes superseded Jackal caches and claims clients", async () => {
    const cacheBackend = createCacheBackend([], [
        "jackal-_pwa_-1.0.0-current",
        "jackal-_pwa_-1.0.0-old",
        "jackal-_pwa_-legacy",
        "jackal-_production_pwa_-1.0.0-old",
        "jackal-1.0.0-old",
        "other-cache"
    ]);
    const worker = loadServiceWorker({ buildStamp: "current", cacheBackend });

    await runActivate(worker);

    assert.deepEqual(cacheBackend.deletedNames, ["jackal-_pwa_-1.0.0-old", "jackal-_pwa_-legacy"]);
    assert.equal(worker.claimCalls.length, 1);
});

test("cache name uses embedded build tokens even from a stale worker URL", () => {
    const worker = loadServiceWorker({
        appVersion: "2.3.4",
        buildStamp: "current",
        selfLocation: `${SCOPE}sw.js?v=old`
    });

    assert.equal(worker.CACHE_NAME, "jackal-_pwa_-2.3.4-current");
});

test("service worker cache names are isolated by deployment scope", () => {
    const stagingWorker = loadServiceWorker({ buildStamp: "same", scope: STAGING_SCOPE });
    const productionWorker = loadServiceWorker({ buildStamp: "same", scope: PRODUCTION_SCOPE });

    assert.equal(stagingWorker.CACHE_PREFIX, "jackal-_stage_pwa_-");
    assert.equal(productionWorker.CACHE_PREFIX, "jackal-_production_pwa_-");
    assert.notEqual(stagingWorker.CACHE_NAME, productionWorker.CACHE_NAME);
});

test("side-by-side deployment activation only cleans the current scope", async () => {
    const cacheBackend = createCacheBackend([], [
        "jackal-_stage_pwa_-1.0.0-current",
        "jackal-_stage_pwa_-1.0.0-old",
        "jackal-_production_pwa_-1.0.0-current",
        "jackal-_production_pwa_-1.0.0-old"
    ]);
    const stagingWorker = loadServiceWorker({ buildStamp: "current", scope: STAGING_SCOPE, cacheBackend });
    const productionWorker = loadServiceWorker({ buildStamp: "current", scope: PRODUCTION_SCOPE, cacheBackend });

    await runActivate(stagingWorker);
    assert.deepEqual(cacheBackend.deletedNames, ["jackal-_stage_pwa_-1.0.0-old"]);

    await runActivate(productionWorker);
    assert.deepEqual(cacheBackend.deletedNames, ["jackal-_stage_pwa_-1.0.0-old", "jackal-_production_pwa_-1.0.0-old"]);
});

test("service worker resource cache URLs resolve under the current deployment scope", () => {
    const stagingWorker = loadServiceWorker({ buildStamp: "current", scope: STAGING_SCOPE });
    const productionWorker = loadServiceWorker({ buildStamp: "current", scope: PRODUCTION_SCOPE });

    assert.equal(stagingWorker.createCacheUrl("./resources/images/map.dat"), `${STAGING_SCOPE}resources/images/map.dat?v=current`);
    assert.equal(productionWorker.createCacheUrl("./resources/images/map.dat"), `${PRODUCTION_SCOPE}resources/images/map.dat?v=current`);
    assert.equal(stagingWorker.createCacheUrl("./resources/images/map.dat?v=new"), `${STAGING_SCOPE}resources/images/map.dat?v=new`);
    assert.notEqual(stagingWorker.createCacheUrl("./resources/images/map.dat?v=new"), stagingWorker.createCacheUrl("./resources/images/map.dat"));
});

test("old worker cache does not satisfy a request for a newer deployment version", async () => {
    const oldCacheUrl = `${SCOPE}resources/images/map.dat?v=old`;
    const newCacheUrl = `${SCOPE}resources/images/map.dat?v=new`;
    const cacheBackend = createCacheBackend([[oldCacheUrl, createResponse("cached-old")]]);
    const networkResponse = createResponse("network-new");
    const worker = loadServiceWorker({
        buildStamp: "old",
        cacheBackend,
        fetchHandler: async () => networkResponse
    });

    const response = await runFetch(worker, {
        method: "GET",
        mode: "same-origin",
        url: newCacheUrl
    });

    assert.equal(response, networkResponse);
    assert.deepEqual(cacheBackend.matchedUrls, [newCacheUrl]);
    assert.deepEqual(cacheBackend.putUrls, []);
});

test("current worker matches a current-version cached resource", async () => {
    const currentCacheUrl = `${SCOPE}resources/images/map.dat?v=current`;
    const cachedResponse = createResponse("cached-current");
    const cacheBackend = createCacheBackend([[currentCacheUrl, cachedResponse]]);
    const worker = loadServiceWorker({
        buildStamp: "current",
        cacheBackend,
        fetchHandler: async () => {
            throw new Error("Fetch should not be called for a cache hit.");
        }
    });

    const response = await runFetch(worker, {
        method: "GET",
        mode: "same-origin",
        url: currentCacheUrl
    });

    assert.equal(response, cachedResponse);
    assert.deepEqual(cacheBackend.matchedUrls, [currentCacheUrl]);
    assert.deepEqual(cacheBackend.putUrls, []);
});

test("offline navigation fallback uses the current-version cached index", async () => {
    const indexCacheUrl = `${SCOPE}index.html?v=current`;
    const cachedIndex = createResponse("cached-index");
    const cacheBackend = createCacheBackend([[indexCacheUrl, cachedIndex]]);
    const worker = loadServiceWorker({
        buildStamp: "current",
        cacheBackend,
        fetchHandler: async () => {
            throw new Error("offline");
        }
    });

    const response = await runFetch(worker, {
        method: "GET",
        mode: "navigate",
        url: `${SCOPE}?v=current`
    });

    assert.equal(response, cachedIndex);
    assert.deepEqual(cacheBackend.matchedUrls, [indexCacheUrl]);
});

test("runtime fetches do not mutate immutable build-resource caches", async () => {
    const cacheBackend = createCacheBackend();
    const navigationResponse = createResponse("network-index");
    const resourceResponse = createResponse("network-resource");
    const worker = loadServiceWorker({
        cacheBackend,
        fetchHandler: async (request) => (request.mode === "navigate" ? navigationResponse : resourceResponse)
    });

    const navigationResult = await runFetch(worker, {
        method: "GET",
        mode: "navigate",
        url: `${SCOPE}?v=current`
    });
    const resourceResult = await runFetch(worker, {
        method: "GET",
        mode: "same-origin",
        url: `${SCOPE}resources/images/map.dat?v=current`
    });

    assert.equal(navigationResult, navigationResponse);
    assert.equal(resourceResult, resourceResponse);
    assert.deepEqual(cacheBackend.putUrls, []);
});
