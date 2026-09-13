import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const fullscreenCss = readFileSync("pwa/src/fullscreen.css", "utf8");
const pwaIndex = readFileSync("pwa/index.html", "utf8");

test("PWA menu disables double-tap zoom without disabling pinch zoom", () => {
    assert.match(fullscreenCss, /\.menu-screen\s*\{[^}]*touch-action:\s*manipulation;/s);
    assert.doesNotMatch(pwaIndex, /user-scalable\s*=\s*no/i);
    assert.doesNotMatch(pwaIndex, /maximum-scale\s*=\s*1(?:\.0)?/i);
});
