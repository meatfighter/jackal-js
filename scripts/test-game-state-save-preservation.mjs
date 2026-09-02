import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const gameStateBaseKey = "jackal.game-state";
const storage = new Map();
let throwOnGet = false;

globalThis.localStorage = {
    getItem(key) {
        if (throwOnGet) throw new Error("localStorage getItem failed");
        return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
        storage.set(key, String(value));
    },
    removeItem(key) {
        storage.delete(key);
    }
};

function resetStorage() {
    storage.clear();
    throwOnGet = false;
    setLocation("https://example.test/stage/pwa/?v=old");
}

function setLocation(href) {
    Object.defineProperty(globalThis, "location", { value: new URL(href), configurable: true, writable: true });
}

function gameStateStorageKey(href = globalThis.location.href) {
    return `${gameStateBaseKey}:${encodeURIComponent(new URL("./", href).pathname)}`;
}

function compileModule(source) {
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}

async function withMutedConsoleWarn(task) {
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
        return await task();
    } finally {
        console.warn = originalWarn;
    }
}

async function loadPersistenceModules() {
    const keysUrl = compileModule(readFileSync(new URL("../pwa/src/app/DeploymentStorageKeys.ts", import.meta.url), "utf8"));
    const deploymentStorageUrl = compileModule(
        readFileSync(new URL("../pwa/src/app/DeploymentStorage.ts", import.meta.url), "utf8").replace(`from "./DeploymentStorageKeys.js"`, `from "${keysUrl}"`)
    );
    const schemaUrl = compileModule(readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSchema.ts", import.meta.url), "utf8"));
    const validatorUrl = compileModule(`
        export function isSupportedGameStateSnapshot(snapshot) {
            return typeof snapshot === "object" && snapshot !== null && snapshot.version === 7 && snapshot.supported === true;
        }
    `);
    const storageSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateStorage.ts", import.meta.url), "utf8")
        .replace(`from "../../app/DeploymentStorage.js"`, `from "${deploymentStorageUrl}"`)
        .replace(`from "./GameStateSchema.js"`, `from "${schemaUrl}"`)
        .replace(`from "./GameStateSnapshotValidator.js"`, `from "${validatorUrl}"`);
    const gameStorageUrl = compileModule(storageSource);
    const serializerUrl = compileModule(`
        export class JackalGameStateSerializer {
            createSnapshot(main, appVersion) {
                return { version: 7, kind: "mode", supported: true, appVersion, marker: main.marker ?? "saved" };
            }
            restoreSnapshot(main, gc, snapshot) {
                if (snapshot.throwOnRestore === true) throw new Error("restore failed");
                main.restoredMarker = snapshot.marker ?? "restored";
            }
        }
    `);
    const storeSource = readFileSync(new URL("../pwa/src/jackal/persistence/JackalGameStateStore.ts", import.meta.url), "utf8")
        .replace(`from "./GameStateStorage.js"`, `from "${gameStorageUrl}"`)
        .replace(`from "./JackalGameStateSerializer.js"`, `from "${serializerUrl}"`);
    const storeUrl = compileModule(storeSource);
    return Promise.all([import(gameStorageUrl), import(storeUrl)]).then(([gameStorage, store]) => ({ gameStorage, ...store }));
}

test("restore exceptions preserve the current stored game-state snapshot", async () => {
    await withMutedConsoleWarn(async () => {
        resetStorage();
        const { JackalGameStateStore } = await loadPersistenceModules();
        const key = gameStateStorageKey();
        storage.set(key, JSON.stringify({ version: 7, kind: "mode", supported: true, marker: "keep", throwOnRestore: true }));
        assert.equal(new JackalGameStateStore("1.0.0").restore({}, {}), false);
        assert.equal(storage.has(key), true);
    });
});

test("shared game-state preflight preserves future saves and storage read failures", async () => {
    await withMutedConsoleWarn(async () => {
        resetStorage();
        const { gameStorage } = await loadPersistenceModules();
        const key = gameStateStorageKey();
        storage.set(key, JSON.stringify({ version: 8, kind: "game", futureShape: true }));
        assert.equal(gameStorage.hasCurrentStoredGameState(), false);
        assert.equal(storage.has(key), true);

        throwOnGet = true;
        assert.equal(gameStorage.hasCurrentStoredGameState(), false);
        assert.equal(storage.has(key), true);
    });
});

test("game-state storage clears malformed and obsolete formats while retaining future data", async () => {
    resetStorage();
    const { JackalGameStateStore } = await loadPersistenceModules();
    const store = new JackalGameStateStore("1.0.0");
    const key = gameStateStorageKey();

    storage.set(key, JSON.stringify({ version: 8, kind: "mode", futureShape: true }));
    assert.equal(store.hasValidSave(), false);
    assert.equal(storage.has(key), true);

    storage.set(key, JSON.stringify({ version: 5, kind: "game", supported: true }));
    assert.equal(store.hasValidSave(), false);
    assert.equal(storage.has(key), false);

    storage.set(key, JSON.stringify({ version: 7, kind: "game", supported: false }));
    assert.equal(store.hasValidSave(), false);
    assert.equal(storage.has(key), false);

    storage.set(key, "{");
    assert.equal(store.hasValidSave(), false);
    assert.equal(storage.has(key), false);
});

test("game-state inspection preserves data when storage reads fail", async () => {
    await withMutedConsoleWarn(async () => {
        resetStorage();
        const { JackalGameStateStore } = await loadPersistenceModules();
        const key = gameStateStorageKey();
        storage.set(key, JSON.stringify({ version: 7, kind: "mode", supported: true }));
        throwOnGet = true;
        assert.equal(new JackalGameStateStore("1.0.0").hasValidSave(), false);
        assert.equal(storage.has(key), true);
    });
});
