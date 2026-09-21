import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const rootDir = process.cwd();
const webAppSource = readFileSync(join(rootDir, "pwa", "src", "app", "JackalWebApp.ts"), "utf8");
const mainSource = readFileSync(join(rootDir, "pwa", "src", "jackal", "Main.ts"), "utf8");
const stylesSource = readFileSync(join(rootDir, "pwa", "src", "styles.css"), "utf8");
const lifecycleStressSource = readFileSync(join(rootDir, "scripts", "run-lifecycle-stress-qualification.mjs"), "utf8");

test("menu launch admission is state-gated without sticky disabled buttons", () => {
    assert.doesNotMatch(webAppSource, /newGameButton\??\.disabled\s*=\s*true|continueButton\??\.disabled\s*=\s*true|disableLaunchButtons/);
    assert.match(webAppSource, /#new-game-button[\s\S]*?if \(!this\.canActivateFromMenu\(\)\)/);
    assert.match(webAppSource, /#continue-button[\s\S]*?if \(!this\.canActivateFromMenu\(\)\)/);
});

test("Fullscreen and Scaling share a wrapping responsive row", () => {
    assert.match(webAppSource, /class="display-settings-row"[\s\S]*?class="setting-fullscreen-row"[\s\S]*?class="setting-scaling-row"/);
    assert.match(stylesSource, /\.display-settings-row\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
});

test("Scaling preference is applied both to fresh and retained gameplay", () => {
    assert.match(webAppSource, /scalingMode:\s*bufferedScalingModeForPreference\(runtime\.slick, this\.scalingPreference\)/);
    assert.match(
        webAppSource,
        /persistScalingPreference\(value, this\.persistenceWarnings, \(\) => this\.getOwnership\(\)\.owned\)/
    );
    assert.match(
        webAppSource,
        /this\.viewport\.setScalingMode\(bufferedScalingModeForPreference\(this\.runtimeLoader\.preparedRuntime\.slick, this\.scalingPreference\)\)/
    );
});

test("translated runtime no longer carries browser windowed-display compatibility plumbing", () => {
    assert.doesNotMatch(mainSource, /WindowedDisplayMode|windowedDisplayModeProvider|getWindowedDisplayMode/);
    assert.doesNotMatch(webAppSource, /windowedDisplayModeProvider|getWindowedDisplayMode/);
});

test("lifecycle stress requires exact wake-lock acquisition and release accounting", () => {
    assert.match(lifecycleStressSource, /finalLifecycle\.wakeAcquired\s*-\s*finalLifecycle\.wakeReleased/);
    assert.match(lifecycleStressSource, /finalLifecycle\.wakeLive/);
    assert.match(lifecycleStressSource, /Wake-lock acquisition\/release accounting is unbalanced/);
});
