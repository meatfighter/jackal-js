import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const storage = new Map();
let throwOnGet = false;
const gameStateSchemaSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSchema.ts", import.meta.url), "utf8");
const gameStateBaseKey = /GAME_STATE_STORAGE_KEY\s*=\s*"([^"]+)"/.exec(gameStateSchemaSource)?.[1];
const currentGameStateVersion = Number(/GAME_STATE_VERSION\s*=\s*(\d+)/.exec(gameStateSchemaSource)?.[1]);
const maxGameStateTextLength = Number((/MAX_GAME_STATE_TEXT_LENGTH\s*=\s*([\d_]+)/.exec(gameStateSchemaSource)?.[1] ?? "").replaceAll("_", ""));
if (typeof gameStateBaseKey !== "string" || !Number.isInteger(currentGameStateVersion) || !Number.isInteger(maxGameStateTextLength)) {
    throw new Error("Unable to determine the current Jackal game-state schema limits.");
}

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
    const schemaUrl = compileModule(gameStateSchemaSource);
    const validatorUrl = compileModule(`
        export function isSupportedGameStateSnapshot(snapshot) {
            return typeof snapshot === "object" && snapshot !== null && snapshot.version === ${currentGameStateVersion} && snapshot.supported === true;
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
                return { version: ${currentGameStateVersion}, kind: "mode", supported: true, appVersion, marker: main.marker ?? "saved" };
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
        storage.set(key, JSON.stringify({ version: currentGameStateVersion, kind: "mode", supported: true, marker: "keep", throwOnRestore: true }));
        assert.equal(new JackalGameStateStore("1.0.0").restore({}, {}), { saved: false, reason: "unsupported-future" });
        assert.equal(storage.has(key), true);
    });
});

test("shared game-state preflight preserves incompatible saves and blocks overwrite", async () => {
    await withMutedConsoleWarn(async () => {
        resetStorage();
        const { gameStorage } = await loadPersistenceModules();
        const key = gameStateStorageKey();
        const futureSnapshot = JSON.stringify({ version: currentGameStateVersion + 1, kind: "game", futureShape: true });
        storage.set(key, futureSnapshot);
        assert.equal(gameStorage.hasCurrentStoredGameState(), { saved: false, reason: "unsupported-future" });
        assert.equal(storage.get(key), futureSnapshot);
        assert.deepEqual(gameStorage.writeStoredGameState({ version: currentGameStateVersion, kind: "mode", supported: true }, () => true), { saved: false, reason: "unsupported-future" });
        assert.equal(storage.get(key), futureSnapshot);

        const oversizedSnapshot = "x".repeat(maxGameStateTextLength + 1);
        storage.set(key, oversizedSnapshot);
        assert.equal(gameStorage.hasCurrentStoredGameState(), { saved: false, reason: "unsupported-future" });
        assert.equal(storage.get(key), oversizedSnapshot);
        assert.deepEqual(gameStorage.writeStoredGameState({ version: currentGameStateVersion, kind: "mode", supported: true }, () => true), { saved: false, reason: "unsupported-future" });
        assert.equal(storage.get(key), oversizedSnapshot);

        throwOnGet = true;
        assert.equal(gameStorage.hasCurrentStoredGameState(), { saved: false, reason: "unsupported-future" });
        assert.deepEqual(gameStorage.writeStoredGameState({ version: currentGameStateVersion, kind: "mode", supported: true }, () => true), { saved: false, reason: "unsupported-future" });
        assert.equal(storage.get(key), oversizedSnapshot);
    });
});

test("game-state write authority is rechecked at the actual storage boundary", async () => {
    resetStorage();
    const { gameStorage } = await loadPersistenceModules();
    const key = gameStateStorageKey();
    storage.set(key, JSON.stringify({ version: currentGameStateVersion, kind: "mode", supported: true, marker: "keep" }));

    let authorized = false;
    const result = gameStorage.writeStoredGameState(
        { version: currentGameStateVersion, kind: "mode", supported: true, marker: "replace" },
        () => authorized
    );
    assert.deepEqual(result, { saved: false, reason: "not-authorized" });
    assert.equal(JSON.parse(storage.get(key)).marker, "keep");

    authorized = true;
    const saved = gameStorage.writeStoredGameState(
        { version: currentGameStateVersion, kind: "mode", supported: true, marker: "replace" },
        () => authorized
    );
    assert.deepEqual(saved, { saved: true });
    assert.equal(JSON.parse(storage.get(key)).marker, "replace");
});

test("game-state inspection distinguishes protected future state from invalid data", async () => {
    resetStorage();
    const { gameStorage } = await loadPersistenceModules();
    const key = gameStateStorageKey();

    storage.set(key, JSON.stringify({ version: currentGameStateVersion + 1, futureShape: true }));
    assert.deepEqual(gameStorage.inspectStoredGameState(), {
        status: "unsupported-future",
        version: currentGameStateVersion + 1
    });

    storage.set(key, JSON.stringify({ version: currentGameStateVersion - 1, oldShape: true }));
    assert.deepEqual(gameStorage.inspectStoredGameState(), { status: "invalid" });

    throwOnGet = true;
    assert.deepEqual(gameStorage.inspectStoredGameState(), { status: "read-failed" });
});

test("game-state inspection never deletes future, unsupported, or malformed data", async () => {
    resetStorage();
    const { JackalGameStateStore } = await loadPersistenceModules();
    const store = new JackalGameStateStore("1.0.0");
    const key = gameStateStorageKey();

    for (const value of [JSON.stringify({ version: currentGameStateVersion + 1, kind: "mode", futureShape: true }), "{"]) {
        storage.set(key, value);
        assert.equal(store.hasValidSave(), { saved: false, reason: "unsupported-future" });
        assert.equal(storage.get(key), value);
    }
});

test("game-state inspection preserves data when storage reads fail", async () => {
    await withMutedConsoleWarn(async () => {
        resetStorage();
        const { JackalGameStateStore } = await loadPersistenceModules();
        const key = gameStateStorageKey();
        storage.set(key, JSON.stringify({ version: currentGameStateVersion, kind: "mode", supported: true }));
        throwOnGet = true;
        assert.equal(new JackalGameStateStore("1.0.0").hasValidSave(), { saved: false, reason: "unsupported-future" });
        assert.equal(storage.has(key), true);
    });
});
