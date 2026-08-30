import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const webAppSource = readFileSync(join(rootDir, "pwa", "src", "app", "JackalWebApp.ts"), "utf8");
const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(join(rootDir, "package-lock.json"), "utf8"));

test("Jackal PWA renders through the native buffered scaler with linear presentation filtering", () => {
    assert.match(
        webAppSource,
        /new runtime\.slick\.BufferedScalableGame\(\s*mainGame,\s*GAME_DISPLAY_WIDTH,\s*GAME_DISPLAY_HEIGHT,\s*\{\s*maintainAspect:\s*true,\s*scalingMode:\s*runtime\.slick\.BufferedScalingMode\.Linear\s*\}\s*\)/
    );
    assert.doesNotMatch(webAppSource, /new runtime\.slick\.ScalableGame\(\s*mainGame/);
    assert.doesNotMatch(webAppSource, /mainGame\.scalableGame\s*=/);
});

test("Jackal PWA keeps scaling mode out of the user-facing menu", () => {
    assert.doesNotMatch(webAppSource, /scaling-input/);
    assert.doesNotMatch(webAppSource, /SCALING_STORAGE_KEY/);
    assert.doesNotMatch(webAppSource, /jackal-scaling/);
    assert.doesNotMatch(webAppSource, /setScalingPreference/);
    assert.doesNotMatch(webAppSource, /setScalingMode\(/);
    assert.doesNotMatch(webAppSource, /BufferedScalingMode\.Nearest/);
    assert.doesNotMatch(webAppSource, /BufferedScalingMode\.Integer/);
});

test("Jackal requires a slick2d-ts release with buffered scaling support", () => {
    assert.equal(packageJson.dependencies["slick2d-ts"], "git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.3.1");
    assert.equal(packageLock.packages[""].dependencies["slick2d-ts"], "git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.3.1");
    assert.equal(packageLock.packages["node_modules/slick2d-ts"].version, "1.3.1");
    assert.match(packageLock.packages["node_modules/slick2d-ts"].resolved, /^git\+https:\/\/github\.com\/meatfighter\/slick2d-ts\.git#/);
});
