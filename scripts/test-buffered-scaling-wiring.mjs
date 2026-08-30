import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const webAppSource = readFileSync(join(rootDir, "pwa", "src", "app", "JackalWebApp.ts"), "utf8");
const stylesSource = readFileSync(join(rootDir, "pwa", "src", "styles.css"), "utf8");
const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(join(rootDir, "package-lock.json"), "utf8"));

test("Jackal PWA renders through the native buffered scaler with configurable presentation filtering", () => {
    assert.match(
        webAppSource,
        /new runtime\.slick\.BufferedScalableGame\(\s*mainGame,\s*GAME_DISPLAY_WIDTH,\s*GAME_DISPLAY_HEIGHT,\s*\{\s*maintainAspect:\s*true,\s*scalingMode:\s*this\.getBufferedScalingMode\(runtime\.slick\)\s*\}\s*\)/
    );
    assert.match(webAppSource, /private bufferedGame: BufferedScalableGame \| null = null;/);
    assert.doesNotMatch(webAppSource, /new runtime\.slick\.ScalableGame\(\s*mainGame/);
    assert.doesNotMatch(webAppSource, /mainGame\.scalableGame\s*=/);
});

test("Jackal PWA exposes a persisted scaling menu with Smooth as the default", () => {
    assert.doesNotMatch(webAppSource, /scaling-input/);
    assert.match(webAppSource, /const SCALING_STORAGE_KEY = "jackal-scaling";/);
    assert.match(webAppSource, /const DEFAULT_SCALING_PREFERENCE: JackalScalingPreference = "smooth";/);
    assert.match(webAppSource, /id="scaling-picker"/);
    assert.match(webAppSource, /id="scaling-button"/);
    assert.match(webAppSource, /id="scaling-list"/);
    assert.match(webAppSource, /<span>Scaling<\/span>/);
    assert.match(webAppSource, /\{ value: "smooth", label: "Smooth" \}/);
    assert.match(webAppSource, /\{ value: "crisp", label: "Crisp" \}/);
    assert.match(webAppSource, /\{ value: "pixel-perfect", label: "Pixel Perfect" \}/);
    assert.match(webAppSource, /case "crisp":\s*return slick\.BufferedScalingMode\.Nearest;/);
    assert.match(webAppSource, /case "pixel-perfect":\s*return slick\.BufferedScalingMode\.Integer;/);
    assert.match(webAppSource, /case "smooth":\s*default:\s*return slick\.BufferedScalingMode\.Linear;/);
    assert.match(webAppSource, /this\.bufferedGame\?\.setScalingMode\(this\.getBufferedScalingMode\(this\.preparedRuntime\.slick\)\);/);
    assert.match(stylesSource, /\.setting-scaling-row\s*\{/);
    assert.match(stylesSource, /\.theme-picker-button\s*\{/);
    assert.match(stylesSource, /var\(--title-cream\)/);
});

test("Jackal PWA reset clears persisted state and restores menu defaults", () => {
    assert.match(webAppSource, /const PWA_RESET_STORAGE_KEYS = \[GAME_STATE_STORAGE_KEY, VOLUME_STORAGE_KEY, SCALING_STORAGE_KEY\] as const;/);
    assert.match(webAppSource, /id="reset-button" class="reset-button" type="button">Reset<\/button>/);
    assert.match(webAppSource, /addEventListener\("click", \(\) => this\.resetPwaState\(\)\);/);
    assert.match(
        webAppSource,
        /private resetPwaState\(\): void \{\s*this\.destroyGame\(\);\s*this\.clearPwaStorage\(\);\s*this\.volume = DEFAULT_VOLUME;\s*this\.scalingPreference = DEFAULT_SCALING_PREFERENCE;[\s\S]*?this\.renderMenu\(this\.root, false, null, false\);/
    );
    assert.match(webAppSource, /this\.inputMappingStore\.clear\(\);/);
    assert.match(webAppSource, /this\.gameStateStore = null;/);
    assert.match(stylesSource, /\.reset-button\s*\{/);
});

test("Jackal requires a slick2d-ts release with buffered scaling support", () => {
    assert.equal(packageJson.dependencies["slick2d-ts"], "git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.3.1");
    assert.equal(packageLock.packages[""].dependencies["slick2d-ts"], "git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.3.1");
    assert.equal(packageLock.packages["node_modules/slick2d-ts"].version, "1.3.1");
    assert.match(packageLock.packages["node_modules/slick2d-ts"].resolved, /^git\+https:\/\/github\.com\/meatfighter\/slick2d-ts\.git#/);
});
