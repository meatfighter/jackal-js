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
});

test("New Game and live Continue initiate audio before fullscreen and before the first await", () => {
    const coldStart = webApp.match(/private async startGame\([\s\S]*?\n    private async launchPreparedGame/)?.[0] ?? "";
    const coldAudio = coldStart.indexOf("const audio = beginGameAudio();");
    const coldFullscreen = coldStart.indexOf("this.requestPreferredFullscreen();");
    const coldAwait = coldStart.indexOf("await audio.ready");
    assert.ok(coldAudio >= 0 && coldFullscreen > coldAudio && coldAwait > coldFullscreen);

    const liveContinue = webApp.match(/private async resumeLiveGameFromMenu\([\s\S]*?\n    private removeMenuOverlay/)?.[0] ?? "";
    const liveAudio = liveContinue.indexOf("const audio = beginGameAudio();");
    const liveFullscreen = liveContinue.indexOf("this.requestPreferredFullscreen();");
    const liveAwait = liveContinue.indexOf("await audio.ready");
    assert.ok(liveAudio >= 0 && liveFullscreen > liveAudio && liveAwait > liveFullscreen);
});

test("fullscreen handling covers standard and WebKit events and keeps menu UI hidden during terminal exit", () => {
    assert.match(viewport, /"fullscreenchange", "webkitfullscreenchange"/);
    assert.match(viewport, /exitFullscreenForMenu\(\)/);
    assert.match(viewport, /this\.root\.style\.visibility = "hidden"/);
    assert.match(viewport, /fullscreenExit\.finally/);
    assert.match(viewport, /hasTouchCapability\(\)/);
});

test("About documentation matches the browser control contract", () => {
    assert.match(content, /Space.*normal remappable keyboard key/i);
    assert.match(content, /Esc.*reserved.*browser menu/i);
    assert.match(content, /Fullscreen.*defaults to on/i);
    assert.match(content, /continues normally in the available browser area/i);
});
