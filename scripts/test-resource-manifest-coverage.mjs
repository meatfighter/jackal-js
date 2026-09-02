import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const resourcesRoot = resolve(rootDir, "pwa", "public", "resources");
const manifestSource = readFileSync(resolve(rootDir, "pwa", "src", "app", "ResourceManifest.ts"), "utf8");
const manifestEntries = Array.from(manifestSource.matchAll(/^\s*"([^"]+)",?\s*$/gm), (match) => match[1]);

function collectFiles(directory) {
    const files = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectFiles(path));
        } else if (entry.isFile()) {
            files.push(relative(resourcesRoot, path).split(sep).join("/"));
        }
    }
    return files;
}

test("resource manifest entries are unique normalized deployment-relative paths", () => {
    assert.ok(manifestEntries.length > 0);
    assert.equal(new Set(manifestEntries).size, manifestEntries.length, "The resource manifest must not contain duplicate preload work.");
    for (const ref of manifestEntries) {
        assert.equal(ref, ref.trim());
        assert.doesNotMatch(ref, /^(?:\/|\\)|\\|(?:^|\/)\.\.?\//);
        assert.doesNotMatch(ref, /[?#]/, "Cache-bust queries and fragments are supplied by the runtime, not the manifest.");
    }
});

test("every resource present in the checked-out PWA tree is covered by the preload manifest", () => {
    const manifest = new Set(manifestEntries);
    const missing = collectFiles(resourcesRoot).filter((ref) => !manifest.has(ref));
    assert.deepEqual(missing, [], "A shipped resource was added without joining the authoritative loading-screen preload manifest.");
});
