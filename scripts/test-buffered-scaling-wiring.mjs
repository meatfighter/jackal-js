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
        /new runtime\.slick\.BufferedScalableGame\(mainGame, GAME_DISPLAY_WIDTH, GAME_DISPLAY_HEIGHT, \{\s*maintainAspect: true,\s*scalingMode: bufferedScalingModeForPreference\(runtime\.slick, this\.scalingPreference\)\s*\}\)/
    );
    assert.match(viewportSource, /private bufferedGame: BufferedScalableGame \| null = null;/);
    assert.match(webAppSource, /this\.viewport\.attach\(appContainer, bufferedGame, (?:session|gameGeneration)\)/);
    assert.doesNotMatch(webAppSource, /new runtime\.slick\.ScalableGame\(\s*mainGame/);
    assert.doesNotMatch(webAppSource, /mainGame\.scalableGame\s*=/);
    assert.match(viewportSource, /public attach\(container: AppGameContainer, bufferedGame: BufferedScalableGame, sessionGeneration: number\): void/);
    assert.match(webAppSource, /const MAX_DEVICE_PIXEL_RATIO = 4;/);
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
    assert.match(pickerSource, /case "crisp":\s*return slick\.BufferedScalingMode\.Nearest;/);
    assert.match(pickerSource, /case "pixel-perfect":\s*return slick\.BufferedScalingMode\.Integer;/);
    assert.match(pickerSource, /case "smooth":\s*default:\s*return slick\.BufferedScalingMode\.Linear;/);
    assert.match(
        webAppSource,
        /this\.viewport\.setScalingMode\(bufferedScalingModeForPreference\(this\.runtimeLoader\.preparedRuntime\.slick, this\.scalingPreference\)\);/
    );
    assert.match(stylesSource, /\.setting-scaling-row\s*\{/);
    assert.match(stylesSource, /\.theme-picker-button\s*\{/);
    assert.match(stylesSource, /var\(--title-cream\)/);
});

test("Jackal PWA reset clears the allowlisted persisted state, installs defaults, and reports only incomplete reset", () => {
    assert.match(webAppSource, /id="reset-button" class="reset-button" type="button">Reset<\/button>/);
    assert.match(webAppSource, /addEventListener\("click", \(\) => this\.resetPwaState\(\)\);/);

    const start = webAppSource.indexOf("private resetPwaState(): void");
    const end = webAppSource.indexOf("private clearPwaStorage(): boolean", start);
    assert.ok(start >= 0 && end > start);
    const reset = webAppSource.slice(start, end);

    assert.match(reset, /if \(!this\.canActivateFromMenu\(\)\) return;/);
    assert.match(reset, /this\.persistence\.abandonStored\(\)/);
    assert.match(reset, /if \(!this\.destroyGame\(\)\) return;/);
    assert.match(reset, /const cleared = this\.clearPwaStorage\(\)/);
    assert.match(reset, /if \(!owner\.isCurrent\(epoch\)\) return;/);
    assert.match(reset, /this\.volume = DEFAULT_VOLUME;/);
    assert.match(reset, /this\.scalingPreference = DEFAULT_SCALING_PREFERENCE;/);
    assert.match(reset, /this\.fullscreenPreference = DEFAULT_FULLSCREEN_PREFERENCE;/);
    assert.match(reset, /this\.preferredHardMode = DEFAULT_HARD_MODE;/);
    assert.match(reset, /this\.sessionMapping\.resetToDefaults\(\)/);
    assert.match(reset, /this\.applyApplicationAudioPreferences\(\)/);
    assert.match(reset, /cleared \? null : "Some settings could not be reset\."/);

    assert.match(webAppSource, /clearPersistedPwaState\(this\.inputMappingStore, \(\) => owner\.isCurrent\(epoch\)\)/);
    assert.doesNotMatch(webAppSource, /PersistenceWarningController|persistenceWarnings/);
    assert.doesNotMatch(webAppSource, /clearPreferences\(\)\s*&&\s*clearStoredGameState\(\)/);
    assert.match(webAppSource, /this\.gameStateStore = null;/);
    assert.match(stylesSource, /\.reset-button\s*\{/);
});
test("Jackal pins slick2d-ts to a reproducible public HTTPS revision", () => {
    const dependency = packageJson.dependencies["slick2d-ts"];
    const lockedDependency = packageLock.packages[""].dependencies["slick2d-ts"];
    const lockedSlick = packageLock.packages["node_modules/slick2d-ts"];

    assert.equal(dependency, lockedDependency);
    assert.match(dependency, /^https:\/\/codeload\.github\.com\/meatfighter\/slick2d-ts\/tar\.gz\/[0-9a-f]{40}$/);
    assert.equal(lockedSlick.resolved, dependency);
    assert.match(lockedSlick.version, /^\d+\.\d+\.\d+$/);
});
