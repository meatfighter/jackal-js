import { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "./vite-test-server.mjs";
import { mutationPlugin } from "./game-mode-persistence-mutants.mjs";
export async function createGraphFixture() {
    const server = await createServer({
        root: fileURLToPath(new URL("../pwa/", import.meta.url)),
        configFile: false,
        plugins: process.env.JACKAL_PERSISTENCE_MUTANT ? [mutationPlugin(process.env.JACKAL_PERSISTENCE_MUTANT)] : [],
        appType: "custom",
        logLevel: "silent",
        server: { middlewareMode: true, watch: null }
    });
    after(() => server.close());

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

    return { server, registry, graph, encodeNamedFields, JackalGameStateSerializer, list, items, layers, make };
}

export async function createSavedGraph(fixture) {
    const { server, make, JackalGameStateSerializer } = fixture;
    const { Main } = await server.ssrLoadModule("/src/jackal/Main.ts");
    const { GameMode } = await server.ssrLoadModule("/src/jackal/GameMode.ts");
    const { Stage } = await server.ssrLoadModule("/src/jackal/Stage.ts");
    const { BossSuperTank } = await server.ssrLoadModule("/src/jackal/BossSuperTank.ts");
    const { Rock } = await server.ssrLoadModule("/src/jackal/Rock.ts");
    const { Explosion } = await server.ssrLoadModule("/src/jackal/Explosion.ts");
    const { TileDebris } = await server.ssrLoadModule("/src/jackal/TileDebris.ts");
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
    // Controlled graph/resource setup; natural detached lifetimes are exercised in the browser matrix.
    const rock = new Rock(500, 400);
    rock.removeFlag = true;
    world.elements[rock.layer].removeValue(rock);
    world.enemies.removeValue(rock);
    world.solids.removeValue(rock);
    world.mines.removeValue(rock);
    Explosion.attachedToEnemy(500, 400, true, 10, 0.5, rock);
    new TileDebris(2, 2, 0, 0);
    const serializer = new JackalGameStateSerializer(),
        snapshot = serializer.createSnapshot(source, "test");
    return { main, source, world, serializer, snapshot };
}
