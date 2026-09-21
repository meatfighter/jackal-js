import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { loadTypeScript, sourceMember } from "./persistence-test-loader.mjs";
const schema=await loadTypeScript("pwa/src/jackal/persistence/GameStateSchema.ts");

test("schema discriminator has one runtime source and the logical key has no version",()=>{
    assert.equal(schema.GAME_STATE_STORAGE_KEY,"jackal.game-state");
    assert.ok(Number.isInteger(schema.GAME_STATE_VERSION));
    assert.equal(schema.isSupportedGameStateVersion(schema.GAME_STATE_VERSION),true);
    assert.equal(schema.isSupportedGameStateVersion(schema.GAME_STATE_VERSION+1),false);
    const snapshot=readFileSync("pwa/src/jackal/persistence/GameStateSnapshot.ts","utf8");
    assert.doesNotMatch(snapshot,/export const GAME_STATE_VERSION\s*=/);
});

test("store saving has no old-data dependency, while restore retains inspection",()=>{
    const save=sourceMember("pwa/src/jackal/persistence/JackalGameStateStore.ts","save","JackalGameStateStore");
    assert.doesNotMatch(save,/inspectStoredGameState|hasValidSave|read-failed|invalid-existing|unsupported-future/);
    assert.match(save,/writeStoredGameState/);
    const gateway=sourceMember("pwa/src/jackal/persistence/GameStateStorage.ts","writeStoredGameState");
    assert.doesNotMatch(gateway,/inspectStored|\.read\(|getItem/);
    assert.match(gateway,/writeCurrentSnapshot/);
});
