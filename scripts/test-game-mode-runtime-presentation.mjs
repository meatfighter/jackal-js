import assert from "node:assert/strict";
import { test } from "node:test";
import { createGraphFixture, createSavedGraph } from "./game-mode-persistence-test-utils.mjs";
const { server, make } = await createGraphFixture();

test("all conveyor frames restore before update and debris IDs use immutable images", async () => {
    const runtime = await server.ssrLoadModule("/src/jackal/persistence/EntityRuntimePersistence.ts");
    const { TILE_DEBRIS_SPRITE_TILE_FIELD: field } = await server.ssrLoadModule("/src/jackal/persistence/EntityRuntimeFields.ts");
    const conveyors = Array.from({ length: 16 }, () => ({}));
    const main = { conveyors };
    const world = { stageIndex: 5, tiles: [...conveyors], conveyorLastIndex: 0 };
    for (let frame = 0; frame < 16; frame++) {
        world.conveyorLastIndex = frame;
        runtime.restoreGameModeRuntimePresentation(main, world);
        assert.equal(world.tiles[0], conveyors[frame]);
        for (let id = 0; id < 16; id++) {
            const debris = make("TileDebris");
            debris.sprite = conveyors[id];
            const fields = runtime.captureEntityRuntimeFields(debris, main, world);
            assert.equal(fields[field], id);
            debris.sprite = null;
            runtime.restoreEntityRuntimeState(debris, "TileDebris", main, world, fields);
            assert.equal(debris.sprite, conveyors[id]);
        }
    }
    const debris = make("TileDebris");
    assert.throws(() => runtime.restoreEntityRuntimeState(debris, "TileDebris", main, world, { [field]: 16 }));
    conveyors[3] = undefined;
    assert.throws(() => runtime.restoreEntityRuntimeState(debris, "TileDebris", main, world, { [field]: 3 }));
});

test("loaded-resource preflight rejects unavailable debris without guessing from the map", async () => {
    const fixture = await createGraphFixture();
    const { serializer, snapshot, main, source } = await createSavedGraph(fixture);
    const { isSupportedSnapshotForLoadedResources: valid } = await fixture.server.ssrLoadModule("/src/jackal/persistence/GameStateResourcePreflight.ts");
    const { TILE_DEBRIS_SPRITE_TILE_FIELD: field } = await fixture.server.ssrLoadModule("/src/jackal/persistence/EntityRuntimeFields.ts");
    assert.equal(valid(source, snapshot), true);
    const absent = structuredClone(snapshot);
    absent.gameMode.entities.find((e) => e.type === "TileDebris").runtimeFields[field] = 16;
    assert.equal(serializer.isSupportedSnapshot(absent), true);
    assert.equal(valid(source, absent), false);
    const fresh = main(),
        unavailable = structuredClone(snapshot);
    unavailable.gameMode.entities.find((e) => e.type === "TileDebris").runtimeFields[field] = 3;
    fresh.conveyors[3] = undefined;
    assert.ok(fresh.stages[5].tiles[3]);
    assert.equal(valid(fresh, unavailable), false);
    assert.throws(() => serializer.restoreSnapshot(fresh, {}, unavailable), /Unsupported/);
    assert.equal(fresh.mode, null);
});
