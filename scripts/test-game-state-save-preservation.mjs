import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const gameStateBaseKey = "jackal.game-state";
const storage = new Map();
let throwOnGet = false;
const noop = () => {};

globalThis.localStorage = {
    getItem(key) {
        if (throwOnGet) {
            throw new Error("localStorage getItem failed");
        }
        return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
        storage.set(key, String(value));
    },
    removeItem(key) {
        storage.delete(key);
    }
};

globalThis.window = {
    addEventListener: noop,
    removeEventListener: noop,
    setTimeout,
    clearTimeout,
    visualViewport: null,
    innerWidth: 1024,
    innerHeight: 768
};

globalThis.document = {
    addEventListener: noop,
    removeEventListener: noop,
    documentElement: {
        clientWidth: 1024,
        clientHeight: 768
    },
    exitFullscreen: undefined,
    fullscreenElement: null,
    hasFocus: () => true,
    visibilityState: "visible"
};

function resetStorage() {
    storage.clear();
    throwOnGet = false;
    setLocation("https://example.test/stage/pwa/?v=old");
}

function setLocation(href) {
    const url = new URL(href);
    Object.defineProperty(globalThis, "location", {
        value: url,
        configurable: true,
        writable: true
    });
    Object.defineProperty(globalThis.window, "location", {
        value: url,
        configurable: true,
        writable: true
    });
}

function storageKey(baseKey, href = globalThis.location.href) {
    return `${baseKey}:${encodeURIComponent(new URL("./", href).pathname)}`;
}

function gameStateStorageKey(href = globalThis.location.href) {
    return storageKey(gameStateBaseKey, href);
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

async function withMutedConsoleWarn(task) {
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
        return await task();
    } finally {
        console.warn = originalWarn;
    }
}

