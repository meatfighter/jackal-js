import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(relativePath) {
    return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const buttonMapping = read("pwa/src/jackal/ButtonMapping.ts");
const humanInput = read("pwa/src/jackal/HumanInput.ts");
const introMode = read("pwa/src/jackal/IntroMode.ts");
const webApp = read("pwa/src/app/JackalWebApp.ts");
const viewport = read("pwa/src/app/GameViewportController.ts");
const preferences = read("pwa/src/app/AppPreferences.ts");
const fullscreenCss = read("pwa/src/fullscreen.css");

test("Space is remappable while Escape remains browser-reserved", () => {
    const reservedKeyBody = buttonMapping.match(/public static isReservedKey\(key: number\): boolean \{([\s\S]*?)\n    \}/)?.[1] ?? "";
    assert.match(reservedKeyBody, /Input\.KEY_ESCAPE/);
    assert.doesNotMatch(reservedKeyBody, /Input\.KEY_SPACE/);

    // The translated Java fullscreen skeleton remains mechanically inert until its
    // larger translated Main block is removed in a dedicated parity-cleanup pass.
    assert.match(humanInput, /public isFullscreenTogglePressed\(\): boolean \{\s*return false;\s*\}/);
    assert.match(humanInput, /public isEscape\(\): boolean \{\s*return false;\s*\}/);

    const reservedHandler = webApp.match(/private readonly handleBrowserReservedKey[\s\S]*?\n    \};/)?.[0] ?? "";
    assert.match(reservedHandler, /event\.key === "Escape"/);
    assert.match(reservedHandler, /requestPwaMenu\("escape"\)/);
    assert.doesNotMatch(reservedHandler, /event\.code === "Space"|event\.key === " "/);
});

test("browser title source no longer carries the Java fullscreen instruction", () => {
    assert.doesNotMatch(introMode, /FULL_SCREEN_TEXT/);
    assert.doesNotMatch(introMode, /FULL-SCREEN MODE/);
});

test("fullscreen preference defaults on and precedes Scaling in the browser menu", () => {
    assert.match(preferences, /DEFAULT_FULLSCREEN_PREFERENCE\s*=\s*true/);
    const fullscreenIndex = webApp.indexOf('class="setting-fullscreen-row"');
    const scalingIndex = webApp.indexOf('class="setting-scaling-row"');
    assert.ok(fullscreenIndex >= 0, "Fullscreen menu control is missing");
    assert.ok(scalingIndex > fullscreenIndex, "Fullscreen must appear before Scaling");
    assert.match(webApp, /fullscreenUnavailable[\s\S]*disabled title="Fullscreen is unavailable in this browser"/);
});

