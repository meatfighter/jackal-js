import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(relativePath) {
    return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const buttonMapping = read("pwa/src/jackal/ButtonMapping.ts");
const inputInterface = read("pwa/src/jackal/IInput.ts");
const humanInput = read("pwa/src/jackal/HumanInput.ts");
const translatedMain = read("pwa/src/jackal/Main.ts");
const introMode = read("pwa/src/jackal/IntroMode.ts");
const webApp = read("pwa/src/app/JackalWebApp.ts");
const viewport = read("pwa/src/app/GameViewportController.ts");
const preferences = read("pwa/src/app/AppPreferences.ts");
const fullscreenCss = read("pwa/src/fullscreen.css");

test("Space is remappable, Escape is shell-reserved, and translated fullscreen ownership is removed", () => {
    const reservedKeyBody = buttonMapping.match(/public static isReservedKey\(key: number\): boolean \{([\s\S]*?)\n {4}\}/)?.[1] ?? "";
    assert.match(reservedKeyBody, /Input\.KEY_ESCAPE/);
    assert.doesNotMatch(reservedKeyBody, /Input\.KEY_SPACE/);
    for (const source of [inputInterface, humanInput]) {
        assert.doesNotMatch(source, /isFullscreenTogglePressed|isEscape\(\)/);
    }
    assert.doesNotMatch(translatedMain, /BrowserFullscreenController|browserFullscreenController|fullScreenToggleCheck|showMouseCursor|hideMouseCursor/);

    const reservedHandler = webApp.match(/private readonly handleBrowserReservedKey[\s\S]*?\n {4}\};/)?.[0] ?? "";
    assert.match(reservedHandler, /event\.key === "Escape"/);
    assert.match(reservedHandler, /requestPwaMenu\("escape"\)/);
    assert.doesNotMatch(reservedHandler, /event\.code === "Space"|event\.key === " "/);
});

test("browser title source no longer carries the Java fullscreen instruction", () => {
    assert.doesNotMatch(introMode, /FULL_SCREEN_TEXT/);
    assert.doesNotMatch(introMode, /FULL-SCREEN MODE/);
});

test("fullscreen preference defaults on, presents unavailable as off, and precedes Scaling", () => {
    assert.match(preferences, /DEFAULT_FULLSCREEN_PREFERENCE\s*=\s*true/);
    const fullscreenIndex = webApp.indexOf('class="setting-fullscreen-row"');
    const scalingIndex = webApp.indexOf('class="setting-scaling-row"');
    assert.ok(fullscreenIndex >= 0);
    assert.ok(scalingIndex > fullscreenIndex);
    assert.match(webApp, /const fullscreenPresented = !fullscreenUnavailable && this\.fullscreenPreference/);
    assert.match(webApp, /aria-pressed="\$\{fullscreenPresented\}" data-enabled="\$\{fullscreenPresented\}"/);
    assert.match(webApp, /disabled title="Fullscreen is unavailable in this browser"/);
    assert.match(webApp, /const fullscreenPresented = !fullscreenSwitch\.disabled && this\.fullscreenPreference/);
});

