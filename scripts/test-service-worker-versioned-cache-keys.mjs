import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const SERVICE_WORKER_SOURCE = readFileSync(new URL("../pwa/public/sw.js", import.meta.url), "utf8");
const SCOPE = "https://example.test/pwa/";
const STAGING_SCOPE = "https://example.test/stage/pwa/";
const PRODUCTION_SCOPE = "https://example.test/production/pwa/";
const PREFIX_PARENT_SCOPE = "https://example.test/a/pwa/";
const PREFIX_CHILD_SCOPE = "https://example.test/a/pwa/-stage/pwa/";

function loadServiceWorker({
    appVersion = "1.0.0",
    buildStamp = "current",
    resourceVersions = {},
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
        AbortController,
        Request,
        Response,
        Headers,
        setTimeout,
        clearTimeout,
        caches: cacheBackend.caches,
        fetch: fetchHandler,
        self
    };
    const source = SERVICE_WORKER_SOURCE.replaceAll("__APP_VERSION__", appVersion)
        .replaceAll("__BUILD_STAMP__", buildStamp)
        .replaceAll("__RESOURCE_VERSIONS__", JSON.stringify(resourceVersions));

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
            urls = urls.map((url) => (typeof url === "string" ? url : url.url));
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
            match: async (url) => cache.match(url),
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

function createResponse(label, { ok = true } = {}) {
    const response = new Response(label, { status: ok ? 200 : 503, headers: { "Content-Type": "text/html" } });
    response.label = label;
    return response;
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

function runFetchIfHandled(worker, request) {
    request.signal ??= new AbortController().signal;
    let responsePromise = null;
    const listener = worker.listeners.get("fetch");
    assert.equal(typeof listener, "function");
    listener({
        request,
        respondWith(promise) {
            responsePromise = Promise.resolve(promise);
        }
    });
    return responsePromise;
}

async function runFetch(worker, request) {
    const responsePromise = runFetchIfHandled(worker, request);
    assert.notEqual(responsePromise, null);
    return responsePromise;
}

test("service worker cache keys add the current build stamp when v is absent", () => {
    const worker = loadServiceWorker({ buildStamp: "current" });

    assert.equal(worker.createCacheUrl("./resources/images/map.dat"), `${SCOPE}resources/images/map.dat?v=current`);
    assert.equal(worker.createCacheUrl("./resources/images/map.dat?palette=blue"), `${SCOPE}resources/images/map.dat?palette=blue&v=current`);
    assert.notEqual(worker.createCacheUrl("./resources/images/map.dat"), worker.createCacheUrl("./resources/images/map.dat?palette=blue"));
});

test("service worker cache keys use stable content versions for known game resources", () => {
    const worker = loadServiceWorker({
        buildStamp: "current",
        resourceVersions: { "images/map.dat": "content-map" }
    });

    assert.equal(worker.createCacheUrl("./resources/images/map.dat"), `${SCOPE}resources/images/map.dat?v=content-map`);
    assert.equal(worker.createCacheUrl("./resources/images/unknown.dat"), `${SCOPE}resources/images/unknown.dat?v=current`);
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
    const cacheBackend = createCacheBackend(
        [],
        [
            "jackal|%2Fpwa%2F|1.0.0-current",
            "jackal|%2Fpwa%2F|1.0.0-old",
            "jackal|%2Fpwa%2F|legacy",
            "jackal|%2Fproduction%2Fpwa%2F|1.0.0-old",
            "jackal-%2Fpwa%2F-legacy",
            "jackal-1.0.0-old",
            "other-cache"
        ]
    );
    const worker = loadServiceWorker({ buildStamp: "current", cacheBackend });

    await runActivate(worker);

    assert.deepEqual(cacheBackend.deletedNames, ["jackal|%2Fpwa%2F|1.0.0-old", "jackal|%2Fpwa%2F|legacy"]);
    assert.equal(worker.claimCalls.length, 1);
});

test("cache name uses embedded build tokens even from a stale worker URL", () => {
    const worker = loadServiceWorker({
        appVersion: "2.3.4",
        buildStamp: "current",
        selfLocation: `${SCOPE}sw.js?v=old`
    });

    assert.equal(worker.CACHE_NAME, "jackal|%2Fpwa%2F|2.3.4-current");
});

test("service worker cache names are isolated by deployment scope", () => {
    const stagingWorker = loadServiceWorker({ buildStamp: "same", scope: STAGING_SCOPE });
    const productionWorker = loadServiceWorker({ buildStamp: "same", scope: PRODUCTION_SCOPE });

    assert.equal(stagingWorker.CACHE_PREFIX, "jackal|%2Fstage%2Fpwa%2F|");
    assert.equal(productionWorker.CACHE_PREFIX, "jackal|%2Fproduction%2Fpwa%2F|");
    assert.notEqual(stagingWorker.CACHE_NAME, productionWorker.CACHE_NAME);
});

test("service worker cache prefixes do not collide for slash, underscore, plus, or prefix-containing paths", () => {
    const nestedWorker = loadServiceWorker({ scope: "https://example.test/a/b/" });
    const underscoreWorker = loadServiceWorker({ scope: "https://example.test/a_b/" });
    const plusWorker = loadServiceWorker({ scope: "https://example.test/a+b/" });
    const prefixParentWorker = loadServiceWorker({ scope: PREFIX_PARENT_SCOPE });
    const prefixChildWorker = loadServiceWorker({ scope: PREFIX_CHILD_SCOPE });

    assert.equal(nestedWorker.CACHE_PREFIX, "jackal|%2Fa%2Fb%2F|");
    assert.equal(underscoreWorker.CACHE_PREFIX, "jackal|%2Fa_b%2F|");
    assert.equal(plusWorker.CACHE_PREFIX, "jackal|%2Fa%2Bb%2F|");
    assert.equal(prefixParentWorker.CACHE_PREFIX, "jackal|%2Fa%2Fpwa%2F|");
    assert.equal(prefixChildWorker.CACHE_PREFIX, "jackal|%2Fa%2Fpwa%2F-stage%2Fpwa%2F|");
    assert.equal(
        new Set([
            nestedWorker.CACHE_PREFIX,
            underscoreWorker.CACHE_PREFIX,
            plusWorker.CACHE_PREFIX,
            prefixParentWorker.CACHE_PREFIX,
            prefixChildWorker.CACHE_PREFIX
        ]).size,
        5
    );
});

test("side-by-side deployment activation only cleans the current scope", async () => {
    const cacheBackend = createCacheBackend(
        [],
        [
            "jackal|%2Fstage%2Fpwa%2F|1.0.0-current",
            "jackal|%2Fstage%2Fpwa%2F|1.0.0-old",
            "jackal|%2Fproduction%2Fpwa%2F|1.0.0-current",
            "jackal|%2Fproduction%2Fpwa%2F|1.0.0-old"
        ]
    );
    const stagingWorker = loadServiceWorker({ buildStamp: "current", scope: STAGING_SCOPE, cacheBackend });
    const productionWorker = loadServiceWorker({ buildStamp: "current", scope: PRODUCTION_SCOPE, cacheBackend });

    await runActivate(stagingWorker);
    assert.deepEqual(cacheBackend.deletedNames, ["jackal|%2Fstage%2Fpwa%2F|1.0.0-old"]);

    await runActivate(productionWorker);
    assert.deepEqual(cacheBackend.deletedNames, ["jackal|%2Fstage%2Fpwa%2F|1.0.0-old", "jackal|%2Fproduction%2Fpwa%2F|1.0.0-old"]);
});

test("activation does not delete caches whose encoded scope only shares a prefix", async () => {
    const cacheBackend = createCacheBackend(
        [],
        [
            "jackal|%2Fa%2Fpwa%2F|1.0.0-current",
            "jackal|%2Fa%2Fpwa%2F|1.0.0-old",
            "jackal|%2Fa%2Fpwa%2F-stage%2Fpwa%2F|1.0.0-current",
            "jackal|%2Fa%2Fpwa%2F-stage%2Fpwa%2F|1.0.0-old"
        ]
    );
    const parentWorker = loadServiceWorker({ buildStamp: "current", scope: PREFIX_PARENT_SCOPE, cacheBackend });
    const childWorker = loadServiceWorker({ buildStamp: "current", scope: PREFIX_CHILD_SCOPE, cacheBackend });

    await runActivate(parentWorker);
    assert.deepEqual(cacheBackend.deletedNames, ["jackal|%2Fa%2Fpwa%2F|1.0.0-old"]);

    await runActivate(childWorker);
    assert.deepEqual(cacheBackend.deletedNames, ["jackal|%2Fa%2Fpwa%2F|1.0.0-old", "jackal|%2Fa%2Fpwa%2F-stage%2Fpwa%2F|1.0.0-old"]);
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

    assert.equal(await navigationResult.text(), "network-index");
    assert.equal(resourceResult, resourceResponse);
    assert.deepEqual(cacheBackend.putUrls, []);
});

test("service worker ignores cross-origin and out-of-scope requests", () => {
    const worker = loadServiceWorker();

    assert.equal(
        runFetchIfHandled(worker, {
            method: "GET",
            mode: "cors",
            url: "https://cdn.example.test/game-resource.dat"
        }),
        null
    );
    assert.equal(
        runFetchIfHandled(worker, {
            method: "GET",
            mode: "same-origin",
            url: "https://example.test/another-app/resource.dat"
        }),
        null
    );
    assert.equal(
        runFetchIfHandled(worker, {
            method: "POST",
            mode: "same-origin",
            url: `${SCOPE}api`
        }),
        null
    );
});
