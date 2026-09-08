import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { assertPwaReleaseTreePath, componentReleaseDir, rootDir } from "./build-utils.mjs";

const pwaDistDir = assertPwaReleaseTreePath(
    "PWA release output directory",
    resolve(rootDir, process.argv[2] ?? join(componentReleaseDir, "pwa"))
);
const manifest = JSON.parse(readFileSync(join(pwaDistDir, "manifest.webmanifest"), "utf8"));
const serviceWorker = readFileSync(join(pwaDistDir, "sw.js"), "utf8");
const resourceVersions = readResourceVersions(serviceWorker);
const relocationScopes = [
    "https://example.invalid/jackal/pwa/",
    "https://example.invalid/jackal-staging/pwa/",
    "https://example.invalid/foo/bar/baz/pwa/"
];
const identityUrls = new Set();

for (const scopeUrl of relocationScopes) {
    const scope = new URL(manifest.scope, scopeUrl).href;
    const startUrl = new URL(manifest.start_url, scopeUrl);
    const identityUrl = new URL(manifest.id, `${startUrl.origin}/`).href;

    assert.equal(scope, scopeUrl, `Manifest scope must resolve to the current PWA directory for ${scopeUrl}.`);
    assert.equal(startUrl.href, scopeUrl, `Manifest start_url must remain stable and resolve to the current PWA directory for ${scopeUrl}.`);
    assert.equal(identityUrl, `${startUrl.origin}/jackal`, `Manifest id must resolve to the Jackal game identity for ${scopeUrl}.`);
    identityUrls.add(identityUrl);

    for (const icon of manifest.icons ?? []) {
        const iconUrl = new URL(icon.src, scopeUrl);
        assert.ok(iconUrl.href.startsWith(scopeUrl), `Manifest icon must resolve inside the current PWA scope: ${icon.src}`);
        const relativePath = decodeURIComponent(iconUrl.pathname.slice(new URL(scopeUrl).pathname.length)).replace(/^\/+/, "");
        assert.ok(relativePath.startsWith("resources/"), `Manifest icon must come from the versioned resource tree: ${icon.src}`);
        const resourceRef = relativePath.slice("resources/".length);
        const expectedVersion = resourceVersions[resourceRef];
        assert.equal(typeof expectedVersion, "string", `Manifest icon must have a generated resource fingerprint: ${resourceRef}`);
        assert.equal(iconUrl.searchParams.get("v"), expectedVersion, `Manifest icon must use its content fingerprint: ${icon.src}`);
    }
}

assert.deepEqual(
    [...identityUrls],
    ["https://example.invalid/jackal"],
    "Manifest id must remain the same game identity when identical PWA bytes are mounted at different paths."
);
assert.equal(manifest.description, "A browser PWA port of Jackal.");

console.log("Verified stable Jackal PWA install metadata and content-versioned icons.");

function readResourceVersions(source) {
    const match = /const RESOURCE_VERSIONS = (\{[\s\S]*?\});/.exec(source);
    assert.ok(match?.[1], "Built service worker must contain RESOURCE_VERSIONS.");
    const versions = JSON.parse(match[1]);
    assert.ok(versions !== null && typeof versions === "object" && !Array.isArray(versions), "RESOURCE_VERSIONS must be an object.");
    return versions;
}
