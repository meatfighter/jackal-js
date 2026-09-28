import assert from "node:assert/strict";
import { test } from "node:test";
import { createGraphFixture, createSavedGraph } from "./game-mode-persistence-test-utils.mjs";
const { graph, JackalGameStateSerializer, list, layers, make } = await createGraphFixture();

test("ordered graph validates exact active membership and independent subsets", () => {
    const valid = {
        entities: [
            { id: 0, type: "Rock", fields: { enemy: true } },
            { id: 1, type: "BrownTank", fields: { enemy: true } },
            { id: 2, type: "BossHeadquartersManager", fields: { enemy: false } }
        ],
        elements: [[0], [1], [], [], [], [], [], []],
        indexes: { enemies: [1, 0], solids: [0, 1], mines: [1] }
    };
    assert.equal(graph.isGameModeIndexGraph(valid), true);
    const mutations = [
        (v) => delete v.indexes,
        (v) => delete v.indexes.mines,
        (v) => (v.indexes.extra = []),
        (v) => (v.indexes.enemies = [0]),
        (v) => (v.indexes.enemies = [1, 1]),
        (v) => (v.indexes.solids = [2]),
        (v) => (v.indexes.mines = [4096]),
        (v) => (v.indexes.mines = [0.5]),
        (v) => (v.entities[0].type = "BulletHit"),
        (v) => (v.elements[7] = [0]),
        (v) => (v.indexes.enemies = Array(4097).fill(0))
    ];
    for (const mutate of mutations) {
        const v = structuredClone(valid);
        mutate(v);
        assert.equal(graph.isGameModeIndexGraph(v), false, String(mutate));
    }
    const pending = structuredClone(valid);
    pending.entities[0].fields.removeFlag = true;
    pending.entities[0].fields.changeLayerValue = 3;
    assert.equal(graph.isGameModeIndexGraph(pending), true);
});

test("camera listener role matrix distinguishes entry, ending, and retained roots", () => {
    for (const type of graph.CAMERA_PAN_LISTENER_TYPES) {
        const types = new Map([[0, type]]);
        const f = { cameraPanListener: { kind: "entityRef", id: 0 }, bossCameraPan: false, endingCameraPan: false, playing: true };
        assert.equal(graph.isGameModeCameraPanState(f, types), true);
        assert.equal(graph.isGameModeCameraPanState({ ...f, bossCameraPan: true }, types), type !== "BossSuperTank");
        assert.equal(graph.isGameModeCameraPanState({ ...f, endingCameraPan: true, playing: false }, types), type === "BossSuperTank");
        assert.equal(graph.isGameModeCameraPanState({ ...f, endingCameraPan: true }, types), false);
        assert.equal(graph.isGameModeCameraPanState({ ...f, bossCameraPan: true, endingCameraPan: true }, types), false);
    }
});

test("entity discovery and index capture enforce the shared budget without alias inflation", () => {
    const world = { elements: layers(), cameraPanListener: null };
    for (let i = 0; i < 4096; i++) world.elements[0].add(make("BossHeadquartersManager"));
    const serializer = new JackalGameStateSerializer();
    assert.equal(serializer.createGameStateEncodeContext({}, world, {}).entities.length, 4096);
    world.cameraPanListener = world.elements[0].get(0);
    assert.equal(serializer.createGameStateEncodeContext({}, world, {}).entities.length, 4096);
    world.cameraPanListener = make("BossHeadquartersManager");
    assert.throws(() => serializer.createGameStateEncodeContext({}, world, {}), /budget/);
    const enemy = make("Rock");
    const valid = { enemies: list(enemy), solids: list(), mines: list() };
    const context = { ids: new Map([[enemy, 0]]) };
    assert.deepEqual(graph.captureGameModeIndexes(valid, context), { enemies: [0], solids: [], mines: [] });
    assert.throws(() => graph.captureGameModeIndexes({ ...valid, enemies: list(enemy, enemy) }, context), /Invalid/);
    assert.throws(() => graph.captureGameModeIndexes(valid, { ids: new Map() }), /unregistered/);
    assert.throws(() => graph.captureGameModeIndexes({ ...valid, enemies: { size: () => 4097 } }, context), /budget/);
});

test("complete serialized positives reject one-property graph mutations without losing legitimate detached entities", async () => {
    const fixture = await createGraphFixture();
    const { serializer, snapshot, main } = await createSavedGraph(fixture);
    assert.equal(serializer.isSupportedSnapshot(snapshot), true);
    const id = (type) => snapshot.gameMode.entities.find((e) => e.type === type).id;
    const mutations = [
        (s) => delete s.gameMode.indexes,
        (s) => delete s.gameMode.indexes.mines,
        (s) => (s.gameMode.indexes.extra = []),
        (s) => s.gameMode.indexes.enemies.pop(),
        (s) => s.gameMode.indexes.enemies.push(s.gameMode.indexes.enemies[0]),
        (s) => (s.gameMode.indexes.solids = [-1]),
        (s) => (s.gameMode.indexes.mines = [0.5]),
        (s) => (s.gameMode.indexes.mines = [4096]),
        (s) => (s.gameMode.indexes.mines = [4095]),
        (s) => (s.gameMode.indexes.solids = [id("BossHeadquartersManager")]),
        (s) => s.gameMode.indexes.enemies.push(id("Rock")),
        (s) => (s.gameMode.indexes.mines = [id("TileDebris")]),
        (s) => s.gameMode.elements[0].push(id("BossSuperTank")),
        (s) => delete s.gameMode.fields.cameraPanListener,
        (s) => (s.gameMode.fields.cameraPanListener = { kind: "entityRef", id: 4095 }),
        (s) => (s.gameMode.fields.cameraPanListener = { kind: "entityRef", id: id("Rock") }),
        (s) => (s.gameMode.entities = Array(4097).fill(s.gameMode.entities[0]))
    ];
    for (const mutate of mutations) {
        const bad = structuredClone(snapshot);
        mutate(bad);
        assert.equal(serializer.isSupportedSnapshot(bad), false, String(mutate));
    }
    const boss = structuredClone(snapshot);
    boss.gameMode.fields.bossCameraPan = true;
    assert.equal(serializer.isSupportedSnapshot(boss), true);
    const wrongBoss = structuredClone(boss);
    wrongBoss.gameMode.fields.cameraPanListener = { kind: "entityRef", id: id("BossSuperTank") };
    assert.equal(serializer.isSupportedSnapshot(wrongBoss), false);
    const ending = structuredClone(snapshot);
    Object.assign(ending.gameMode.fields, { endingCameraPan: true, playing: false, cameraPanListener: { kind: "entityRef", id: id("BossSuperTank") } });
    assert.equal(serializer.isSupportedSnapshot(ending), true);
    const wrongEnding = structuredClone(ending);
    wrongEnding.gameMode.fields.playing = true;
    assert.equal(serializer.isSupportedSnapshot(wrongEnding), false);
    const fresh = main();
    serializer.restoreSnapshot(fresh, {}, snapshot);
    assert.equal(fresh.mode.enemies.size(), 2);
    assert.equal(fresh.mode.solids.size(), 0);
    assert.equal(fresh.mode.mines.size(), 0);
    const explosion = fresh.mode.elements.flatMap((list) => Array.from({ length: list.size() }, (_, i) => list.get(i))).find((e) => e.sourceEnemy);
    assert.equal(explosion.sourceEnemy.removeFlag, true);
    assert.ok(explosion.sourceEnemy.mines === fresh.mode.mines, "Detached enemy list rebinding");
    assert.ok(explosion.enemies === fresh.mode.enemies, "Explosion list rebinding");
});
