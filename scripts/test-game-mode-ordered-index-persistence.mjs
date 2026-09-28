import assert from "node:assert/strict";
import { test } from "node:test";
import { createGraphFixture } from "./game-mode-persistence-test-utils.mjs";
const { server, graph, JackalGameStateSerializer, list, items, layers, make } = await createGraphFixture();

test("three ordered indexes are independent of layer order and share restored identities", () => {
    const a = make("Rock"),
        b = make("BrownTank"),
        c = make("Rock");
    a.enemy = b.enemy = c.enemy = true;
    const world = { elements: layers(), cameraPanListener: null, enemies: list(c, a, b), solids: list(b, a), mines: list(c, a), player: {} };
    world.elements[0].add(a);
    world.elements[3].add(b);
    world.elements[5].add(c);
    const context = {
        ids: new Map([
            [a, 0],
            [b, 1],
            [c, 2]
        ])
    };
    const saved = graph.captureGameModeIndexes(world, context);
    assert.deepEqual(saved, { enemies: [2, 0, 1], solids: [1, 0], mines: [2, 0] });
    graph.restoreGameModeIndexes(
        world,
        saved,
        new Map([
            [0, a],
            [1, b],
            [2, c]
        ])
    );
    assert.deepEqual(
        items(world.enemies).map((e) => context.ids.get(e)),
        [2, 0, 1]
    );
    assert.deepEqual(
        items(world.solids).map((e) => context.ids.get(e)),
        [1, 0]
    );
    assert.deepEqual(
        items(world.mines).map((e) => context.ids.get(e)),
        [2, 0]
    );
    assert.equal(world.player.mines, world.mines);
    assert.deepEqual(world.elements.flatMap(items), [a, b, c]);
});

test("invalid index restore does not publish one of three partial lists", () => {
    const world = { enemies: list(), solids: list(), mines: list(), player: {} };
    const before = [world.enemies, world.solids, world.mines];
    assert.throws(() => graph.restoreGameModeIndexes(world, { enemies: [], solids: [99], mines: [] }, new Map()));
    assert.deepEqual([world.enemies, world.solids, world.mines], before);
});

test("real PlayerBullet reverse first-hit keeps independently saved enemy order", async () => {
    const { Main } = await server.ssrLoadModule("/src/jackal/Main.ts");
    const { PlayerBullet } = await server.ssrLoadModule("/src/jackal/PlayerBullet.ts");
    const a = make("Rock"),
        b = make("BrownTank"),
        pending = make("Rock");
    a.enemy = b.enemy = pending.enemy = true;
    pending.removeFlag = true;
    const hits = [];
    a.bulletAttack = () => {
        hits.push("a");
        return true;
    };
    b.bulletAttack = () => {
        hits.push("b");
        return true;
    };
    pending.bulletAttack = () => {
        throw Error("Removed enemy attacked");
    };
    const effects = [];
    const world = {
        elements: layers(),
        cameraPanListener: null,
        enemies: list(b, a, pending),
        solids: list(a, b),
        mines: list(b),
        player: {},
        addGameElement(e) {
            effects.push(e);
        },
        isMissileTarget() {
            return false;
        }
    };
    world.elements[0].add(a);
    world.elements[3].add(b);
    world.elements[4].add(pending);
    b.changeLayerValue = 1;
    const ids = new Map([
        [a, 0],
        [b, 1],
        [pending, 2]
    ]);
    const saved = graph.captureGameModeIndexes(world, { ids });
    Main.mainInstance = {};
    Main.gameMode = world;
    const shoot = () => {
        const bullet = make("PlayerBullet");
        bullet.enemies = world.enemies;
        bullet.gameMode = world;
        PlayerBullet.prototype.update.call(bullet);
        assert.equal(bullet.removeFlag, true);
    };
    shoot();
    graph.restoreGameModeIndexes(
        world,
        saved,
        new Map([
            [0, a],
            [1, b],
            [2, pending]
        ])
    );
    shoot();
    assert.deepEqual(hits, ["a", "a"]);
    assert.equal(effects.length, 2);
    // Historical layer reconstruction is an explicit order-sensitive negative control.
    world.enemies = list(a, b, pending);
    shoot();
    assert.equal(hits[2], "b");
});

test("real serializer keeps detached roots and cycles inactive while rebinding identities", async () => {
    const { Main } = await server.ssrLoadModule("/src/jackal/Main.ts");
    const { GameMode } = await server.ssrLoadModule("/src/jackal/GameMode.ts");
    const { Stage } = await server.ssrLoadModule("/src/jackal/Stage.ts");
    const { BossSuperTank } = await server.ssrLoadModule("/src/jackal/BossSuperTank.ts");
    const { SOUND_FIELD_NAMES } = await server.ssrLoadModule("/src/jackal/AudioRegistry.ts");
    function main() {
        const m = new Main();
        m.conveyors = Array.from({ length: 16 }, () => ({}));
        m.input = { clearKeyPressedRecord() {} };
        for (const id of SOUND_FIELD_NAMES) m[id] = { capturePlaybackState: () => ({ voices: [], activeVoiceIndex: null }), restorePlaybackState() {} };
        // Audio decoding and geometry are controlled dependencies; serializer,
        // Main, GameMode, Player, field codecs and both validators are real.
        m.stopAllSounds = () => {};
        m.isBrowserRuntimeActive = () => false;
        for (let i = 0; i < 6; i++) {
            const s = new Stage();
            s.mapWidth = 32;
            s.mapHeight = 32;
            s.tileMap = Array.from({ length: 32 }, () => Array(32).fill(0));
            s.typesMap = s.tileMap.map((row) => [...row]);
            s.tiles = i === 5 ? [...m.conveyors] : [{}];
            s.groups = [];
            s.groupsMap = s.tileMap;
            s.triggerMap = [[], []];
            s.directions = [];
            s.directionsDecoded = new Uint8Array();
            s.directionsWidth = 0;
            s.directionsHeight = 0;
            m.stages[i] = s;
        }
        return m;
    }

    const source = main();
    source.stageIndex = 5;
    Main.mainInstance = source;
    const world = new GameMode();
    Main.gameMode = world;
    world.setStage(5, source.stages[5], false);
    world.init(source, {});
    source.mode = world;
    const tank = new BossSuperTank(500, 32),
        manager = make("BossHeadquartersManager"),
        fire = make("SuperFire");
    manager.removeFlag = true;
    world.cameraPanListener = manager;
    fire.removeFlag = true;
    fire.bossSuperTank = tank;
    tank.superFire = fire;
    const serializer = new JackalGameStateSerializer(),
        snapshot = serializer.createSnapshot(source, "test");
    assert.equal(serializer.isSupportedSnapshot(snapshot), true, "Full graph positive");
    const fresh = main();
    serializer.restoreSnapshot(fresh, {}, snapshot);
    const restored = fresh.mode,
        active = restored.elements.flatMap(items),
        restoredTank = active.find((e) => e instanceof BossSuperTank);
    assert.equal(active.includes(restored.cameraPanListener), false);
    assert.equal(restored.cameraPanListener.removeFlag, true);
    assert.equal(active.includes(restoredTank.superFire), false);
    assert.ok(restoredTank.superFire.bossSuperTank === restoredTank, "Detached cycle identity");
    assert.ok(restoredTank.player === restored.player, "Tank player is rebound");
    assert.ok(restored.player.mines === restored.mines, "Player mines identity");
    assert.equal(active.length, 2, "No constructors or detached entities activated during restore");
});
