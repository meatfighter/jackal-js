import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { nextBuildStamp } from "./stamp-build.mjs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const versionJson = JSON.parse(readFileSync(new URL("../version.json", import.meta.url), "utf8"));
const scripts = packageJson.scripts;
const serviceWorkerSource = readFileSync(new URL("../pwa/public/sw.js", import.meta.url), "utf8");

function embeddedServiceWorkerCacheName(buildStamp) {
    const header = serviceWorkerSource.slice(0, serviceWorkerSource.indexOf("const APP_ROOT"));
    const source = header.replaceAll("__APP_VERSION__", versionJson.version).replaceAll("__BUILD_STAMP__", buildStamp);
    const context = {
        URL,
        self: {
            registration: {
                scope: "https://example.test/pwa/"
            }
        }
    };
    vm.runInNewContext(`${source}\nglobalThis.CACHE_NAME = CACHE_NAME;`, context);
    return context.CACHE_NAME;
}

test("standalone PWA build delegates to the release PWA build", () => {
    assert.equal(scripts["build:pwa"], "npm run build:pwa:release");
});

test("release PWA build uses the noncanonical component wrapper", () => {
    assert.equal(scripts["build:pwa:release"], "node scripts/build-pwa-release.mjs");
    assert.doesNotMatch(scripts["_build:pwa:release"], /\bstamp\b/);
    assert.match(scripts["_build:pwa:release"], /vite build --config pwa\/vite\.config\.ts/);
});

test("component and full release scripts route through hardened wrappers", () => {
    assert.equal(scripts["build:about"], "node scripts/build-about.mjs .release-components/web");
    assert.equal(scripts["assemble"], "node scripts/assemble.mjs .release-components/web");
    assert.equal(scripts["build:web"], "npm run verify && node scripts/build-web-release.mjs");
    assert.equal(scripts["build"], "npm run verify && node scripts/build-release.mjs");
    assert.equal(scripts["verify:release"], "node scripts/verify-release-candidate.mjs");
    assert.doesNotMatch(scripts["build:pwa:release"], /\bnpm run stamp\b|\bnpm run clean\b/);
    assert.doesNotMatch(scripts["build:web"], /\bnpm run stamp\b|\bnpm run clean\b/);
    assert.doesNotMatch(scripts["build"], /\bnpm run stamp\b|\bnpm run clean\b/);
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
