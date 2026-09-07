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
    const url = new URL(href);
    Object.defineProperty(globalThis, "location", { value: url, configurable: true, writable: true });
}

function compileModule(source) {
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}

async function loadPreferences() {
    const keysUrl = compileModule(readFileSync(new URL("../pwa/src/app/DeploymentStorageKeys.ts", import.meta.url), "utf8"));
    const storageSource = readFileSync(new URL("../pwa/src/app/DeploymentStorage.ts", import.meta.url), "utf8").replace(
        `from "./DeploymentStorageKeys.js"`,
        `from "${keysUrl}"`
    );
    const storageUrl = compileModule(storageSource);
    const preferencesSource = readFileSync(new URL("../pwa/src/app/AppPreferences.ts", import.meta.url), "utf8").replace(
        `from "./DeploymentStorage.js"`,
        `from "${storageUrl}"`
    );
    return import(compileModule(preferencesSource));
}

function storageKey(baseKey, href) {
    return `${baseKey}:${encodeURIComponent(new URL("./", href).pathname)}`;
}

test("web app volume storage is isolated by deployment path", async () => {
    storage.clear();
    const preferences = await loadPreferences();
    const stagingHref = "https://example.test/stage/pwa/?v=old";
    const stagingUpdatedHref = "https://example.test/stage/pwa/?v=new";
    const productionHref = "https://example.test/production/pwa/?v=old";
    const stagingKey = storageKey(preferences.VOLUME_STORAGE_KEY, stagingHref);
    const productionKey = storageKey(preferences.VOLUME_STORAGE_KEY, productionHref);

    storage.set(productionKey, "72");
    setLocation(stagingHref);
    assert.equal(preferences.readVolume(), 0.1);
    assert.equal(preferences.writeVolume(0.35), true);
    assert.equal(storage.get(stagingKey), "35");
    assert.equal(storage.get(productionKey), "72");

    setLocation(stagingUpdatedHref);
    assert.equal(preferences.readVolume(), 0.35);

    setLocation(productionHref);
    assert.equal(preferences.readVolume(), 0.72);
});

test("web app scaling preference storage is isolated by deployment path", async () => {
    storage.clear();
    const preferences = await loadPreferences();
    const stagingHref = "https://example.test/stage/pwa/?v=old";
    const stagingUpdatedHref = "https://example.test/stage/pwa/?v=new";
    const productionHref = "https://example.test/production/pwa/?v=old";
    const stagingKey = storageKey(preferences.SCALING_STORAGE_KEY, stagingHref);
    const productionKey = storageKey(preferences.SCALING_STORAGE_KEY, productionHref);

    storage.set(productionKey, "crisp");
    setLocation(stagingHref);
    assert.equal(preferences.readScalingPreference(), "smooth");
    assert.equal(preferences.writeScalingPreference("pixel-perfect"), true);
    assert.equal(storage.get(stagingKey), "pixel-perfect");
    assert.equal(storage.get(productionKey), "crisp");

    setLocation(stagingUpdatedHref);
    assert.equal(preferences.readScalingPreference(), "pixel-perfect");

    setLocation(productionHref);
    assert.equal(preferences.readScalingPreference(), "crisp");

    storage.set(productionKey, "unsupported");
    assert.equal(preferences.readScalingPreference(), "smooth");
    assert.equal(storage.get(productionKey), "unsupported");
});

test("web app difficulty preference storage is isolated by deployment path", async () => {
    storage.clear();
    const preferences = await loadPreferences();
    const stagingHref = "https://example.test/stage/pwa/?v=old";
    const stagingUpdatedHref = "https://example.test/stage/pwa/?v=new";
    const productionHref = "https://example.test/production/pwa/?v=old";
    const stagingKey = storageKey(preferences.DIFFICULTY_STORAGE_KEY, stagingHref);
    const productionKey = storageKey(preferences.DIFFICULTY_STORAGE_KEY, productionHref);

    storage.set(productionKey, "normal");
    setLocation(stagingHref);
    assert.equal(preferences.readDifficultyPreference(), false);
    assert.equal(preferences.writeDifficultyPreference(true), true);
    assert.equal(storage.get(stagingKey), "hard");
    assert.equal(storage.get(productionKey), "normal");

    setLocation(stagingUpdatedHref);
    assert.equal(preferences.readDifficultyPreference(), true);

    setLocation(productionHref);
    assert.equal(preferences.readDifficultyPreference(), false);
    assert.equal(preferences.writeDifficultyPreference(true), true);
    assert.equal(storage.get(productionKey), "hard");

    storage.set(productionKey, "unsupported");
    assert.equal(preferences.readDifficultyPreference(), false);
    assert.equal(storage.get(productionKey), "unsupported");
});

test("clearing preferences resets difficulty without touching another deployment", async () => {
    storage.clear();
    const preferences = await loadPreferences();
    const stagingHref = "https://example.test/stage/pwa/";
    const productionHref = "https://example.test/production/pwa/";
    const stagingDifficultyKey = storageKey(preferences.DIFFICULTY_STORAGE_KEY, stagingHref);
    const productionDifficultyKey = storageKey(preferences.DIFFICULTY_STORAGE_KEY, productionHref);

    storage.set(stagingDifficultyKey, "hard");
    storage.set(productionDifficultyKey, "hard");
    setLocation(stagingHref);

    assert.equal(preferences.clearPreferences(), true);
    assert.equal(preferences.readDifficultyPreference(), false);
    assert.equal(storage.has(stagingDifficultyKey), false);
    assert.equal(storage.get(productionDifficultyKey), "hard");
});
