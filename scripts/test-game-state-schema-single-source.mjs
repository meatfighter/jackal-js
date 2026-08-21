import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const schemaSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSchema.ts", import.meta.url), "utf8");
const snapshotSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSnapshot.ts", import.meta.url), "utf8");
const storeSource = readFileSync(new URL("../pwa/src/jackal/persistence/JackalGameStateStore.ts", import.meta.url), "utf8");
const webAppSource = readFileSync(new URL("../pwa/src/app/JackalWebApp.ts", import.meta.url), "utf8");

test("game-state schema constants have one runtime source", () => {
    assert.match(schemaSource, /export const GAME_STATE_VERSION = 3;/);
    assert.match(schemaSource, /export const GAME_STATE_STORAGE_KEY = "jackal\.game-state";/);
    assert.match(snapshotSource, /export \{ GAME_STATE_VERSION \} from "\.\/GameStateSchema\.js";/);
    assert.doesNotMatch(snapshotSource, /export const GAME_STATE_VERSION =/);
});

test("PWA shell and store use shared game-state schema constants", () => {
    assert.match(webAppSource, /from "\.\.\/jackal\/persistence\/GameStateSchema\.js";/);
    assert.match(storeSource, /from "\.\/GameStateSchema\.js";/);
    assert.match(webAppSource, /getDeploymentStorageKey\(GAME_STATE_STORAGE_KEY\)/);
    assert.match(webAppSource, /getDeploymentStorageKey\(VOLUME_STORAGE_KEY\)/);
    assert.match(storeSource, /getDeploymentStorageKey\(GAME_STATE_STORAGE_KEY\)/);
    assert.doesNotMatch(webAppSource, /const GAME_STATE_STORAGE_KEY =/);
    assert.doesNotMatch(webAppSource, /from "\.\.\/jackal\/persistence\/GameStateSnapshot\.js";/);
    assert.doesNotMatch(storeSource, /STORAGE_KEY = "jackal\.game-state"/);
    assert.doesNotMatch(storeSource, /JackalGameStateStore\.STORAGE_KEY/);
});