async function loadGameStateStore() {
    const helperModuleUrl = compileModule(readFileSync(new URL("../pwa/src/app/DeploymentStorageKeys.ts", import.meta.url), "utf8"));
    const schemaModuleUrl = compileModule(readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSchema.ts", import.meta.url), "utf8"));
    const serializerModuleUrl = compileModule(`
        export class JackalGameStateSerializer {
            createSnapshot(main, appVersion) {
                return { version: 5, kind: "mode", supported: true, appVersion, marker: main.marker ?? "saved" };
            }

            isSupportedSnapshot(snapshot) {
                return typeof snapshot === "object" && snapshot !== null && (snapshot.version === 4 || snapshot.version === 5) && snapshot.supported === true;
            }

            restoreSnapshot(main, gc, snapshot) {
                if (snapshot.throwOnRestore === true) {
                    throw new Error("restore failed");
                }
                main.restoredMarker = snapshot.marker ?? "restored";
            }
        }
    `);
    const source = readFileSync(new URL("../pwa/src/jackal/persistence/JackalGameStateStore.ts", import.meta.url), "utf8")
        .replace(
            `import { getDeploymentStorageKey } from "../../app/DeploymentStorageKeys.js";`,
            `import { getDeploymentStorageKey } from "${helperModuleUrl}";`
        )
        .replace(
            `import { GAME_STATE_STORAGE_KEY, isFutureGameStateSnapshot } from "./GameStateSchema.js";`,
            `import { GAME_STATE_STORAGE_KEY, isFutureGameStateSnapshot } from "${schemaModuleUrl}";`
        )
        .replace(
            `import { JackalGameStateSerializer } from "./JackalGameStateSerializer.js";`,
            `import { JackalGameStateSerializer } from "${serializerModuleUrl}";`
        );
    return import(compileModule(source));
}

async function loadWebApp() {
    const helperModuleUrl = compileModule(readFileSync(new URL("../pwa/src/app/DeploymentStorageKeys.ts", import.meta.url), "utf8"));
    const source = readFileSync(new URL("../pwa/src/app/JackalWebApp.ts", import.meta.url), "utf8")
        .replace(
            `import { SoundStore } from "slick2d-ts/slick/openal/SoundStore";`,
            `const SoundStore = { get: () => ({ setSoundVolume() {}, setMusicVolume() {}, stopAllPlayback() {}, unlock: async () => {} }) };`
        )
        .replace(
            `import { ResourceLoader } from "slick2d-ts/slick/util/ResourceLoader";`,
            `const ResourceLoader = { clearFailures() {}, waitForAll: async () => {}, getResourceAsStream: async () => null };`
        )
        .replace(
            `import { GAME_STATE_STORAGE_KEY, isFutureGameStateSnapshot } from "../jackal/persistence/GameStateSchema.js";`,
            `const GAME_STATE_STORAGE_KEY = "${gameStateBaseKey}"; const isFutureGameStateSnapshot = (snapshot) => typeof snapshot === "object" && snapshot !== null && Number.isInteger(snapshot.version) && snapshot.version > 5;`
        )
        .replace(
            `import { isSupportedGameStateSnapshot } from "../jackal/persistence/GameStateSnapshotValidator.js";`,
            `const isSupportedGameStateSnapshot = (snapshot) => typeof snapshot === "object" && snapshot !== null && (snapshot.version === 4 || snapshot.version === 5) && snapshot.supported === true;`
        )
        .replace(`import { getDeploymentStorageKey } from "./DeploymentStorageKeys.js";`, `import { getDeploymentStorageKey } from "${helperModuleUrl}";`)
        .replace(
            `import { JackalInputMappingStore } from "./JackalInputMappingStore.js";`,
            `class JackalInputMappingStore { restore() { return false; } save() { return true; } }`
        )
        .replace(`import { registerServiceWorker } from "./ServiceWorkerRegistrar.js";`, `function registerServiceWorker() {}`)
        .replace(`import versionInfo from "../../../version.json";`, `const versionInfo = { version: "1.0.0", buildStamp: "test" };`);
    return import(compileModule(source));
}

test("restore exceptions preserve the stored game-state snapshot", async () => {
    await withMutedConsoleWarn(async () => {
        resetStorage();
        const { JackalGameStateStore } = await loadGameStateStore();
        const key = gameStateStorageKey();
        storage.set(key, JSON.stringify({ version: 4, kind: "mode", supported: true, marker: "keep", throwOnRestore: true }));

        assert.equal(new JackalGameStateStore("1.0.0").restore({}, {}), false);
        assert.equal(storage.has(key), true);
    });
});

test("game-state preflight preserves future-version saves and storage read failures", async () => {
    await withMutedConsoleWarn(async () => {
        resetStorage();
        const { JackalWebApp } = await loadWebApp();
        const key = gameStateStorageKey();
        storage.set(key, JSON.stringify({ version: 6, kind: "game", futureShape: true }));

        assert.equal(new JackalWebApp({}).hasPotentialSavedGameState(), false);
        assert.equal(storage.has(key), true);

        throwOnGet = true;
        assert.equal(new JackalWebApp({}).hasPotentialSavedGameState(), false);
        assert.equal(storage.has(key), true);
    });
});

test("game-state store preserves future-version saves but clears malformed and obsolete data", async () => {
    resetStorage();
    const { JackalGameStateStore } = await loadGameStateStore();
    const store = new JackalGameStateStore("1.0.0");
    const key = gameStateStorageKey();

    storage.set(key, JSON.stringify({ version: 6, kind: "mode", futureShape: true }));
    assert.equal(store.hasValidSave(), false);
    assert.equal(storage.has(key), true);

    storage.set(key, JSON.stringify({ version: 2, kind: "game" }));
    assert.equal(store.hasValidSave(), false);
    assert.equal(storage.has(key), false);

    storage.set(key, JSON.stringify({ version: 5, kind: "game", supported: false }));
    assert.equal(store.hasValidSave(), false);
    assert.equal(storage.has(key), false);

    storage.set(key, "{");
    assert.equal(store.hasValidSave(), false);
    assert.equal(storage.has(key), false);
});

test("game-state store inspection preserves saves when storage reads fail", async () => {
    await withMutedConsoleWarn(async () => {
        resetStorage();
        const { JackalGameStateStore } = await loadGameStateStore();
        const key = gameStateStorageKey();
        storage.set(key, JSON.stringify({ version: 5, kind: "mode", supported: true }));
        throwOnGet = true;

        assert.equal(new JackalGameStateStore("1.0.0").hasValidSave(), false);
        assert.equal(storage.has(key), true);
    });
});
