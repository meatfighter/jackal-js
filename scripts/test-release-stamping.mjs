import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { nextBuildStamp } from "./stamp-build.mjs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const versionJson = JSON.parse(readFileSync(new URL("../version.json", import.meta.url), "utf8"));
const scripts = packageJson.scripts;
const serviceWorkerSource = readFileSync(new URL("../pwa/public/sw.js", import.meta.url), "utf8");

function commands(scriptName) {
    return scripts[scriptName].split(/\s*&&\s*/);
}

function countReachableStampCommands(scriptName, visited = new Set()) {
    if (visited.has(scriptName)) {
        return 0;
    }
    visited.add(scriptName);

    let count = 0;
    for (const command of commands(scriptName)) {
        if (command === "npm run stamp") {
            count++;
            continue;
        }
        const match = /^npm run ([^\s]+)$/.exec(command);
        if (match !== null && scripts[match[1]] !== undefined) {
            count += countReachableStampCommands(match[1], visited);
        }
    }
    return count;
}

function embeddedServiceWorkerCacheName(buildStamp) {
    const header = serviceWorkerSource.slice(0, serviceWorkerSource.indexOf("const APP_ROOT"));
    const source = header.replaceAll("__APP_VERSION__", versionJson.version).replaceAll("__BUILD_STAMP__", buildStamp);
    const context = {};
    vm.runInNewContext(`${source}\nglobalThis.CACHE_NAME = CACHE_NAME;`, context);
    return context.CACHE_NAME;
}

test("standalone PWA build delegates to the release PWA build", () => {
    assert.equal(scripts["build:pwa"], "npm run build:pwa:release");
});

test("release PWA build stamps before building and verifies the built precache", () => {
    assert.deepEqual(commands("build:pwa:release"), ["npm run stamp", "npm run _build:pwa:release", "npm run verify:pwa-precache"]);
    assert.doesNotMatch(scripts["_build:pwa:release"], /\bstamp\b/);
    assert.match(scripts["_build:pwa:release"], /vite build --config pwa\/vite\.config\.ts/);
});

test("higher-level release builds stamp exactly once through the PWA release build", () => {
    assert.doesNotMatch(scripts["build:web"], /\bnpm run stamp\b/);
    assert.doesNotMatch(scripts["build"], /\bnpm run stamp\b/);
    assert.match(scripts["build:web"], /\bnpm run build:pwa:release\b/);
    assert.match(scripts["build"], /\bnpm run build:pwa:release\b/);
    assert.equal(countReachableStampCommands("build:pwa"), 1);
    assert.equal(countReachableStampCommands("build:pwa:release"), 1);
    assert.equal(countReachableStampCommands("build:web"), 1);
    assert.equal(countReachableStampCommands("build"), 1);
});

test("successive release stamps advance even when builds start in the same second", () => {
    const first = "20260820T120000Z";
    const sameSecond = new Date(Date.UTC(2026, 7, 20, 12, 0, 0));
    const laterSecond = new Date(Date.UTC(2026, 7, 20, 12, 0, 2));

    assert.equal(nextBuildStamp(sameSecond, first), "20260820T120001Z");
    assert.equal(nextBuildStamp(laterSecond, first), "20260820T120002Z");
});

test("successive standalone PWA releases produce different service-worker cache versions", () => {
    const date = new Date(Date.UTC(2026, 7, 20, 12, 0, 0));
    const firstStamp = nextBuildStamp(date, "20260820T115959Z");
    const secondStamp = nextBuildStamp(date, firstStamp);

    assert.notEqual(firstStamp, secondStamp);
    assert.notEqual(embeddedServiceWorkerCacheName(firstStamp), embeddedServiceWorkerCacheName(secondStamp));
});
