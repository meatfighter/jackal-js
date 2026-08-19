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

async function loadStore() {
    const source = readFileSync(new URL("../pwa/src/app/JackalInputMappingStore.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
    return import(moduleUrl);
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
    const { JackalInputMappingStore } = await loadStore();
    const store = new JackalInputMappingStore();
    storage.set(
        "jackal.input-mapping",
        JSON.stringify({
            version: 1,
            ...createMapping({ controllerIndex: -1 })
        })
    );

    assert.equal(store.restore(createMapping()), false);
    assert.equal(storage.has("jackal.input-mapping"), false);
});
