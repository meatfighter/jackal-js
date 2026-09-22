import assert from "node:assert/strict";
import { test } from "node:test";
import { sourceMember } from "./persistence-test-loader.mjs";
test("volume persists on an explicit slider commit, not New Game or Continue", () => {
    const source = sourceMember("pwa/src/app/JackalWebApp.ts", "bindMenuControls", "JackalWebApp");
    assert.match(source, /addEventListener\("change", commitVolume\)/);
    assert.match(source, /writeVolume\(/);
    assert.doesNotMatch(source, /commitVolume\(\);/);
    assert.doesNotMatch(source, /persistenceWarnings|persistVolumePreference/);
});
