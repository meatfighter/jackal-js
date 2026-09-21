import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const storage = new Map();
let throwOnGet = false;
let throwOnSet = false;

globalThis.localStorage = {
    getItem(key) {
        if (throwOnGet) throw new Error("get blocked");
        return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
        if (throwOnSet) throw new Error("set blocked");
        storage.set(key, String(value));
    },
    removeItem(key) {
        storage.delete(key);
    }
};

function resetStorage() {
    storage.clear();
    throwOnGet = false;
    throwOnSet = false;
}

function setLocation(href) {
    Object.defineProperty(globalThis, "location", { value: new URL(href), configurable: true, writable: true });
}

function compileModule(source) {
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
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
    const buttonMappingModuleUrl = compileModule(`
        export class ButtonMapping {
            static NO_BINDING = -1;
            static isReservedKey(key) { return key === 1; }
            static isLogicalControllerDirection(value) { return value >= -5 && value <= -2; }
            static isValidKeyBinding(value) {
                return Number.isInteger(value) && (value === -1 || (value >= 0 && value < 256 && value !== 1 && value !== 0x90 && value !== 999));
            }
            static isValidRawControllerButton(value) {
                return Number.isInteger(value) && value >= 0 && value < 64;
            }
            static isValidControllerBinding(value) {
                return value === -1 || this.isLogicalControllerDirection(value) || this.isValidRawControllerButton(value);
            }
            static isValidControllerActionBinding(value) {
                return value === -1 || this.isValidRawControllerButton(value);
            }
        }
    `);
    const source = readFileSync(new URL("../pwa/src/app/JackalInputMappingStore.ts", import.meta.url), "utf8")
        .replace(`from "../jackal/ButtonMapping.js";`, `from "${buttonMappingModuleUrl}";`)
        .replace(`from "./DeploymentStorage.js";`, `from "${storageModuleUrl}";`);
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
        controllerUp: -2,
        controllerDown: -3,
        controllerLeft: -4,
        controllerRight: -5,
        controllerGrenade: 0,
        controllerGun: 2,
        controllerStart: 9,
        ...overrides
    };
}

const authorized = () => true;

test("input mappings with unbound controls survive save and restore", async () => {
    resetStorage();
    setLocation("https://example.test/stage/pwa/?v=old");
    const { JackalInputMappingStore } = await loadStore();
    const store = new JackalInputMappingStore();
    const saved = createMapping({ keyGun: -1, controllerLeft: -1 });
    const restored = createMapping();

    assert.deepEqual(store.save(saved, authorized), { saved: true });
    assert.equal(store.restore(restored), true);
    assert.deepEqual(restored, saved);
});

test("Space survives input mapping persistence as an ordinary browser gameplay key", async () => {
    resetStorage();
    setLocation("https://example.test/stage/pwa/");
    const { JackalInputMappingStore } = await loadStore();
    const store = new JackalInputMappingStore();
    const saved = createMapping({ keyGun: 57 });
    const restored = createMapping();

    assert.deepEqual(store.save(saved, authorized), { saved: true });
    assert.equal(store.restore(restored), true);
    assert.equal(restored.keyGun, 57);
    assert.deepEqual(restored, saved);
});

test("reserved keys, duplicate bindings, missing actions, and out-of-range controller buttons are rejected", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const key = storageKey("jackal.input-mapping", href);

    const invalidCases = [
        createMapping({ keyGun: 1 }),
        createMapping({ keyGun: 45 }),
        createMapping({ keyGun: -1, controllerGun: -1 }),
        createMapping({ controllerGun: 64 })
    ];
    for (const invalid of invalidCases) {
        const store = new JackalInputMappingStore();
        assert.deepEqual(store.save(invalid, authorized), { saved: false, reason: "invalid" });
        assert.equal(storage.has(key), false);
    }

    const rawButton12 = createMapping({ controllerGun: 12 });
    assert.deepEqual(new JackalInputMappingStore().save(rawButton12, authorized), { saved: true });
});

test("same-version invalid mappings are rejected but preserved for explicit reset", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const key = storageKey("jackal.input-mapping", href);

    storage.set(key, JSON.stringify({ version: 3, ...createMapping(), obsoleteField: true }));
    assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
    assert.equal(storage.has(key), true);
    assert.deepEqual(new JackalInputMappingStore().save(createMapping(), authorized), { saved: false, reason: "protected" });
});

test("browser-unreachable keyboard mappings are rejected and preserved on restore", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const key = storageKey("jackal.input-mapping", href);

    for (const keyGun of [999, 0x90]) {
        storage.set(key, JSON.stringify({ version: 3, ...createMapping(), keyGun }));
        assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
        assert.equal(storage.has(key), true);
        assert.deepEqual(new JackalInputMappingStore().save(createMapping(), authorized), { saved: false, reason: "protected" });
    }
});

test("controller button 63 is accepted and button 64 is rejected", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();

    const valid = createMapping({ controllerGun: 63 });
    assert.deepEqual(new JackalInputMappingStore().save(valid, authorized), { saved: true });
    const restored = createMapping();
    assert.equal(new JackalInputMappingStore().restore(restored), true);
    assert.equal(restored.controllerGun, 63);

    assert.deepEqual(new JackalInputMappingStore().save(createMapping({ controllerGun: 64 }), authorized), {
        saved: false,
        reason: "invalid"
    });
});

test("obsolete pre-public mappings are discarded instead of migrated", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/?v=old";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const key = storageKey("jackal.input-mapping", href);
    storage.set(key, JSON.stringify({ version: 2, ...createMapping() }));

    assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
    assert.equal(storage.has(key), false);
});

