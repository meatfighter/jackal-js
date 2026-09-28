import { mutationPlugin } from "./game-mode-persistence-mutants.mjs";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "./vite-test-server.mjs";

const server = await createServer({
    root: fileURLToPath(new URL("../pwa/", import.meta.url)),
    configFile: false,
    plugins: process.env.JACKAL_PERSISTENCE_MUTANT ? [mutationPlugin(process.env.JACKAL_PERSISTENCE_MUTANT)] : [],
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true, watch: null }
});
after(() => server.close());
{
    const { ArrayList } = await server.ssrLoadModule("/src/java/JavaRuntime.ts");
    const registry = await server.ssrLoadModule("/src/jackal/persistence/GameElementTypeRegistry.ts");
    const graph = await server.ssrLoadModule("/src/jackal/persistence/GameModeGraphPersistence.ts");
    const { encodeNamedFields } = await server.ssrLoadModule("/src/jackal/persistence/GameStateCodec.ts");
    const { JackalGameStateSerializer } = await server.ssrLoadModule("/src/jackal/persistence/JackalGameStateSerializer.ts");
    const list = (...values) => {
        const result = new ArrayList();
        for (const value of values) result.add(value);
        return result;
    };
    const items = (value) => Array.from({ length: value.size() }, (_, i) => value.get(i));
    const layers = () => Array.from({ length: 8 }, () => list());
    const make = (type) => {
        const prototype = registry.GAME_ELEMENT_TYPES[type].prototype;
        const value = Object.assign(Object.create(prototype), {
            removeFlag: false,
            enemy: false,
            enemyBullet: false,
            x: 0,
            y: 0,
            layer: 0,
            changeLayerValue: -1
        });
        Reflect.apply(Reflect.get(prototype, "__initializeJavaSubclassDefaults"), value, []);
        return value;
    };

    test("detached GameMode listener is discovered and encoded without becoming active", () => {
        const tank = make("BossSuperTank");
        const manager = make("BossHeadquartersManager");
        manager.removeFlag = true;
        const world = { elements: layers(), cameraPanListener: manager };
        world.elements[2].add(tank);
        const serializer = new JackalGameStateSerializer();
        const context = serializer.createGameStateEncodeContext({}, world, {});
        assert.equal(context.entities.length, 2);
        assert.equal(context.ids.get(tank), 0);
        assert.equal(context.ids.get(manager), 1);
        assert.deepEqual(encodeNamedFields(world, ["cameraPanListener"], context), {
            cameraPanListener: { kind: "entityRef", id: 1 }
        });
        assert.deepEqual(world.elements.flatMap(items), [tank]);
        assert.equal(manager.removeFlag, true);
    });

    test("root alias plus detached Tank-Fire cycle is registered exactly once", () => {
        const tank = make("BossSuperTank"),
            fire = make("SuperFire");
        tank.superFire = fire;
        fire.bossSuperTank = tank;
        fire.removeFlag = true;
        const world = { elements: layers(), cameraPanListener: tank };
        world.elements[2].add(tank);
        const context = new JackalGameStateSerializer().createGameStateEncodeContext({}, world, {});
        assert.deepEqual(context.entities, [tank, fire]);
        assert.deepEqual(world.elements.flatMap(items), [tank]);
    });

    test("unknown or undefined root is not silently converted to null", () => {
        for (const cameraPanListener of [undefined, {}, 1, []]) {
            assert.throws(() => graph.getGameModeDurableEntityReferences({ cameraPanListener }));
        }
        assert.deepEqual(graph.getGameModeDurableEntityReferences({ cameraPanListener: null }), []);
    });

    test("three ordered indexes are independent of layer order and share restored identities", () => {
        const a = make("Rock"),
            b = make("BrownTank");
        a.enemy = b.enemy = true;
        const world = {
            elements: layers(),
            cameraPanListener: null,
            enemies: list(b, a),
            solids: list(a, b),
            mines: list(b),
            player: {}
        };
        world.elements[0].add(a);
        world.elements[3].add(b);
        const context = {
            ids: new Map([
                [a, 0],
                [b, 1]
            ])
        };
        const saved = graph.captureGameModeIndexes(world, context);
        assert.deepEqual(saved, { enemies: [1, 0], solids: [0, 1], mines: [1] });
        graph.restoreGameModeIndexes(
            world,
            saved,
            new Map([
                [0, a],
                [1, b]
            ])
        );
        assert.deepEqual(items(world.enemies), [b, a]);
        assert.deepEqual(items(world.solids), [a, b]);
        assert.deepEqual(items(world.mines), [b]);
        assert.equal(world.player.mines, world.mines);
        assert.deepEqual(world.elements.flatMap(items), [a, b]);
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
        assert.equal(restoredTank.superFire.bossSuperTank, restoredTank);
        assert.equal(restoredTank.player, restored.player);
        assert.equal(restored.player.mines, restored.mines);
        assert.equal(active.length, 2, "No constructors or detached entities activated during restore");
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
}