test("New Game and live Continue initiate audio before fullscreen and before the first await", () => {
    const coldStart = webApp.match(/private async startGame\([\s\S]*?\n    private async launchPreparedGame/)?.[0] ?? "";
    const coldAudio = coldStart.indexOf("const audio = beginGameAudio();");
    const coldFullscreen = coldStart.indexOf("this.requestPreferredFullscreen();");
    const coldAwait = coldStart.indexOf("await audio.ready");
    assert.ok(coldAudio >= 0 && coldFullscreen > coldAudio && coldAwait > coldFullscreen);
    assert.match(coldStart, /this\.viewport\.createShell\(session\)/);

    const liveContinue = webApp.match(/private async resumeLiveGameFromMenu\([\s\S]*?\n    private removeMenuOverlay/)?.[0] ?? "";
    const liveAudio = liveContinue.indexOf("const audio = beginGameAudio();");
    const liveFullscreen = liveContinue.indexOf("this.requestPreferredFullscreen();");
    const liveAwait = liveContinue.indexOf("await audio.ready");
    assert.ok(liveAudio >= 0 && liveFullscreen > liveAudio && liveAwait > liveFullscreen);
});

test("native fullscreen is preflight-fenced against synchronous activation reentry", () => {
    const request = viewport.match(/public requestFullscreen\(\): Promise<boolean> \{[\s\S]*?\n    \}/)?.[0] ?? "";
    const sessionCheck = request.indexOf("!this.callbacks.isSessionCurrent(session)");
    const activityCheck = request.indexOf("!this.callbacks.isGameplayActive()");
    const nativeRequest = request.indexOf("requestBrowserFullscreen(shell)");
    assert.ok(sessionCheck >= 0 && activityCheck >= 0 && nativeRequest > sessionCheck && nativeRequest > activityCheck);

    const pendingRegistration = viewport.match(/const pending: PendingFullscreenRequest[\s\S]*?return promise;/)?.[0] ?? "";
    assert.match(pendingRegistration, /this\.callbacks\.isSessionCurrent\(session\)/);
    assert.match(pendingRegistration, /this\.callbacks\.isGameplayActive\(\)/);
});

test("a successfully invoked delayed fullscreen request keeps authority until fullscreenchange", () => {
    const request = viewport.match(/public requestFullscreen\(\): Promise<boolean> \{[\s\S]*?\n    \}/)?.[0] ?? "";
    assert.match(request, /if \(!requested\) \{[\s\S]*?this\.fullscreenEntryAuthorized = false/);
    assert.match(request, /const established = getBrowserFullscreenElement\(\) === shell/);
    assert.match(request, /Legacy\/prefixed APIs may return void before fullscreenchange/);
    assert.doesNotMatch(request, /this\.fullscreenEntryAuthorized = established/);
});

test("fullscreen authority is fenced to one presentation and one active request", () => {
    assert.match(viewport, /private presentationGeneration = 0/);
    assert.match(viewport, /private fullscreenEntryAuthorized = false/);
    assert.match(viewport, /private fullscreenSuppressedPresentation: number \| null = null/);
    assert.match(viewport, /private readonly retiredFullscreenShells = new WeakSet<HTMLElement>\(\)/);
    assert.match(viewport, /type PendingFullscreenRequest = Readonly/);
    assert.match(viewport, /const presentation = this\.presentationGeneration/);
    assert.match(viewport, /requestSerial === this\.fullscreenRequestSerial/);
    assert.match(viewport, /presentation === this\.presentationGeneration/);
    assert.match(viewport, /this\.shell === shell/);
    assert.match(viewport, /shouldKeepFullscreenShell\(shell\)/);
    assert.match(viewport, /retiredFullscreenShells\.has\(fullscreenElement as HTMLElement\)/);
});

test("MENU exit is exact-shell, starts actual exit promptly, and bounds unresolved entry requests", () => {
    assert.match(viewport, /FULLSCREEN_REQUEST_SETTLE_TIMEOUT_MS = 1500/);
    const exitForPresentation = viewport.match(/private async exitFullscreenForPresentation\([\s\S]*?\n    \}/)?.[0] ?? "";
    const actualExit = exitForPresentation.indexOf("this.requestExitForSpecificShell(targetShell)");
    const pendingWait = exitForPresentation.indexOf("this.waitForPendingFullscreenRequests(targetShell, targetPresentation)");
    assert.ok(actualExit >= 0 && pendingWait > actualExit, "Actual fullscreen exit should start before waiting on a possibly stuck request promise.");
    assert.match(exitForPresentation, /this\.fullscreenRequestSerial\+\+/);
    assert.match(exitForPresentation, /this\.fullscreenEntryAuthorized = false/);
    assert.match(exitForPresentation, /this\.fullscreenSuppressedPresentation = targetPresentation/);
    assert.match(exitForPresentation, /getBrowserFullscreenElement\(\) !== targetShell/);

    const pending = viewport.match(/private async waitForPendingFullscreenRequests\([\s\S]*?\n    \}/)?.[0] ?? "";
    assert.match(pending, /Promise\.race/);
    assert.match(pending, /FULLSCREEN_REQUEST_SETTLE_TIMEOUT_MS/);
    assert.match(pending, /this\.pendingFullscreenRequests\.delete\(request\)/);
});

test("cleared shells retain no fullscreen authority and late entry is hidden and retired", () => {
    const clear = viewport.match(/public clear\(\): void \{[\s\S]*?\n    \}/)?.[0] ?? "";
    assert.match(clear, /this\.fullscreenRequestSerial\+\+/);
    assert.match(clear, /this\.fullscreenEntryAuthorized = false/);
    assert.match(clear, /this\.retiredFullscreenShells\.add\(targetShell\)/);
    assert.match(clear, /this\.presentationGeneration\+\+/);
    assert.match(clear, /targetIsFullscreen/);
    assert.match(clear, /this\.root\.style\.visibility = "hidden"/);

    const retiredExit = viewport.match(/private hideRootUntilRetiredShellExits\([\s\S]*?\n    \}/)?.[0] ?? "";
    assert.match(retiredExit, /this\.root\.style\.visibility = "hidden"/);
    assert.match(retiredExit, /requestExitForSpecificShell\(shell\)/);
    assert.match(retiredExit, /this\.root\.style\.visibility = ""/);
});

test("unauthorized or inactive late fullscreen entry is hidden until exact-shell exit", () => {
    const handler = viewport.match(/private readonly handleFullscreenChange[\s\S]*?\n    \};/)?.[0] ?? "";
    assert.match(handler, /if \(current && !this\.fullscreenEntryAuthorized\) \{\s*this\.hideRootUntilRetiredShellExits\(shell\)/);
    assert.match(handler, /if \(current && !this\.callbacks\.isGameplayActive\(\)\) \{\s*this\.hideRootUntilRetiredShellExits\(shell\)/);
});

test("interrupted live Continue exits fullscreen before republishing the retained menu", () => {
    const requestMenu = webApp.match(/private requestPwaMenu\([\s\S]*?\n    \}/)?.[0] ?? "";
    assert.match(requestMenu, /this\.menuOverlay !== null/);
    assert.match(requestMenu, /restoreExistingLiveMenuAfterInterruptedResume\(session\)/);
    assert.doesNotMatch(requestMenu, /if \(retainExistingOverlay\) \{\s*this\.pwaSessionState = "menu"/);

    const restore = webApp.match(/private async restoreExistingLiveMenuAfterInterruptedResume\([\s\S]*?\n    \}/)?.[0] ?? "";
    const exit = restore.indexOf("await this.viewport.exitFullscreenForMenu()");
    const publishMenu = restore.indexOf('this.pwaSessionState = "menu";');
    assert.ok(exit >= 0 && publishMenu > exit);
    assert.match(restore, /this\.pwaSessionState !== "stopping"/);
    assert.match(restore, /this\.menuOverlay === null/);
});

test("live Continue reconciles presentation before input and RAF resume", () => {
    const liveContinue = webApp.match(/private async resumeLiveGameFromMenu\([\s\S]*?\n    private removeMenuOverlay/)?.[0] ?? "";
    const reconcile = liveContinue.indexOf("this.viewport.reconcileDisplayModeNow();");
    const inputResume = liveContinue.indexOf("liveContainer.getInput().resume();");
    const loopResume = liveContinue.indexOf("liveContainer.setLoopSuspended(false);");
    assert.ok(reconcile >= 0 && inputResume > reconcile && loopResume > inputResume);
    assert.match(liveContinue, /this\.pageLifecycle\.sync\(true\);[\s\S]*this\.pwaSessionState !== "running"/);

    assert.match(viewport, /queueMicrotask\(\(\) => \{[\s\S]*reconcileDisplayModeNow\(\)/);
    assert.match(viewport, /"fullscreenchange", "webkitfullscreenchange"/);
    assert.match(viewport, /private fullscreenResizeSettleAnimationFrame = 0/);
});

test("unsafe cleanup reaches viewport teardown before reload-required UI", () => {
    const liveMenu = webApp.match(/private async showLiveMenuOverlay\([\s\S]*?\n    private async resumeLiveGameFromMenu/)?.[0] ?? "";
    const requestMenu = webApp.match(/private requestPwaMenu\([\s\S]*?\n    private async restoreExistingLiveMenuAfterInterruptedResume/)?.[0] ?? "";
    const staleLaunch = webApp.match(/private disposeStaleLaunch\([\s\S]*?\n    public releaseSession/)?.[0] ?? "";
    const destroySession = webApp.match(/private destroyGameSession\([\s\S]*?\n    private getGameStateStore/)?.[0] ?? "";

    assert.doesNotMatch(liveMenu, /this\.showCleanupFailure\(\)/);
    assert.doesNotMatch(requestMenu, /this\.showCleanupFailure\(\)/);
    assert.doesNotMatch(staleLaunch, /this\.showCleanupFailure\(\)/);
    assert.match(liveMenu, /this\.destroyGameSession\(\)/);
    assert.match(requestMenu, /this\.destroyGameSession\(\)/);
    assert.match(staleLaunch, /this\.destroyGameSession\(\)/);
    assert.match(destroySession, /this\.viewport\.clear\(\)/);
    assert.match(destroySession, /this\.showCleanupFailure\(\)/);
});

test("fullscreen CSS owns viewport fill and touch safe-area chrome", () => {
    assert.match(fullscreenCss, /\.game-shell:fullscreen/);
    assert.match(fullscreenCss, /position:\s*fixed/);
    assert.match(fullscreenCss, /width:\s*100vw/);
    assert.match(fullscreenCss, /height:\s*100vh/);
    assert.match(fullscreenCss, /safe-area-inset-left/);
    assert.match(fullscreenCss, /safe-area-inset-top/);
});
