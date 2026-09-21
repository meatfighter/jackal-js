import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const read = (path) => readFileSync(join(rootDir, path), "utf8");

test("public dependency metadata uses anonymous HTTPS cloning", () => {
    const packageJson = JSON.parse(read("package.json"));
    const packageLock = JSON.parse(read("package-lock.json"));
    assert.equal(packageJson.homepage, "https://meatfighter.com/jackal/");
    assert.equal(packageJson.repository.url, "git+https://github.com/meatfighter/jackal-js.git");
    assert.equal(packageJson.bugs.url, "https://github.com/meatfighter/jackal-js/issues");
    assert.match(packageLock.packages["node_modules/slick2d-ts"].resolved, /^https:\/\/codeload\.github\.com\/meatfighter\/slick2d-ts\/tar\.gz\/[0-9a-f]{40}$/);
});

test("schema 16 is explicitly the development cutover saved-game format", () => {
    const schema = read("pwa/src/jackal/persistence/GameStateSchema.ts");
    assert.match(schema, /GAME_STATE_VERSION = 16 as const/);
    assert.match(schema, /GAME_STATE_STORAGE_KEY = "jackal\.game-state-v15"/);
    assert.match(schema, /return value === GAME_STATE_VERSION/);
    assert.doesNotMatch(schema, /FIRST_PUBLIC_GAME_STATE_VERSION|MIN_SUPPORTED|SUPPORTED_GAME_STATE_VERSIONS/);
    assert.match(schema, /MAX_GAME_STATE_TEXT_LENGTH = 2_000_000/);
});

test("input-mapping schema 3 is explicitly the first public mapping format", () => {
    const mappingStore = read("pwa/src/app/JackalInputMappingStore.ts");
    assert.match(mappingStore, /SNAPSHOT_VERSION = 3/);
    assert.match(mappingStore, /FIRST_PUBLIC_SNAPSHOT_VERSION = 3/);
    assert.match(mappingStore, /version >= 1/);
    assert.match(mappingStore, /version < JackalInputMappingStore\.FIRST_PUBLIC_SNAPSHOT_VERSION/);
    assert.match(mappingStore, /snapshot\.version === JackalInputMappingStore\.SNAPSHOT_VERSION/);
    assert.match(mappingStore, /private writeBlockedReason\(\): MappingWriteFailureReason \| null/);
    assert.match(mappingStore, /return "protected"/);
});

test("PWA manifest has a dedicated maskable application icon", () => {
    const manifest = read("pwa/public/manifest.webmanifest");
    assert.match(manifest, /512x512-maskable\.png/);
    assert.match(manifest, /"purpose": "maskable"/);
    assert.equal(existsSync(join(rootDir, "pwa", "public", "resources", "icons", "512x512-maskable.png")), true);
});

test("desktop public package excludes unsupported native trees", () => {
    const build = read("scripts/build-desktop.mjs");
    const verifier = read("scripts/verify-release-candidate.mjs");
    assert.doesNotMatch(build, /copyDirectoryContents\(nativeDir, targetNativeDir\)/);
    assert.match(build, /for \(const \[platform, files\] of Object\.entries\(requiredNatives\)\)/);
    assert.match(verifier, /Desktop ZIP contains unsupported native files/);
});
