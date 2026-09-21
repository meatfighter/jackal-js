import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const schemaSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSchema.ts", import.meta.url), "utf8");
const snapshotSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSnapshot.ts", import.meta.url), "utf8");
const storageSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateStorage.ts", import.meta.url), "utf8");
const webAppSource = readFileSync(new URL("../pwa/src/app/JackalWebApp.ts", import.meta.url), "utf8");
const storeSource = readFileSync(new URL("../pwa/src/jackal/persistence/JackalGameStateStore.ts", import.meta.url), "utf8");

test("game-state schema constants have one current-version runtime source", () => {
    assert.match(schemaSource, /export const GAME_STATE_VERSION = 16 as const;/);
    assert.match(schemaSource, /export type SupportedGameStateVersion = typeof GAME_STATE_VERSION;/);
    assert.match(schemaSource, /export const GAME_STATE_STORAGE_KEY = "jackal\.game-state-v16";/);
    assert.match(schemaSource, /return value === GAME_STATE_VERSION;/);
    assert.doesNotMatch(schemaSource, /FIRST_PUBLIC_GAME_STATE_VERSION|MIN_SUPPORTED|SUPPORTED_GAME_STATE_VERSIONS|shouldPreserveUnsupportedGameStateSnapshot/);
    assert.match(snapshotSource, /export \{ GAME_STATE_VERSION \} from "\.\/GameStateSchema\.js";/);
    assert.doesNotMatch(snapshotSource, /export const GAME_STATE_VERSION =/);
});

test("PWA shell and store share the same game-state storage gateway", () => {
    assert.match(webAppSource, /hasCurrentStoredGameState/);
    assert.match(webAppSource, /clearStoredGameState/);
    assert.doesNotMatch(webAppSource, /localStorage\.(?:getItem|setItem|removeItem)/);
    assert.match(storeSource, /inspectStoredGameState/);
    assert.match(storeSource, /writeStoredGameState/);
    assert.match(storeSource, /isAuthorized: \(\) => boolean/);
    assert.match(storeSource, /clearStoredGameState/);
    assert.match(storageSource, /GAME_STATE_STORAGE_KEY/);
    assert.match(storageSource, /isSupportedGameStateSnapshot/);
    assert.match(storageSource, /status: "unsupported-future"/);
    assert.match(storageSource, /reason: "not-authorized"/);
    assert.match(storageSource, /isAuthorized\(\)/);
    assert.match(storageSource, /reason: "read-failed"/);
    assert.match(storageSource, /reason: "invalid-existing"/);
    assert.doesNotMatch(storageSource, /shouldPreserveUnsupportedGameStateSnapshot/);
});