test("malformed input-mapping bytes are protected from automatic overwrite", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const key = storageKey("jackal.input-mapping", href);
    storage.set(key, "{");

    const store = new JackalInputMappingStore();
    assert.equal(store.restore(createMapping()), false);
    assert.equal(storage.get(key), "{");
    assert.deepEqual(store.save(createMapping(), authorized), { saved: false, reason: "protected" });
    assert.equal(storage.get(key), "{");
});

test("unknown nonpositive mapping versions are protected rather than treated as legacy", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const key = storageKey("jackal.input-mapping", href);
    const unknown = JSON.stringify({ version: 0, ...createMapping() });
    storage.set(key, unknown);

    const store = new JackalInputMappingStore();
    assert.equal(store.restore(createMapping()), false);
    assert.equal(storage.get(key), unknown);
    assert.deepEqual(store.save(createMapping(), authorized), { saved: false, reason: "protected" });
    assert.equal(storage.get(key), unknown);
});

test("future public input mappings are preserved and protected from overwrite", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/?v=old";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const key = storageKey("jackal.input-mapping", href);
    const futureSnapshot = JSON.stringify({ version: 4, futureShape: true });
    storage.set(key, futureSnapshot);

    const store = new JackalInputMappingStore();
    assert.equal(store.restore(createMapping()), false);
    assert.equal(storage.get(key), futureSnapshot);
    assert.deepEqual(store.save(createMapping({ keyGun: -1 }), authorized), { saved: false, reason: "protected" });
    assert.equal(storage.get(key), futureSnapshot);

    assert.equal(store.clear(authorized), true);
    assert.deepEqual(store.save(createMapping({ keyGun: -1 }), authorized), { saved: true });
    assert.notEqual(storage.get(key), futureSnapshot);
});

test("mapping write authority is rechecked immediately before storage write", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const key = storageKey("jackal.input-mapping", href);
    const store = new JackalInputMappingStore();

    assert.deepEqual(
        store.save(createMapping(), () => false),
        { saved: false, reason: "stale-session" }
    );
    assert.equal(storage.has(key), false);

    assert.deepEqual(store.save(createMapping({ keyGun: 57 }), authorized), { saved: true });
    const previous = storage.get(key);
    assert.deepEqual(
        store.save(createMapping({ keyGun: 44 }), () => false),
        { saved: false, reason: "stale-session" }
    );
    assert.equal(storage.get(key), previous);
});

test("storage failures produce unavailable without destroying the previous mapping", async () => {
    resetStorage();
    const href = "https://example.test/stage/pwa/";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    const key = storageKey("jackal.input-mapping", href);
    const store = new JackalInputMappingStore();

    assert.deepEqual(store.save(createMapping({ keyGun: 57 }), authorized), { saved: true });
    const previous = storage.get(key);

    throwOnSet = true;
    const warn = console.warn;
    console.warn = () => {};
    try {
        assert.deepEqual(store.save(createMapping({ keyGun: 44 }), authorized), { saved: false, reason: "unavailable" });
    } finally {
        console.warn = warn;
    }
    assert.equal(storage.get(key), previous);

    throwOnSet = false;
    throwOnGet = true;
    console.warn = () => {};
    try {
        assert.deepEqual(store.save(createMapping({ keyGun: 44 }), authorized), { saved: false, reason: "unavailable" });
    } finally {
        console.warn = warn;
    }
    assert.equal(storage.get(key), previous);
});

test("input mappings are isolated by deployment path and stable across cache-bust queries", async () => {
    resetStorage();
    const { JackalInputMappingStore } = await loadStore();
    const stageSaved = createMapping({ keyGun: -1 });
    const productionSaved = createMapping({ controllerGrenade: -1 });

    setLocation("https://example.test/stage/pwa/?v=old");
    assert.deepEqual(new JackalInputMappingStore().save(stageSaved, authorized), { saved: true });

    setLocation("https://example.test/production/pwa/?v=old");
    assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
    assert.deepEqual(new JackalInputMappingStore().save(productionSaved, authorized), { saved: true });

    const stageRestored = createMapping();
    setLocation("https://example.test/stage/pwa/?v=new");
    assert.equal(new JackalInputMappingStore().restore(stageRestored), true);
    assert.deepEqual(stageRestored, stageSaved);

    const productionRestored = createMapping();
    setLocation("https://example.test/production/pwa/?v=new");
    assert.equal(new JackalInputMappingStore().restore(productionRestored), true);
    assert.deepEqual(productionRestored, productionSaved);
});

test("corrupted staging mapping is preserved without affecting production mapping", async () => {
    resetStorage();
    const { JackalInputMappingStore } = await loadStore();
    const stageHref = "https://example.test/stage/pwa/?v=old";
    const productionHref = "https://example.test/production/pwa/?v=old";
    const productionKey = storageKey("jackal.input-mapping", productionHref);

    setLocation(productionHref);
    assert.deepEqual(new JackalInputMappingStore().save(createMapping({ keyGun: -1 }), authorized), { saved: true });

    storage.set(storageKey("jackal.input-mapping", stageHref), JSON.stringify({ version: 3, ...createMapping(), keyGun: 1 }));

    setLocation(stageHref);
    assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
    assert.equal(storage.has(storageKey("jackal.input-mapping", stageHref)), true);
    assert.deepEqual(new JackalInputMappingStore().save(createMapping(), authorized), { saved: false, reason: "protected" });
    assert.equal(storage.has(productionKey), true);
});
