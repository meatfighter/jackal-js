import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const fullscreen = [
    ["verify:fullscreen", "scripts/run-fullscreen-qualification.mjs"],
    ["verify:fullscreen-timeout", "scripts/run-fullscreen-timeout-qualification.mjs"],
    ["verify:fullscreen-reentry", "scripts/run-fullscreen-reentry-qualification.mjs"]
];
const supplemental = [
    ["verify:activation-races", "scripts/run-activation-race-qualification.mjs"],
    ["verify:audio-interruption", "scripts/run-audio-interruption-qualification.mjs"],
    ["verify:lifecycle-events", "scripts/run-lifecycle-event-qualification.mjs"],
    ["verify:ownership-transfer", "scripts/run-ownership-transfer-qualification.mjs"],
    ["verify:persistence-failure", "scripts/run-persistence-failure-qualification.mjs"],
    ["verify:lifecycle-stress", "scripts/run-lifecycle-stress-qualification.mjs"]
];
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const suiteSource = readFileSync("scripts/run-browser-qualification-suite.mjs", "utf8");

test("cutover browser qualification scripts are valid JavaScript", () => {
    for (const path of [...fullscreen.map(([, path]) => path), ...supplemental.map(([, path]) => path), "scripts/run-browser-qualification-suite.mjs"]) {
        const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
        assert.equal(result.status, 0, `${path} failed node --check:\n${result.stderr || result.stdout}`);
    }
});

test("qualify:browsers rebuilds and wires the complete cutover acceptance chain", () => {
    for (const [name, path] of [...fullscreen, ...supplemental]) {
        assert.equal(packageJson.scripts?.[name], `node ${path}`, `${name} must invoke its audited browser qualifier`);
    }
    assert.equal(packageJson.scripts?.["qualify:browsers"], "node scripts/run-browser-qualification-suite.mjs");

    const expected = [
        "verify:fullscreen",
        "verify:fullscreen-timeout",
        "verify:fullscreen-reentry",
        "verify:production-browser",
        ...supplemental.map(([name]) => name)
    ];
    const listMatch = suiteSource.match(/const qualificationScripts = (\[[\s\S]*?\]);/);
    assert.ok(listMatch, "browser qualification suite must declare its script chain");
    assert.deepEqual(JSON.parse(listMatch[1]), expected);
    assert.ok(suiteSource.indexOf('runNpmScript("build:pwa")') < suiteSource.indexOf("for (const script of qualificationScripts)"));
    assert.match(suiteSource, /PWA_ROOT:\s*pwaRoot/);
    assert.match(suiteSource, /join\(componentReleaseDir, "pwa"\)/);
});
