import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const storage = new Map();

globalThis.localStorage = {
    getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
        storage.set(key, String(value));
    },
    removeItem(key) {
        storage.delete(key);
    }
};

function setLocation(href) {
    Object.defineProperty(globalThis, "location", {
        value: new URL(href),
        configurable: true,
        writable: true
    });
}

function compileModule(source) {
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}

async function loadStore() {
    const helperSource = readFileSync(new URL("../pwa/src/app/DeploymentStorageKeys.ts", import.meta.url), "utf8");
    const helperModuleUrl = compileModule(helperSource);
    const storageSource = readFileSync(new URL("../pwa/src/app/DeploymentStorage.ts", import.meta.url), "utf8").replace(
        `from "./DeploymentStorageKeys.js";`,
        `from "${helperModuleUrl}";`
    );
    const storageModuleUrl = compileModule(storageSource);
    const source = readFileSync(new URL("../pwa/src/app/JackalInputMappingStore.ts", import.meta.url), "utf8").replace(
        `from "./DeploymentStorage.js";`,
        `from "${storageModuleUrl}";`
    );
    return import(compileModule(source));
}

function storageKey(baseKey, href) {
    return `${baseKey}:${encodeURIComponent(new URL("./", href).pathname)}`;
}

function createMapping(overrides = {}) {
    return {
        keyUp: 200,
        keyDown: 208,
        keyLeft: 203,
        keyRight: 205,
        keyGrenade: 45,
        keyGun: 44,
        keyStart: 28,
        controller: true,
        controllerIndex: 0,
        controllerUp: 12,
        controllerDown: 13,
        controllerLeft: 14,
        controllerRight: 15,
        controllerGrenade: 0,
        controllerGun: 2,
        controllerStart: 9,
        gunKeyMapped: true,
        ...overrides
    };
}

test("input mappings with unbound controls survive save and restore", async () => {
    storage.clear();
    setLocation("https://example.test/stage/pwa/?v=old");
    const { JackalInputMappingStore } = await loadStore();
    const store = new JackalInputMappingStore();
    const saved = createMapping({
        keyGun: -1,
        controllerLeft: -1,
        controllerGun: -1
    });
    const restored = createMapping();

    assert.equal(store.save(saved), true);
    assert.equal(store.restore(restored), true);
    assert.deepEqual(restored, saved);
});

test("negative controller indexes are still rejected", async () => {
    storage.clear();
    const href = "https://example.test/stage/pwa/?v=old";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const store = new JackalInputMappingStore();
    storage.set(
        storageKey("jackal.input-mapping", href),
        JSON.stringify({
            version: 1,
            ...createMapping({ controllerIndex: -1 })
        })
    );

    assert.equal(store.restore(createMapping()), false);
    assert.equal(storage.has(storageKey("jackal.input-mapping", href)), false);
});

test("input mappings are isolated by deployment path and stable across cache-bust queries", async () => {
    storage.clear();
    const { JackalInputMappingStore } = await loadStore();
    const stageSaved = createMapping({ keyGun: -1, controllerGun: -1 });
    const productionSaved = createMapping({ keyGrenade: -1, controllerGrenade: -1 });

    setLocation("https://example.test/stage/pwa/?v=old");
    assert.equal(new JackalInputMappingStore().save(stageSaved), true);

    setLocation("https://example.test/production/pwa/?v=old");
    assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
    assert.equal(new JackalInputMappingStore().save(productionSaved), true);

    const stageRestored = createMapping();
    setLocation("https://example.test/stage/pwa/?v=new");
    assert.equal(new JackalInputMappingStore().restore(stageRestored), true);
    assert.deepEqual(stageRestored, stageSaved);

    const productionRestored = createMapping();
    setLocation("https://example.test/production/pwa/?v=new");
    assert.equal(new JackalInputMappingStore().restore(productionRestored), true);
    assert.deepEqual(productionRestored, productionSaved);
});

test("corrupted staging input mapping cleanup preserves production mapping", async () => {
    storage.clear();
    const { JackalInputMappingStore } = await loadStore();
    const stageHref = "https://example.test/stage/pwa/?v=old";
    const productionHref = "https://example.test/production/pwa/?v=old";
    const productionKey = storageKey("jackal.input-mapping", productionHref);

    setLocation(productionHref);
    assert.equal(new JackalInputMappingStore().save(createMapping({ keyGun: -1 })), true);

    storage.set(
        storageKey("jackal.input-mapping", stageHref),
        JSON.stringify({
            version: 1,
            ...createMapping({ controllerIndex: -1 })
        })
    );

    setLocation(stageHref);
    assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
    assert.equal(storage.has(storageKey("jackal.input-mapping", stageHref)), false);
    assert.equal(storage.has(productionKey), true);
});
