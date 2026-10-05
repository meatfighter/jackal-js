import { semanticCommands } from "./persistence-fuzz/semantic-floor.mjs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const fullscreen = [
    ["verify:fullscreen", "scripts/run-fullscreen-qualification.mjs"],
    ["verify:fullscreen-timeout", "scripts/run-fullscreen-timeout-qualification.mjs"],
    ["verify:fullscreen-reentry", "scripts/run-fullscreen-reentry-qualification.mjs"],
    ["verify:fullscreen-settings", "scripts/run-fullscreen-settings-qualification.mjs"]
];
const supplemental = [
    ["verify:activation-races", "scripts/run-activation-race-qualification.mjs"],
    ["verify:audio-interruption", "scripts/run-audio-interruption-qualification.mjs"],
    ["verify:lifecycle-events", "scripts/run-lifecycle-event-qualification.mjs"],
    ["verify:ownership-transfer", "scripts/run-ownership-transfer-qualification.mjs"],
    ["verify:persistence-failure", "scripts/run-persistence-failure-qualification.mjs"],
    ["verify:lifecycle-stress", "scripts/run-lifecycle-stress-qualification.mjs"]
];
const unrelatedBrowserSuites = ["scripts/run-production-browser-qualification.mjs", ...supplemental.map(([, path]) => path)];
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const suiteSource = readFileSync("scripts/run-browser-qualification-suite.mjs", "utf8");

test("browser verification retains the offline gate after the semantic receipt", () => {
    assert.equal(packageJson.scripts["verify:browser"], "node scripts/persistence-fuzz/semantic-run.mjs browser && node scripts/run-offline-verification.mjs");
    assert.deepEqual(semanticCommands[packageJson.name].browser, ["scripts/run-browser-verification.mjs"]);
});

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
        "verify:departure-save",
        "verify:fullscreen",
        "verify:fullscreen-timeout",
        "verify:fullscreen-reentry",
        "verify:fullscreen-settings",
        "verify:production-browser",
        ...supplemental.map(([name]) => name)
    ];
    const listMatch = suiteSource.match(/const qualificationScripts = (\[[\s\S]*?\]);/);
    assert.ok(listMatch, "browser qualification suite must declare its script chain");
    assert.deepEqual(JSON.parse(listMatch[1]), expected);
    assert.ok(suiteSource.indexOf('runNpmScript("build:pwa")') < suiteSource.indexOf("for (const script of qualificationScripts)"));
    assert.ok(
        suiteSource.indexOf('runNpmScript("verify:persistence-fuzz:browsers"') >
            suiteSource.indexOf('runNodeScript("scripts/persistence-fuzz/semantic-run.mjs", ["boundaries"]')
    );
    assert.deepEqual(semanticCommands[packageJson.name].boundaries, ["scripts/run-game-mode-persistence-qualification.mjs"]);
    assert.match(suiteSource, /PWA_ROOT:\s*pwaRoot/);
    assert.match(suiteSource, /join\(componentReleaseDir, "pwa"\)/);
});

test("unrelated browser qualifiers explicitly disable the default-on Fullscreen preference", () => {
    for (const path of unrelatedBrowserSuites) {
        const source = readFileSync(path, "utf8");
        assert.match(
            source,
            /import \{ disableFullscreenPreference \} from "\.\/fullscreen-test-utils\.mjs";/,
            `${path} must import the shared Fullscreen-OFF helper`
        );
        const calls = source.match(/disableFullscreenPreference\s*\(/g) ?? [];
        assert.ok(calls.length >= 1, `${path} imports the helper but never calls it before exercising its original non-fullscreen contract`);
    }
});

test("departure qualification is executable and required by both built-PWA gates", () => {
    assert.equal(packageJson.scripts["verify:departure-save"], "node scripts/persistence-fuzz/semantic-run.mjs departure");
    assert.deepEqual(semanticCommands[packageJson.name].departure, ["scripts/run-departure-save-qualification.mjs"]);
    assert.match(
        packageJson.scripts.qualify,
        /npm run verify:departure-save && npm run verify:persistence-fuzz:controls && npm run verify:persistence-fuzz && node scripts\/assert-clean-git\.mjs$/
    );
    assert.match(readFileSync("scripts/run-browser-qualification-suite.mjs", "utf8"), /"verify:departure-save"/);
    for (const name of [
        "run-departure-save-qualification",
        "qualify-departure-shell",
        "qualify-departure-audio",
        "departure-shell-plugin",
        "departure-seeds"
    ]) {
        const result = spawnSync(process.execPath, ["--check", `scripts/${name}.mjs`], { encoding: "utf8" });
        assert.equal(result.status, 0, result.stderr || result.stdout);
    }
});
