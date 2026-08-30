import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const webAppSource = readFileSync(join(rootDir, "pwa", "src", "app", "JackalWebApp.ts"), "utf8");
const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(join(rootDir, "package-lock.json"), "utf8"));

test("Jackal PWA renders through the configurable native buffered scaler", () => {
    assert.match(
        webAppSource,
        /new runtime\.slick\.BufferedScalableGame\(\s*mainGame,\s*GAME_DISPLAY_WIDTH,\s*GAME_DISPLAY_HEIGHT,\s*\{\s*maintainAspect:\s*true,\s*scalingMode:\s*this\.getBufferedScalingMode\(runtime\.slick\)\s*\}\s*\)/
    );
    assert.match(webAppSource, /private bufferedGame: BufferedScalableGame \| null = null;/);
    assert.match(webAppSource, /this\.bufferedGame\?\.setScalingMode\(this\.getBufferedScalingMode\(this\.preparedRuntime\.slick\)\)/);
    assert.doesNotMatch(webAppSource, /new runtime\.slick\.ScalableGame\(\s*mainGame/);
    assert.doesNotMatch(webAppSource, /mainGame\.scalableGame\s*=/);
});

test("Jackal PWA exposes persisted buffered scaling preferences", () => {
    assert.match(webAppSource, /const SCALING_STORAGE_KEY = "jackal-scaling";/);
    assert.match(webAppSource, /const SCALING_PREFERENCES = \["smooth", "crisp", "pixel-perfect"\] as const;/);
    assert.match(webAppSource, /const DEFAULT_SCALING_PREFERENCE: JackalScalingPreference = "smooth";/);
    assert.match(webAppSource, /<select id="scaling-input" aria-label="Scaling">/);
    assert.match(webAppSource, /getDeploymentStorageKey\(SCALING_STORAGE_KEY\)/);
    assert.match(webAppSource, /slick\.BufferedScalingMode\.Linear/);
    assert.match(webAppSource, /slick\.BufferedScalingMode\.Nearest/);
    assert.match(webAppSource, /slick\.BufferedScalingMode\.Integer/);
});

test("Jackal requires a slick2d-ts release with buffered scaling support", () => {
    assert.equal(packageJson.dependencies["slick2d-ts"], "git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.3.0");
    assert.equal(packageLock.packages[""].dependencies["slick2d-ts"], "git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.3.0");
    assert.equal(packageLock.packages["node_modules/slick2d-ts"].version, "1.3.0");
    assert.match(packageLock.packages["node_modules/slick2d-ts"].resolved, /^git\+https:\/\/github\.com\/meatfighter\/slick2d-ts\.git#/);
});
