import "./validator-common.test.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Main } from "../../pwa/src/jackal/Main.ts";
import { Stage } from "../../pwa/src/jackal/Stage.ts";
import { GameMode } from "../../pwa/src/jackal/GameMode.ts";
import { GrayBoat } from "../../pwa/src/jackal/GrayBoat.ts";
import { GreenBoat } from "../../pwa/src/jackal/GreenBoat.ts";
import { KonamiCode } from "../../pwa/src/jackal/KonamiCode.ts";
import { ContinueMode } from "../../pwa/src/jackal/ContinueMode.ts";
import { SOUND_FIELD_NAMES } from "../../pwa/src/jackal/AudioRegistry.ts";
import { JackalGameStateSerializer } from "../../pwa/src/jackal/persistence/JackalGameStateSerializer.ts";
import { JackalGameStateStore } from "../../pwa/src/jackal/persistence/JackalGameStateStore.ts";
import { getEntityDurableFieldDescriptor } from "../../pwa/src/jackal/persistence/GameStateFieldPolicies.ts";
import { memoryStorage } from "../persistence-test-loader.mjs";

// Controlled geometry/audio dependencies, but actual Main/GameMode/Player/entity
// construction, updates, serializer, validators, writer and restore implementation.
function fixture(stageIndex = 2) {
    const main = new Main();
    const input = new Proxy(
        { clearKeyPressedRecord() {}, snap() {} },
        {
            get(target, key) {
                return target[key] ?? (() => false);
            }
        }
    );
    main.input = input;
    main.gc = { getInput: () => input };
    main.loadIndex = 42;
    main.stageIndex = stageIndex;
    main.conveyors = Array.from({ length: 16 }, () => ({}));
    main.whiteBullet = {};
    main.yellowBullet = {};
    main.cannonball = {};
    for (const id of SOUND_FIELD_NAMES)
        main[id] = {
            capturePlaybackState: () => ({ voices: [], activeVoiceIndex: null }),
            restorePlaybackState() {},
            play() {},
            stop() {},
            playing: () => false
        };
    for (let i = 0; i < 6; i++) {
        const stage = new Stage();
        Object.assign(stage, {
            mapWidth: 40,
            mapHeight: 40,
            tileMap: Array.from({ length: 40 }, () => Array(40).fill(0)),
            typesMap: Array.from({ length: 40 }, () => Array(40).fill(GameMode.TYPE_EMPTY)),
            tiles: i === 5 ? main.conveyors : [{}],
            groups: [],
            groupsMap: Array.from({ length: 40 }, () => Array(40).fill(-1)),
            triggerMap: [Array.from({ length: 40 }, () => []), Array.from({ length: 40 }, () => [])],
            directions: [],
            directionsDecoded: new Uint8Array(),
            directionsWidth: 0,
            directionsHeight: 0
        });
        main.stages[i] = stage;
    }
    Main.mainInstance = main;
    const world = new GameMode();
    Main.gameMode = world;
    world.setStage(stageIndex, main.stages[stageIndex], false);
    world.init(main, main.gc);
    main.mode = world;
    world.player.x = 800;
    world.player.y = 800;
    main.random.setSeed(12345);
    return { main, world, serializer: new JackalGameStateSerializer(), store: new JackalGameStateStore("test") };
}
function withStorage(fn) {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage"),
        warn = console.warn;
    const storage = memoryStorage();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    console.warn = () => {};
    try {
        return fn(storage);
    } finally {
        console.warn = warn;
        if (original) Object.defineProperty(globalThis, "localStorage", original);
        else delete globalThis.localStorage;
    }
}
for (const Boat of [GrayBoat, GreenBoat])
    test(`${Boat.name}: actual 0/1 animation producer saves and fresh-restores`, () =>
        withStorage((storage) => {
            const { main, world, serializer, store } = fixture(Boat === GrayBoat ? 2 : 0);
            const boat = new Boat(128, 128),
                observed = new Set();
            assert.deepEqual(getEntityDurableFieldDescriptor(Boat.name).spriteIndex.allowedValues, [0, 1]);
            for (let tick = 0; tick < 30; tick++) {
                observed.add(boat.spriteIndex);
                const snapshot = serializer.createSnapshot(main, "test");
                assert.equal(serializer.isSupportedSnapshot(snapshot), true, `capture at ${tick}`);
                assert.equal(store.save(main, () => true).saved, true, `write at ${tick}`);
                boat.update();
            }
            assert.deepEqual([...observed].sort(), [0, 1]);
            assert.equal(store.hasValidSave(), true);
            const saved = JSON.parse([...storage.values.entries()].find(([key]) => key.startsWith("jackal.game-state:"))[1]);
            const fresh = fixture();
            assert.equal(store.restore(fresh.main, fresh.main.gc), true);
            const restored = serializer.createSnapshot(fresh.main, "test");
            delete saved.savedAt;
            delete restored.savedAt;
            assert.deepEqual(restored, saved);
            assert.equal(world.player.x, 800);
        }));

test("Konami completion followed by actual final-life Player transition keeps false/10 saveable", () =>
    withStorage(() => {
        const { main, world, store, serializer } = fixture();
        let held = null;
        main.input = Object.fromEntries(["Up", "Down", "Left", "Right", "Shoot", "Fire"].map((key) => [`is${key}`, () => held === key]));
        main.input.clearKeyPressedRecord = () => {};
        main.input.isSelect = () => false;
        main.input.isStart = () => false;
        main.input.isEnter = () => false;
        main.konamiCode = new KonamiCode(main);
        for (const key of ["Up", "Up", "Down", "Down", "Left", "Right", "Left", "Right", "Shoot", "Fire"]) {
            held = null;
            main.konamiCode.update();
            held = key;
            main.konamiCode.update();
        }
        held = null;
        assert.equal(main.konamiCode.enabled, true);
        assert.equal(main.konamiCode.sequenceIndex, 10);
        main.extraLives = 0;
        world.player.respawning = 1;
        world.player.update();
        assert.ok(main.mode instanceof ContinueMode);
        assert.equal(main.konamiCode.enabled, false);
        assert.equal(main.konamiCode.sequenceIndex, 10);
        assert.equal(store.save(main, () => true).saved, true);
        const snapshot = serializer.createSnapshot(main, "test");
        const fresh = fixture();
        assert.equal(store.restore(fresh.main, fresh.main.gc), true);
        assert.equal(fresh.main.konamiCode.sequenceIndex, 10);
        assert.equal(serializer.isSupportedSnapshot(snapshot), true);
    }));

test("score crosses former int32 cap through real addPoints and resources gate refuses inconsistent writes", () =>
    withStorage((storage) => {
        const { main, serializer, store } = fixture();
        main.score = 2147483600;
        main.addPoints(100);
        assert.equal(main.score, 2147483700);
        assert.equal(store.save(main, () => true).saved, true);
        const snapshot = serializer.createSnapshot(main, "test");
        assert.equal(serializer.isSupportedSnapshot(snapshot), true);
        const key = [...storage.values.keys()].find((key) => key.startsWith("jackal.game-state:")),
            previous = storage.values.get(key);
        main.stages[2].mapWidth++;
        assert.equal(store.save(main, () => true).saved, false);
        assert.equal(storage.values.get(key), previous);
        const debug = JSON.parse(storage.values.get([...storage.values.keys()].find((key) => key.startsWith("jackal.debug-invalid-save:"))));
        assert.equal(debug.failedStage, "loaded-resources");
    }));
