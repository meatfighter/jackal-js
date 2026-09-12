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
const content = read("about/content.md");

test("Space is remappable while Escape remains browser-reserved", () => {
    const reservedKeyBody = buttonMapping.match(/public static isReservedKey\(key: number\): boolean \{([\s\S]*?)\n    \}/)?.[1] ?? "";
    assert.match(reservedKeyBody, /Input\.KEY_ESCAPE/);
    assert.doesNotMatch(reservedKeyBody, /Input\.KEY_SPACE/);

    assert.match(humanInput, /public isFullscreenTogglePressed\(\): boolean \{\s*return false;\s*\}/);
    assert.match(humanInput, /public isEscape\(\): boolean \{\s*return false;\s*\}/);

    const reservedHandler = webApp.match(/private readonly handleBrowserReservedKey[\s\S]*?\n    \};/)?.[0] ?? "";
    assert.match(reservedHandler, /event\.key === "Escape"/);
    assert.match(reservedHandler, /requestPwaMenu\("escape"\)/);
    assert.doesNotMatch(reservedHandler, /event\.code === "Space"|event\.key === " "/);
});

test("browser title screen no longer renders the legacy fullscreen instruction", () => {
    assert.doesNotMatch(introMode, /drawString\(IntroMode\.FULL_SCREEN_TEXT/);
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

test("fullscreen requests are session-fenced and menu exit waits for pending attempts", () => {
    assert.match(viewport, /private fullscreenRequestSerial = 0/);
    assert.match(viewport, /pendingFullscreenRequests = new Set<Promise<boolean>>/);
    assert.match(viewport, /const session = this\.sessionGeneration/);
    assert.match(viewport, /this\.callbacks\.isSessionCurrent\(session\)/);
    assert.match(viewport, /requestSerial !== this\.fullscreenRequestSerial/);

    const exitForMenu = viewport.match(/public async exitFullscreenForMenu\(\): Promise<boolean> \{[\s\S]*?\n    \}/)?.[0] ?? "";
    const invalidate = exitForMenu.indexOf("this.fullscreenRequestSerial++");
    const pendingWait = exitForMenu.indexOf("await Promise.all([...this.pendingFullscreenRequests])");
    const actualExit = exitForMenu.indexOf("await exitBrowserFullscreen()");
    assert.ok(invalidate >= 0 && pendingWait > invalidate && actualExit > pendingWait);

    const clear = viewport.match(/public clear\(\): void \{[\s\S]*?\n    \}/)?.[0] ?? "";
    assert.match(clear, /getBrowserFullscreenElement\(\) !== null \|\| this\.pendingFullscreenRequests\.size > 0/);
    assert.match(clear, /this\.root\.style\.visibility = "hidden"/);
    assert.match(clear, /fullscreenExit\.finally/);
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

test("fullscreen handling covers standard and WebKit events and settles layout twice", () => {
    assert.match(viewport, /"fullscreenchange", "webkitfullscreenchange"/);
    assert.match(viewport, /private fullscreenResizeSettleAnimationFrame = 0/);
    assert.match(viewport, /private scheduleFullscreenResize\(\): void/);
    assert.match(viewport, /this\.scheduleResize\(\);[\s\S]*requestAnimationFrame\(\(\) => \{[\s\S]*this\.scheduleResize\(\)/);
    assert.match(viewport, /if \(current && !this\.callbacks\.isGameplayActive\(\)\) \{\s*void this\.exitFullscreenForMenu\(\)/);
    assert.match(viewport, /hasTouchCapability\(\)/);
});

test("About documentation matches the browser control contract", () => {
    assert.match(content, /browser version.*Space.*normal remappable keyboard key/i);
    assert.match(content, /Esc.*reserved.*browser menu/i);
    assert.match(content, /Fullscreen.*defaults to on/i);
    assert.match(content, /continues normally in the available browser area/i);
});
