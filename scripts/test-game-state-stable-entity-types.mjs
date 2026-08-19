import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const serializerSource = readFileSync(new URL("../pwa/src/jackal/persistence/JackalGameStateSerializer.ts", import.meta.url), "utf8");
const registrySource = readFileSync(new URL("../pwa/src/jackal/persistence/GameElementTypeRegistry.ts", import.meta.url), "utf8");
const snapshotSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSnapshot.ts", import.meta.url), "utf8");

test("game-state entity snapshots use stable registry IDs", () => {
    assert.match(registrySource, /export function getGameElementTypeId/);
    assert.match(registrySource, /GAME_ELEMENT_TYPE_ID_BY_CONSTRUCTOR/);
    assert.match(serializerSource, /getGameElementTypeId\(entity\)/);
    assert.doesNotMatch(serializerSource, /const\s+type\s*=\s*entity\.constructor\?\.name/);
});

test("entity snapshot types are restricted to registered IDs", () => {
    assert.match(registrySource, /export type GameElementTypeId = keyof typeof GAME_ELEMENT_TYPES/);
    assert.match(registrySource, /export function isGameElementTypeId/);
    assert.match(serializerSource, /isGameElementTypeId\(value\)/);
    assert.match(snapshotSource, /type:\s*GameElementTypeId/);
});
