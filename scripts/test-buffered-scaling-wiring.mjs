import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const read = (path) => readFileSync(join(rootDir, path), "utf8");
const webAppSource = read("pwa/src/app/JackalWebApp.ts");
const preferencesSource = read("pwa/src/app/AppPreferences.ts");
const pickerSource = read("pwa/src/app/ScalingPicker.ts");
const viewportSource = read("pwa/src/app/GameViewportController.ts");
const stylesSource = read("pwa/src/styles.css");
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));

test("Jackal PWA renders through the native buffered scaler with configurable presentation filtering", () => {
    assert.match(
        webAppSource,
        /new runtime\.slick\.BufferedScalableGame\(mainGame, GAME_DISPLAY_WIDTH, GAME_DISPLAY_HEIGHT, \{\s*maintainAspect: true,\s*scalingMode: this\.getBufferedScalingMode\(runtime\.slick\)\s*\}\)/
    );
    assert.match(viewportSource, /private bufferedGame: BufferedScalableGame \| null = null;/);
    assert.match(webAppSource, /this\.viewport\.attach\(appContainer, bufferedGame, (?:session|gameGeneration)\)/);
    assert.doesNotMatch(webAppSource, /new runtime\.slick\.ScalableGame\(\s*mainGame/);
    assert.doesNotMatch(webAppSource, /mainGame\.scalableGame\s*=/);
    assert.match(viewportSource, /public attach\(container: AppGameContainer, bufferedGame: BufferedScalableGame, sessionGeneration: number\): void/);
});

test("Jackal PWA exposes a persisted scaling menu with Smooth as the default", () => {
    assert.doesNotMatch(webAppSource + pickerSource, /scaling-input/);
    assert.match(preferencesSource, /export const SCALING_STORAGE_KEY = "jackal-scaling";/);
    assert.match(preferencesSource, /export const DEFAULT_SCALING_PREFERENCE: JackalScalingPreference = "smooth";/);
    assert.match(pickerSource, /id="scaling-picker"/);
    assert.match(pickerSource, /id="scaling-button"/);
    assert.match(pickerSource, /id="scaling-list"/);
    assert.match(webAppSource, /<span>Scaling<\/span>/);
    assert.match(preferencesSource, /\{ value: "smooth", label: "Smooth" \}/);
    assert.match(preferencesSource, /\{ value: "crisp", label: "Crisp" \}/);
    assert.match(preferencesSource, /\{ value: "pixel-perfect", label: "Pixel Perfect" \}/);
    assert.match(webAppSource, /case "crisp":\s*return slick\.BufferedScalingMode\.Nearest;/);
    assert.match(webAppSource, /case "pixel-perfect":\s*return slick\.BufferedScalingMode\.Integer;/);
    assert.match(webAppSource, /case "smooth":\s*default:\s*return slick\.BufferedScalingMode\.Linear;/);
    assert.match(webAppSource, /this\.viewport\.setScalingMode\(this\.getBufferedScalingMode\(this\.runtimeLoader\.preparedRuntime\.slick\)\);/);
    assert.match(stylesSource, /\.setting-scaling-row\s*\{/);
    assert.match(stylesSource, /\.theme-picker-button\s*\{/);
    assert.match(stylesSource, /var\(--title-cream\)/);
});

test("Jackal PWA reset clears persisted state and restores menu defaults", () => {
    assert.match(webAppSource, /id="reset-button" class="reset-button" type="button">Reset<\/button>/);
    assert.match(webAppSource, /addEventListener\("click", \(\) => this\.resetPwaState\(\)\);/);
    assert.match(
        webAppSource,
        /private resetPwaState\(\): void \{\s*this\.destroyGame\(\);\s*this\.clearPwaStorage\(\);\s*this\.volume = DEFAULT_VOLUME;\s*this\.scalingPreference = DEFAULT_SCALING_PREFERENCE;[\s\S]*?this\.renderMenu\(this\.root, false, null, false\);/
    );
    assert.match(webAppSource, /clearPreferences\(\);/);
    assert.match(webAppSource, /clearStoredGameState\(\);/);
    assert.match(webAppSource, /this\.inputMappingStore\.clear\(\);/);
    assert.match(webAppSource, /this\.gameStateStore = null;/);
    assert.match(stylesSource, /\.reset-button\s*\{/);
});

test("Jackal requires a slick2d-ts release with buffered scaling support", () => {
    assert.equal(packageJson.dependencies["slick2d-ts"], "git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.5.1");
    assert.equal(packageLock.packages[""].dependencies["slick2d-ts"], "git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.5.1");
    assert.equal(packageLock.packages["node_modules/slick2d-ts"].version, "1.5.1");
    assert.match(packageLock.packages["node_modules/slick2d-ts"].resolved, /^git\+https:\/\/github\.com\/meatfighter\/slick2d-ts\.git#/);
});
