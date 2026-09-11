import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";
import { join } from "node:path";

const read = (path) => readFileSync(join(rootDir, path), "utf8");

test("starting a game requires boot-prepared runtime before fresh playback activation", () => {
    const source = read("pwa/src/app/JackalWebApp.ts");
    const startGame = source.slice(source.indexOf("private async startGame"), source.indexOf("private async launchPreparedGame"));
    assert.match(startGame, /const runtime = this\.runtimeLoader\.preparedRuntime;/);
    assert.match(startGame, /if \(runtime === null\) \{\s*this\.showMenu\(\);\s*return;\s*\}/);
    assert.ok(startGame.indexOf("this.destroyGameSession();") > startGame.indexOf("const runtime = this.runtimeLoader.preparedRuntime;"));
    assert.ok(startGame.indexOf("this.destroyGameSession();") < startGame.indexOf("const audio = beginGameAudio();"));
    assert.ok(startGame.indexOf('this.pwaSessionState = "starting";') < startGame.indexOf("const audio = beginGameAudio();"));
    assert.match(startGame, /await audio\.ready/);
    assert.doesNotMatch(startGame, /unlockGameAudio|ensurePrepared|renderLoading/);
    assert.match(source, /public showMenu[\s\S]*?this\.runtimeLoader\s*\.ensurePrepared/);
    assert.match(source, /private destroyGame\(\): boolean \{\s*this\.menuRequestSerial\+\+;\s*this\.sessionCleanup\.run\(\(\) => this\.runtimeLoader\.cancelPreparation\(\)\);\s*return this\.destroyGameSession\(\);/);
});

test("page lifecycle is one-way into the PWA menu, including during STARTING", () => {
    const app = read("pwa/src/app/JackalWebApp.ts");
    const lifecycle = read("pwa/src/app/PageLifecycleMonitor.ts");
    assert.match(app, /new PageLifecycleMonitor\(\(\) => this\.requestPwaMenu\("page-lifecycle"\)\)/);
    assert.match(app, /private requestPwaMenu[\s\S]*?this\.pwaSessionState = "stopping";/);
    assert.match(app, /private suspendGameForMenu[\s\S]*?releaseGameAudio\(\)/);
    assert.match(lifecycle, /window\.addEventListener\("pagehide", this\.changed\)/);
    assert.match(lifecycle, /window\.addEventListener\("blur", this\.changed\)/);
    assert.match(lifecycle, /document\.visibilityState === "hidden"/);
    assert.doesNotMatch(lifecycle, /window\.addEventListener\("focus"/);
    assert.doesNotMatch(lifecycle, /window\.addEventListener\("pageshow"/);
});

test("live-menu transition freezes and retires playback before serializing progress", () => {
    const source = read("pwa/src/app/JackalWebApp.ts");
    const liveMenu = source.slice(source.indexOf("private showLiveMenuOverlay"), source.indexOf("private async resumeLiveGameFromMenu"));
    assert.ok(liveMenu.indexOf("this.suspendGameForMenu();") < liveMenu.indexOf("this.saveCurrentInputMapping();"));
    assert.ok(liveMenu.indexOf("this.suspendGameForMenu();") < liveMenu.indexOf("this.saveCurrentGameState();"));
    const suspend = source.slice(source.indexOf("private suspendGameForMenu"), source.indexOf("private showCleanupFailure"));
    assert.match(suspend, /setLoopSuspended\(true\)/);
    assert.match(suspend, /setBrowserSuspended\(true\)/);
    assert.match(suspend, /getInput\(\)\.pause\(\)/);
    assert.match(suspend, /releaseGameAudio\(\)/);
});

test("Jackal Song sequencing uses logical transport and has no browser recovery authority", () => {
    const source = read("pwa/src/jackal/Song.ts");
    assert.match(source, /getTransportState\(\) !== "stopped"/);
    assert.match(source, /isTransportActive\(\)/);
    assert.doesNotMatch(source, /resumeAfterBrowserSuspension|resumeMusicPart|browser/i);
});

test("Jackal Main owns game state, not browser audio recovery policy", () => {
    const source = read("pwa/src/jackal/Main.ts");
    assert.doesNotMatch(source, /BrowserAudioController|browserAudioController|browserSuspendedMusicOn|browserSuspendedSoundOn|resumeBrowserAudio|resumeAfterBrowserSuspension/);
    assert.match(source, /public browserSuspended: boolean = false/);
    assert.match(source, /reserveBrowserRuntime\(\)/);
    assert.match(source, /disposeBrowserRuntime\(\)/);
});

test("playback activation is attempt-scoped and stale Continue cleanup cannot target a replacement", () => {
    const source = read("pwa/src/app/JackalWebApp.ts");
    const resume = source.slice(source.indexOf("private async resumeLiveGameFromMenu"), source.indexOf("private removeMenuOverlay"));
    assert.match(resume, /const audio = beginGameAudio\(\)/);
    assert.match(resume, /commitGameAudio\(audio\)/);
    assert.match(resume, /isGameAudioLatest\(audio\)/);
    assert.equal((resume.match(/isGameAudioLatest\(audio\)/g) ?? []).length, 2, "Continue catch and finally must both reject stale attempts.");
    assert.match(resume, /isStartingGameSession\(session, audio\)/);
});

test("stale launch cleanup withdraws ownership before independent teardown", () => {
    const source = read("pwa/src/app/JackalWebApp.ts");
    const stale = source.slice(source.indexOf("private disposeStaleLaunch"), source.indexOf("public releaseSession"));
    assert.ok(stale.indexOf("this.container = null;") < stale.indexOf("this.sessionCleanup.run("));
    assert.ok(stale.indexOf("this.game = null;") < stale.indexOf("this.sessionCleanup.run("));
    assert.match(stale, /this\.sessionCleanup\.run\(\s*\(\) => mainGame\.disposeBrowserRuntime\(\),\s*\(\) => appContainer\.destroy\(\)/s);
    assert.doesNotMatch(stale, /try\s*\{[\s\S]*mainGame\.disposeBrowserRuntime\(\)[\s\S]*finally/);
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
