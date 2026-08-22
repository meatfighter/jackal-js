import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const storage = new Map();
const noop = () => {};

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

function compileModule(source) {
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}

async function loadWebApp() {
    const helperSource = readFileSync(new URL("../pwa/src/app/DeploymentStorageKeys.ts", import.meta.url), "utf8");
    const helperModuleUrl = compileModule(helperSource);
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
            `import { GAME_STATE_STORAGE_KEY, GAME_STATE_VERSION } from "../jackal/persistence/GameStateSchema.js";`,
            `const GAME_STATE_STORAGE_KEY = "jackal.game-state"; const GAME_STATE_VERSION = 3;`
        )
        .replace(`import { getDeploymentStorageKey } from "./DeploymentStorageKeys.js";`, `import { getDeploymentStorageKey } from "${helperModuleUrl}";`)
        .replace(
            `import { JackalInputMappingStore } from "./JackalInputMappingStore.js";`,
            `class JackalInputMappingStore { restore() { return false; } save() { return true; } }`
        )
        .replace(`import { registerServiceWorker } from "./ServiceWorkerRegistrar.js";`, `function registerServiceWorker() {}`)
        .replace(`import versionInfo from "../../../version.json";`, `const versionInfo = { buildStamp: "test" };`);
    return import(compileModule(source));
}

function storageKey(baseKey, href) {
    return `${baseKey}:${encodeURIComponent(new URL("./", href).pathname)}`;
}

test("web app volume storage is isolated by deployment path", async () => {
    storage.clear();
    const { JackalWebApp } = await loadWebApp();
    const stagingHref = "https://example.test/stage/pwa/?v=old";
    const stagingUpdatedHref = "https://example.test/stage/pwa/?v=new";
    const productionHref = "https://example.test/production/pwa/?v=old";
    const stagingKey = storageKey("jackal-volume", stagingHref);
    const productionKey = storageKey("jackal-volume", productionHref);

    storage.set(productionKey, "72");
    setLocation(stagingHref);
    const stagingApp = new JackalWebApp({});

    assert.equal(stagingApp.volume, 0.1);
    stagingApp.setAudioVolume(0.35);
    assert.equal(storage.get(stagingKey), "35");
    assert.equal(storage.get(productionKey), "72");

    setLocation(stagingUpdatedHref);
    assert.equal(new JackalWebApp({}).volume, 0.35);

    setLocation(productionHref);
    assert.equal(new JackalWebApp({}).volume, 0.72);
});
