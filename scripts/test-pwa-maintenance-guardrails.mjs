import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";
import { join } from "node:path";

const read = (path) => readFileSync(join(rootDir, path), "utf8");

test("starting a game reuses boot-prepared runtime resources", () => {
    const source = read("pwa/src/app/JackalWebApp.ts");
    assert.match(source, /private async startGame[\s\S]*?this\.destroyGameSession\(\);/);
    assert.match(source, /public showMenu[\s\S]*?this\.runtimeLoader\.ensurePrepared/);
    assert.match(source, /private destroyGame\(\): void \{\s*this\.runtimeLoader\.cancelPreparation\(\);\s*this\.destroyGameSession\(\);/);
    assert.doesNotMatch(source, /private async startGame[\s\S]{0,300}?this\.runtimeLoader\.cancelPreparation/);
});

test("page lifecycle is one-way into the PWA menu", () => {
    const app = read("pwa/src/app/JackalWebApp.ts");
    const lifecycle = read("pwa/src/app/PageLifecycleMonitor.ts");
    assert.match(app, /new PageLifecycleMonitor\(\(\) => this\.requestPwaMenu\("page-lifecycle"\)\)/);
    assert.match(app, /releaseGameAudio\(\);[\s\S]*this\.menuOverlay = this\.renderMenu/);
    assert.match(lifecycle, /window\.addEventListener\("pagehide", this\.changed\)/);
    assert.match(lifecycle, /window\.addEventListener\("blur", this\.changed\)/);
    assert.match(lifecycle, /document\.visibilityState === "hidden"/);
    assert.doesNotMatch(lifecycle, /window\.addEventListener\("focus"/);
    assert.doesNotMatch(lifecycle, /window\.addEventListener\("pageshow"/);
});

test("obsolete controller selection flags do not survive in shared mappings", () => {
    const sources = [
        read("pwa/src/jackal/ButtonMapping.ts"),
        read("desktop/src/jackal/ButtonMapping.java"),
        read("pwa/src/app/JackalInputMappingStore.ts"),
        read("pwa/src/jackal/persistence/GameStateFields.ts")
    ].join("\n");
    assert.doesNotMatch(sources, /\bcontrollerIndex\b|\bgunKeyMapped\b/);
    assert.doesNotMatch(read("pwa/src/jackal/ButtonMapping.ts"), /public controller:/);
    assert.doesNotMatch(read("desktop/src/jackal/ButtonMapping.java"), /public boolean controller;/);
});

test("PWA resources use generated content identities and bounded preload concurrency", () => {
    const loader = read("pwa/src/app/JackalRuntimeLoader.ts");
    const vite = read("pwa/vite.config.ts");
    assert.match(loader, /setCacheVersionResolver/);
    assert.match(loader, /RESOURCE_PRELOAD_CONCURRENCY = 8/);
    assert.match(loader, /AUDIO_PRELOAD_CONCURRENCY = 3/);
    assert.match(vite, /createHash\("sha256"\)/);
    assert.match(vite, /__RESOURCE_VERSIONS__/);
});

test("service worker registration does not immediately issue a redundant update check", () => {
    const source = read("pwa/src/app/ServiceWorkerRegistrar.ts");
    assert.match(source, /navigator\.serviceWorker\.register/);
    assert.doesNotMatch(source, /registration\.update\(\)/);
});

test("first-run service worker readiness is bounded before runtime resource preload", () => {
    const registrar = read("pwa/src/app/ServiceWorkerRegistrar.ts");
    const loader = read("pwa/src/app/JackalRuntimeLoader.ts");
    assert.match(registrar, /SERVICE_WORKER_STARTUP_TIMEOUT_MS = 3000/);
    assert.match(registrar, /navigator\.serviceWorker\.ready/);
    assert.match(registrar, /controllerchange/);
    assert.doesNotMatch(registrar, /window\.addEventListener\("load"/);
    assert.match(loader, /await waitForServiceWorkerReadiness\(\);/);
});