test("New Game and live Continue initiate audio then fullscreen before the first await", () => {
    const coldStart = webApp.match(/private async startGame\([\s\S]*?\n {4}private async launchPreparedGame/)?.[0] ?? "";
    const coldAudio = coldStart.indexOf("const audio = beginGameAudio();");
    const coldFullscreen = coldStart.indexOf("this.requestPreferredFullscreen();");
    const coldAwait = coldStart.indexOf("await audio.ready");
    assert.ok(coldAudio >= 0 && coldFullscreen > coldAudio && coldAwait > coldFullscreen);
    assert.match(coldStart, /this\.viewport\.createShell\(session\)/);

    const liveContinue = webApp.match(/private async resumeLiveGameFromMenu\([\s\S]*?\n {4}private removeMenuOverlay/)?.[0] ?? "";
    const liveAudio = liveContinue.indexOf("const audio = beginGameAudio();");
    const liveFullscreen = liveContinue.indexOf("this.requestPreferredFullscreen();");
    const liveAwait = liveContinue.indexOf("await audio.ready");
    assert.ok(liveAudio >= 0 && liveFullscreen > liveAudio && liveAwait > liveFullscreen);
});

test("native fullscreen is fenced before and after synchronous browser invocation reentry", () => {
    const request = viewport.match(/public requestFullscreen\(\): Promise<boolean> \{[\s\S]*?\n {4}\}/)?.[0] ?? "";
    const preflightSession = request.indexOf("!this.callbacks.isSessionCurrent(session)");
    const preflightActivity = request.indexOf("!this.callbacks.isGameplayActive()");
    const nativeRequest = request.indexOf("requestBrowserFullscreen(shell)");
    const postflight = request.indexOf("const invocationStillCurrent");
    assert.ok(preflightSession >= 0 && preflightActivity >= 0 && nativeRequest > preflightSession && nativeRequest > preflightActivity);
    assert.ok(postflight > nativeRequest);
    assert.match(request, /this\.fullscreenSuppressedPresentation = presentation/);
    assert.match(request, /this\.clearFullscreenSuppressionWhenSettled\(promise, shell, presentation\)/);
});

test("delayed request authority persists until fullscreenchange and is presentation-fenced", () => {
    const request = viewport.match(/public requestFullscreen\(\): Promise<boolean> \{[\s\S]*?\n {4}\}/)?.[0] ?? "";
    assert.match(request, /Legacy\/prefixed APIs may return void before fullscreenchange/);
    assert.match(request, /requestSerial === this\.fullscreenRequestSerial/);
    assert.match(request, /presentation === this\.presentationGeneration/);
    assert.match(request, /this\.shell === shell/);
    assert.match(viewport, /private readonly retiredFullscreenShells = new WeakSet<HTMLElement>\(\)/);
});

test("MENU exit starts exact-shell exit before bounded pending-entry wait", () => {
    assert.match(viewport, /FULLSCREEN_REQUEST_SETTLE_TIMEOUT_MS = 1500/);
    const exit = viewport.match(/private async exitFullscreenForPresentation\([\s\S]*?\n {4}\}/)?.[0] ?? "";
    const actualExit = exit.indexOf("this.requestExitForSpecificShell(targetShell)");
    const pendingWait = exit.indexOf("this.waitForPendingFullscreenRequests(targetShell, targetPresentation)");
    assert.ok(actualExit >= 0 && pendingWait > actualExit);
    assert.match(exit, /this\.fullscreenRequestSerial\+\+/);
    assert.match(exit, /this\.fullscreenEntryAuthorized = false/);
    assert.match(exit, /this\.fullscreenSuppressedPresentation = targetPresentation/);

    const pending = viewport.match(/private async waitForPendingFullscreenRequests\([\s\S]*?\n {4}\}/)?.[0] ?? "";
    assert.match(pending, /Promise\.race/);
    assert.match(pending, /FULLSCREEN_REQUEST_SETTLE_TIMEOUT_MS/);
});

test("suppression clears only after the abandoned request settles", () => {
    const helper = viewport.match(/private clearFullscreenSuppressionWhenSettled\([\s\S]*?\n {4}\}/)?.[0] ?? "";
    assert.match(helper, /promise\.finally/);
    assert.match(helper, /this\.fullscreenSuppressedPresentation === presentation/);
    assert.match(helper, /this\.presentationGeneration === presentation/);
    assert.match(helper, /this\.shell === shell/);
    assert.match(helper, /this\.fullscreenSuppressedPresentation = null/);
});

test("retired or unauthorized fullscreen shells are hidden and exited", () => {
    const clear = viewport.match(/public clear\(\): void \{[\s\S]*?\n {4}\}/)?.[0] ?? "";
    assert.match(clear, /retiredFullscreenShells\.add\(targetShell\)/);
    assert.match(clear, /this\.root\.style\.visibility = "hidden"/);
    const retiredExit = viewport.match(/private hideRootUntilRetiredShellExits\([\s\S]*?\n {4}\}/)?.[0] ?? "";
    assert.match(retiredExit, /requestExitForSpecificShell\(shell\)/);
    assert.match(retiredExit, /this\.root\.style\.visibility = "hidden"/);
    assert.match(retiredExit, /this\.root\.style\.visibility = ""/);
    const handler = viewport.match(/private readonly handleFullscreenChange[\s\S]*?\n {4}\};/)?.[0] ?? "";
    assert.match(handler, /current && !this\.fullscreenEntryAuthorized/);
    assert.match(handler, /current && !this\.callbacks\.isGameplayActive\(\)/);
});

test("interrupted retained Continue exits fullscreen before republishing menu", () => {
    const requestMenu = webApp.match(/private requestPwaMenu\([\s\S]*?\n {4}\}/)?.[0] ?? "";
    assert.match(requestMenu, /restoreExistingLiveMenuAfterInterruptedResume\(session\)/);
    const restore = webApp.match(/private async restoreExistingLiveMenuAfterInterruptedResume\([\s\S]*?\n {4}\}/)?.[0] ?? "";
    const exit = restore.indexOf("await this.viewport.exitFullscreenForMenu()");
    const publish = restore.indexOf('this.pwaSessionState = "menu";');
    assert.ok(exit >= 0 && publish > exit);
});

test("live Continue reconciles presentation before input and RAF resume", () => {
    const liveContinue = webApp.match(/private async resumeLiveGameFromMenu\([\s\S]*?\n {4}private removeMenuOverlay/)?.[0] ?? "";
    const reconcile = liveContinue.indexOf("this.viewport.reconcileDisplayModeNow();");
    const inputResume = liveContinue.indexOf("liveContainer.getInput().resume();");
    const loopResume = liveContinue.indexOf("liveContainer.setLoopSuspended(false);");
    assert.ok(reconcile >= 0 && inputResume > reconcile && loopResume > inputResume);
    assert.match(viewport, /queueMicrotask\(\(\) => \{[\s\S]*reconcileDisplayModeNow\(\)/);
    assert.match(viewport, /"fullscreenchange", "webkitfullscreenchange"/);
});

test("unsafe cleanup still reaches viewport teardown before reload-required UI", () => {
    const destroySession = webApp.match(/private destroyGameSession\([\s\S]*?\n {4}private getGameStateStore/)?.[0] ?? "";
    assert.match(destroySession, /this\.viewport\.clear\(\)/);
    assert.match(destroySession, /this\.showCleanupFailure\(\)/);
});

test("fullscreen CSS owns viewport fill, safe-area chrome, unavailable OFF state, and touch zoom policy", () => {
    assert.match(fullscreenCss, /\.menu-screen\s*\{[^}]*touch-action:\s*manipulation;/s);
    assert.match(fullscreenCss, /\.game-shell:fullscreen/);
    assert.match(fullscreenCss, /position:\s*fixed/);
    assert.match(fullscreenCss, /width:\s*100vw/);
    assert.match(fullscreenCss, /height:\s*100vh/);
    assert.match(fullscreenCss, /safe-area-inset-left/);
    assert.match(fullscreenCss, /safe-area-inset-top/);
    assert.match(fullscreenCss, /\.menu-switch:disabled/);
    assert.match(fullscreenCss, /transform:\s*translateX\(0\)/);
});
