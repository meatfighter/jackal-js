import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { createServer } from "./vite-test-server.mjs";

test("real serializer reconstructs GameMode fade ownership and dispatches completion once", async () => {
    const server = await createServer({ root: resolve("pwa"), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
    try {
        const { Main } = await server.ssrLoadModule("/src/jackal/Main.ts");
        const { GameMode } = await server.ssrLoadModule("/src/jackal/GameMode.ts");
        const { Stage } = await server.ssrLoadModule("/src/jackal/Stage.ts");
        const { Modes } = await server.ssrLoadModule("/src/jackal/Modes.ts");
        const { SOUND_FIELD_NAMES } = await server.ssrLoadModule("/src/jackal/AudioRegistry.ts");
        const { JackalGameStateSerializer } = await server.ssrLoadModule("/src/jackal/persistence/JackalGameStateSerializer.ts");
        function main() {
            const m = new Main();
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
                s.tiles = [];
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
        const serializer = new JackalGameStateSerializer();
        for (const stage of [1, 5])
            for (const completion of [false, true]) {
                const source = main();
                source.stageIndex = stage;
                Main.mainInstance = source;
                const world = new GameMode();
                Main.gameMode = world;
                world.setStage(stage, source.stages[stage], false);
                world.init(source, {});
                source.mode = world;
                if (completion) {
                    world.stageCompleted();
                    world.stageCompletedDelay = 0;
                }
                source.startFade(completion, completion ? world : null);
                const snapshot = JSON.parse(JSON.stringify(serializer.createSnapshot(source, "fade-test")));
                assert.equal(serializer.isSupportedSnapshot(snapshot), true);
                const fresh = main();
                serializer.restoreSnapshot(fresh, {}, snapshot);
                const restored = fresh.mode;
                assert.ok(restored instanceof GameMode);
                assert.notEqual(restored, world);
                assert.equal(fresh.fading, true);
                assert.equal(fresh.fadeOut, completion);
                assert.equal(fresh.fadeListener, completion ? restored : null);
                const destinations = [];
                fresh.requestMode = (mode) => destinations.push(mode);
                while (fresh.fading) fresh.advanceFade();
                if (completion) {
                    assert.equal(destinations.length, 1);
                    assert.ok(stage === 5 ? destinations[0] === Modes.SUNSET : [Modes.HERE, Modes.YEAH, Modes.WE_MADE_IT].includes(destinations[0]));
                } else {
                    assert.deepEqual(destinations, []);
                    assert.equal(fresh.mode, restored);
                }
            }
    } finally {
        await server.close();
    }
});
