import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { buildVersionEnv, versionPath } from "./build-utils.mjs";
import { nextBuildStamp } from "./stamp-build.mjs";
import { withTemporaryBuildStamp } from "./version-stamp-utils.mjs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const versionJson = JSON.parse(readFileSync(new URL("../version.json", import.meta.url), "utf8"));
const scripts = packageJson.scripts;
const serviceWorkerSource = readFileSync(new URL("../pwa/public/sw.js", import.meta.url), "utf8");
const buildAboutSource = readFileSync(new URL("./build-about.mjs", import.meta.url), "utf8");
const buildWebSource = readFileSync(new URL("./build-web-release.mjs", import.meta.url), "utf8");
const assembleSource = readFileSync(new URL("./assemble.mjs", import.meta.url), "utf8");
const releaseDesktopSource = readFileSync(new URL("./release-desktop.mjs", import.meta.url), "utf8");
const verifyPwaPrecacheSource = readFileSync(new URL("./verify-pwa-precache.mjs", import.meta.url), "utf8");
const viteConfigSource = readFileSync(new URL("../pwa/vite.config.ts", import.meta.url), "utf8");
const buildInfoSource = readFileSync(new URL("../pwa/src/app/BuildInfo.ts", import.meta.url), "utf8");
const runtimeLoaderSource = readFileSync(new URL("../pwa/src/app/JackalRuntimeLoader.ts", import.meta.url), "utf8");
const webAppSource = readFileSync(new URL("../pwa/src/app/JackalWebApp.ts", import.meta.url), "utf8");

function embeddedServiceWorkerCacheName(buildStamp) {
    const header = serviceWorkerSource.slice(0, serviceWorkerSource.indexOf("const RESOURCE_ROOT"));
    const source = header
        .replaceAll("__APP_VERSION__", versionJson.version)
        .replaceAll("__BUILD_STAMP__", buildStamp)
        .replaceAll("__RESOURCE_VERSIONS__", "{}");
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
    assert.equal(scripts.assemble, undefined);
    assert.equal(scripts["_assemble"], "node scripts/assemble.mjs .release-components/web");
    assert.equal(scripts["build:web"], "npm run verify && node scripts/build-web-release.mjs");
    assert.equal(scripts["build"], "npm run verify && node scripts/build-release.mjs");
    assert.equal(scripts["release:desktop"], "node scripts/release-desktop.mjs");
    assert.equal(scripts["verify:desktop"], "node scripts/verify-desktop-zip.mjs");
    assert.equal(scripts["verify:release"], "node scripts/verify-release-candidate.mjs");
    assert.match(buildWebSource, /runNpmScript\("build:desktop"\)/);
    assert.match(buildWebSource, /runNpmScript\("verify:desktop"\)/);
    assert.match(buildWebSource, /runNodeScript\("scripts\/assemble\.mjs", \[webOutDir\]\)/);
    assert.match(releaseDesktopSource, /runNpmScript\("verify:desktop"\)/);
    assert.doesNotMatch(scripts["build:pwa:release"], /\bnpm run stamp\b|\bnpm run clean\b/);
    assert.doesNotMatch(scripts["build:web"], /\bnpm run stamp\b|\bnpm run clean\b/);
    assert.doesNotMatch(scripts["build"], /\bnpm run stamp\b|\bnpm run clean\b/);
});

test("production release wrappers do not honor ambient test output path variables", () => {
    assert.doesNotMatch(buildAboutSource, /JACKAL_WEB_OUT_DIR/);
    assert.doesNotMatch(assembleSource, /JACKAL_WEB_OUT_DIR/);
    assert.doesNotMatch(verifyPwaPrecacheSource, /JACKAL_PWA_DIST_DIR/);
});

test("temporary release stamp stays in memory and is consumed by Vite", async () => {
    const originalVersionBytes = readFileSync(versionPath, "utf8");
    const previousOverride = process.env[buildVersionEnv];
    let callbackRan = false;

    assert.match(viteConfigSource, /JACKAL_BUILD_VERSION_JSON/);
    await withTemporaryBuildStamp((version) => {
        callbackRan = true;
        assert.equal(readFileSync(versionPath, "utf8"), originalVersionBytes);
        assert.equal(JSON.parse(process.env[buildVersionEnv]).buildStamp, version.buildStamp);
    });

    assert.equal(callbackRan, true);
    assert.equal(readFileSync(versionPath, "utf8"), originalVersionBytes);
    assert.equal(process.env[buildVersionEnv], previousOverride);
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

test("browser runtime uses the Vite-injected release identity everywhere", () => {
    assert.match(buildInfoSource, /export const APP_VERSION(?:: string)? = __APP_VERSION__/);
    assert.match(buildInfoSource, /export const BUILD_STAMP(?:: string)? = __BUILD_STAMP__/);
    assert.match(runtimeLoaderSource, /ResourceLoader\.setCacheVersionResolver\(/);
    assert.match(webAppSource, /registerServiceWorker\(\)/);
    assert.match(webAppSource, /new runtime\.JackalGameStateStore\(APP_VERSION\)/);
    assert.doesNotMatch(runtimeLoaderSource + webAppSource, /version\.json/);
});
