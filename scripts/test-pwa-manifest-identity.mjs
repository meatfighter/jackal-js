import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const manifestPath = new URL("../pwa/public/manifest.webmanifest", import.meta.url);

test("Jackal PWA manifest has stable identity and install metadata", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.id, "/jackal");
    assert.equal(new URL(manifest.id, "https://example.invalid/").pathname, "/jackal");
    assert.equal(manifest.start_url, "./");

    assert.ok(manifest.icons.length >= 4);
    assert.ok(manifest.icons.every((icon) => !icon.src.includes("__BUILD_STAMP__")));
    assert.ok(manifest.icons.every((icon) => /\?v=__RESOURCE_VERSION__\([^)]+\)$/.test(icon.src)));

    const maskableIcons = manifest.icons.filter((icon) => icon.purpose === "maskable");
    assert.equal(maskableIcons.length, 1);
    assert.match(maskableIcons[0].src, /512x512-maskable\.png/);
});
