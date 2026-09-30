import { registeredSounds } from "./jackal/AudioRegistry.js";
import { BossHeadquartersManager } from "./jackal/BossHeadquartersManager.js";
import { BrownTank } from "./jackal/BrownTank.js";
import { EnemyHelicopter } from "./jackal/EnemyHelicopter.js";
import { ElephantGun } from "./jackal/ElephantGun.js";
import { BossSuperTankGun } from "./jackal/BossSuperTankGun.js";
import { EnemySoldier } from "./jackal/EnemySoldier.js";
import { EnemySoldierType } from "./jackal/EnemySoldierType.js";
import { PlayerBullet } from "./jackal/PlayerBullet.js";
import { FlashingSkull } from "./jackal/FlashingSkull.js";
import { MissionAccomplished } from "./jackal/MissionAccomplished.js";
import { TileDebris } from "./jackal/TileDebris.js";
import { captureEntityRuntimeFields } from "./jackal/persistence/EntityRuntimePersistence.js";
import { TILE_DEBRIS_SPRITE_TILE_FIELD } from "./jackal/persistence/EntityRuntimeFields.js";
import { BossHeadquarters } from "./jackal/BossHeadquarters.js";
import { BossSuperTank } from "./jackal/BossSuperTank.js";
import { AttackSource } from "./jackal/AttackSource.js";
import { Triggers } from "./jackal/Triggers.js";
import { ResourceLoader, Sys, Music, SoundStore } from "slick2d-ts";
import { JackalRuntimeLoader, type PreparedRuntime } from "./app/JackalRuntimeLoader.js";
import { getDeploymentStorageKey } from "./app/DeploymentStorageKeys.js";
import { JackalGameStateSerializer } from "./jackal/persistence/JackalGameStateSerializer.js";
import { GAME_STATE_STORAGE_KEY } from "./jackal/persistence/GameStateSchema.js";
import { isSupportedGameStateSnapshot } from "./jackal/persistence/GameStateSnapshotValidator.js";
import type { JackalGameStateSnapshot } from "./jackal/persistence/GameStateSnapshot.js";
import { CutsceneSequence } from "./jackal/CutsceneSequence.js";
import { GameMode } from "./jackal/GameMode.js";
import { Modes } from "./jackal/Modes.js";

function check(value: unknown, message: string): asserts value {
    if (!value) throw new Error(message);
}
type Main = InstanceType<PreparedRuntime["Main"]>;
export async function createGameModePersistenceVerification(runtime?: PreparedRuntime) {
    check(import.meta.env.DEV, "Game-mode verification is development-only");
    const prepared = runtime ?? (await new JackalRuntimeLoader(() => {}).ensurePrepared(false));
    const element = document.querySelector<HTMLElement>("#game-host");
    check(element, "Ending fixture host");
    const host: HTMLElement = element;
    const serializer = new JackalGameStateSerializer();
    const store = new prepared.JackalGameStateStore("game-mode-verification");
    const key = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);

    const previousBytes = localStorage.getItem(key);
    const previousClock = Sys.getTime;
    const previousDateNow = Date.now;
    const wallOrigin = previousDateNow() - previousClock();
    let now = previousClock();
    // Hold physical Web Audio sources still; retain full logical transport and voice state.
    const audioStart = AudioBufferSourceNode.prototype.start;
    const audioStop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = () => {};
    AudioBufferSourceNode.prototype.stop = () => {};
    let audioTime = 0;
    const audioClock = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "currentTime");
    Object.defineProperty(BaseAudioContext.prototype, "currentTime", { configurable: true, get: () => audioTime });
    Sys.getTime = () => now;
    Date.now = () => wallOrigin + now;
    type Mounted = {
        main: Main;
        container: InstanceType<PreparedRuntime["slick"]["AppGameContainer"]>;
        buffered: InstanceType<PreparedRuntime["slick"]["BufferedScalableGame"]>;
    };
    let mounted: Mounted | null = null;
    let earlierValidBytes: string | null = null;
    const textCalls: Array<{ text: string; length: number; x: number; y: number }> = [];
    function current(): Mounted {
        check(mounted, "Mounted ending runtime");
        return mounted;
    }
    function retire(): void {
        if (!mounted) return;
        mounted.main.stopAllSounds();
        mounted.main.disposeBrowserRuntime();
        mounted.container.destroy();
        mounted = null;
        prepared.slick.Display.setParent(null);
    }
    async function mount(restore: boolean): Promise<void> {
        retire();
        host.replaceChildren();
        prepared.slick.Display.setParent(host);
        const main = new prepared.Main();
        main.getSoundCooldownTime = () => now;
        main.reserveBrowserRuntime();
        const buffered = new prepared.slick.BufferedScalableGame(main, 1024, 960, {
            maintainAspect: true,
            scalingMode: prepared.slick.BufferedScalingMode.Nearest
        });
        const container = new prepared.slick.AppGameContainer(buffered, 1024, 960, false);
        container.setPreserveAudioCacheOnDestroy(true);
        container.setLoopSuspended(true);
        if (restore)
            main.loadingCompleteHandler = (gc) => {
                check(readSaved(main, gc), "Ending actual reader restore");
                return true;
            };
        mounted = { main, container, buffered };
        await container.start();
        await ResourceLoader.waitForAll();
        check(main.isStateSaveReady(), "Ending resources ready");
        const audio = SoundStore.get();
        if (audio.isUsingExplicitPlaybackGenerations()) check(await audio.beginPlaybackGenerationFromUserGesture(), "Mounted explicit audio generation");
        audio.init();
        await audio.getAudioContext()?.resume();
        audio.init();
        check(audio.soundWorks(), "Fixture audio context is running before either trajectory");
        const draw = main.drawString.bind(main),
            partial = main.drawStringWithLength.bind(main);
        main.drawString = (text, x, y, color) => {
            check(typeof text === "string", "Full render text");
            textCalls.push({ text, length: text.length, x, y });
            draw(text, x, y, color);
        };
        main.drawStringWithLength = (text, length, x, y, color) => {
            check(typeof text === "string" && length >= 0 && length <= text.length, "First-render glyph bounds");
            textCalls.push({ text, length, x, y });
            partial(text, length, x, y, color);
        };
    }
    function save(main: Main, authorized: () => boolean) {
        const original = Storage.prototype.setItem;
        let writes = 0;
        Storage.prototype.setItem = function (entryKey, bytes) {
            if (entryKey === key) writes++;
            original.call(this, entryKey, bytes);
        };
        try {
            const result = store.save(main, authorized);
            check(writes === (result.saved ? 1 : 0), "Save publishes exactly one newly captured record");
            return result;
        } finally {
            Storage.prototype.setItem = original;
        }
    }
    function readSaved(main: Main, container: Parameters<typeof store.restore>[1]): boolean {
        const originalSet = Storage.prototype.setItem,
            originalRemove = Storage.prototype.removeItem;
        let writes = 0;
        Storage.prototype.setItem = function (entryKey, bytes) {
            writes++;
            originalSet.call(this, entryKey, bytes);
        };
        Storage.prototype.removeItem = function (entryKey) {
            writes++;
            originalRemove.call(this, entryKey);
        };
        try {
            const result = store.restore(main, container);
            check(writes === 0, "Reader never writes or removes game, mapping, or preference data");
            return result;
        } finally {
            Storage.prototype.setItem = originalSet;
            Storage.prototype.removeItem = originalRemove;
        }
    }
    function capture(): JackalGameStateSnapshot {
        return serializer.createSnapshot(current().main, "game-mode-verification");
    }
    function normalized(s: JackalGameStateSnapshot): string {
        const copy = structuredClone(s);
        copy.savedAt = "";
        return JSON.stringify(copy);
    }
    async function tick(): Promise<void> {
        const { main, container } = current();
        now += 10;
        main.nextFrameTime = now;
        container.getInput().poll(1024, 960);
        if (main.mode instanceof GameMode) main.mode.player.makeInvincible();
        Music.poll(10);
        main.update(container, 10);
        // Both trajectories use a controlled clock; settle queued work without advancing wall time.
        await Promise.resolve();
    }
    function assertPresentation(): void {
        if (current().main.mode instanceof GameMode) {
            const w = world(),
                main = current().main;
            if (w.stageIndex === 5) check(w.tiles[0] === main.conveyors[w.conveyorLastIndex], "Conveyor identity before first render");
            for (const e of active())
                if (e instanceof TileDebris) {
                    const id = captureEntityRuntimeFields(e, main, w)?.[TILE_DEBRIS_SPRITE_TILE_FIELD];
                    check(typeof id === "number", "Debris descriptor");
                    check(e.sprite === (w.stageIndex === 5 && id < 16 ? main.conveyors[id] : w.tiles[id]), "Exact immutable debris image");
                }
        }
    }
    function render(): void {
        assertPresentation();
        textCalls.length = 0;
        const m = current();
        m.buffered.render(m.container, m.container.getGraphics());
    }
    function diff(a: unknown, b: unknown, path = ""): unknown[] {
        if (JSON.stringify(a) === JSON.stringify(b)) return [];
        if (a && b && typeof a === "object" && typeof b === "object")
            return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diff(Reflect.get(a, k), Reflect.get(b, k), path + "." + k));
        return [[path, a, b]];
    }
    async function roundtrip(label: string): Promise<unknown> {
        console.info("Checkpoint: " + label);
        const saved = capture();
        check(isSupportedGameStateSnapshot(saved), label + " positive");
        check(earlierValidBytes !== null, label + " earlier valid seed");
        check(normalized(JSON.parse(earlierValidBytes) as JackalGameStateSnapshot) !== normalized(saved), label + " distinct earlier phase");
        localStorage.setItem(key, earlierValidBytes);

        check(save(current().main, () => true).saved, label + " store save");
        const bytes = localStorage.getItem(key);
        check(bytes, label + " bytes");
        check(bytes !== earlierValidBytes, label + " replaces deliberately older valid bytes");
        const expected = JSON.parse(bytes) as JackalGameStateSnapshot;
        check(normalized(expected) === normalized(saved), label + " stored bytes represent the current phase");
        const savedNow = now;
        render();
        const controlText = JSON.stringify(textCalls);
        const screenshot: unknown = Reflect.get(window, "recordGameModeCheckpoint");
        if (typeof screenshot === "function" && /paused-conveyor|HQ-removed|HQ-mid/.test(label))
            await screenshot(label + "-" + (current().main.hardMode ? "hard" : "normal"));
        const control: string[] = [];
        for (let i = 0; i < 5; i++) {
            await tick();
            control.push(normalized(capture()));
        }
        now = savedNow;
        await mount(true);
        check(localStorage.getItem(key) === bytes, label + " unchanged restore bytes");
        check(
            normalized(capture()) === normalized(expected),
            label +
                " exact fresh graph: " +
                JSON.stringify(
                    Object.keys(expected)
                        .filter((k) => JSON.stringify(Reflect.get(capture(), k)) !== JSON.stringify(Reflect.get(expected, k)) && k !== "savedAt")
                        .map((k) => [k, Reflect.get(expected, k), Reflect.get(capture(), k)])
                )
        );

        render();
        check(JSON.stringify(textCalls) === controlText, label + " same first-render text schedule");
        const restoredText = [...textCalls];
        for (let i = 0; i < 5; i++) {
            await tick();
            check(
                normalized(capture()) === control[i],
                label + " exact deterministic next tick " + i + " " + JSON.stringify(diff(JSON.parse(control[i]), JSON.parse(normalized(capture()))))
            );
        }
        now = savedNow;
        // A retained loaded stage may still show another conveyor phase. It is not durable authority.
        if (current().main.mode instanceof GameMode && world().stageIndex === 5)
            world().tiles[0] = current().main.conveyors[(world().conveyorLastIndex + 1) % 16];
        check(readSaved(current().main, current().container), label + " restore checkpoint after continuation control");
        assertPresentation();
        check(localStorage.getItem(key) === bytes, label + " control leaves save untouched");
        return {
            label,
            stageIndex: expected.mainFields.stageIndex,
            hardMode: expected.mainFields.hardMode,
            mode: expected.kind === "mode" ? expected.modeId : "GAME",
            fields: expected.kind === "mode" ? expected.modeFields : null,
            score: current().main.score,
            bag: CutsceneSequence.captureState(),
            rng: current().main.random.getState(),
            text: restoredText,
            entityTypes: expected.kind === "game" ? expected.gameMode.entities.map((e) => e.type) : [],
            indexes: expected.kind === "game" ? expected.gameMode.indexes : null,
            continuationTicks: 5
        };
    }
    function world(): GameMode {
        const w = current().main.mode;
        check(w instanceof GameMode, "Expected live GameMode");
        return w;
    }
    function active() {
        return world().elements.flatMap((list) => Array.from({ length: list.size() }, (_, i) => list.get(i)));
    }

    async function reach(label: string, predicate: () => boolean, bound = 4000): Promise<void> {
        for (let i = 0; !predicate(); i++) {
            check(i < bound, label + " finite milestone bound");
            await tick();
        }
    }
    function tank(): BossSuperTank {
        const value = active().find((e) => e instanceof BossSuperTank);
        check(value instanceof BossSuperTank, "Live super tank");
        return value;
    }
    async function prepareBoss(stage = 5, hard = false, beforeTrigger?: () => Promise<void>): Promise<void> {
        await mount(false);
        const { main, container } = current();
        main.stageIndex = stage;
        main.hardMode = hard;
        main.requestMode(Modes.GAME, container);
        check(save(main, () => true).saved, "Initial gameplay seed is valid");
        earlierValidBytes = localStorage.getItem(key);
        check(earlierValidBytes, "Initial gameplay seed bytes");
        const triggers = [
            Triggers.BOSS_BLUE_TANKS,
            Triggers.BOSS_STATUES,
            Triggers.BOSS_SHIP,
            Triggers.BOSS_HELICOPTER,
            Triggers.BOSS_GARAGE,
            Triggers.BOSS_HEADQUARTERS
        ];
        const w = world();
        const row = w.triggerMap.findIndex((items) => items.some((t) => t[0] === triggers[stage]));
        check(row >= 0, "Loaded boss trigger row " + stage);
        w.triggerY = row + 1;
        w.cameraY = (row + 1) * 32;
        w.player.x = 1024;
        w.player.y = w.cameraY + GameMode.CAMERA_MARGIN_NORTH;
        w.player.respawning = 0;
        if (beforeTrigger) await beforeTrigger();
        await reach("Trigger-created manager", () => world().cameraPanListener !== null);
    }
    async function prepareHeadquarters(hard = false): Promise<unknown> {
        await prepareBoss(5, hard);
        await reach("HQ entry pan", () => !world().bossCameraPan);
        check(save(current().main, () => true).saved, "Earlier HQ save");
        const before = localStorage.getItem(key);
        const hq = active().find((e) => e instanceof BossHeadquarters);
        check(hq instanceof BossHeadquarters, "Real trigger-created HQ");
        for (let i = 0; i < BossHeadquarters.HITS; i++) check(hq.attack(hq.x, hq.y, hq.x + 256, hq.y + 256, AttackSource.PLAYER_WEAPON), "Actual HQ attack");
        await reach("HQ countdown creates tank", () => active().some((e) => e instanceof BossSuperTank));
        check(save(current().main, () => true).saved, "Tank save");
        check(localStorage.getItem(key) !== before, "Tank replaces HQ bytes");
        return roundtrip("first-super-tank");
    }
    function validateMutations(): number {
        const positive = capture();
        check(positive.kind === "game", "Mutation game fixture");
        check(isSupportedGameStateSnapshot(positive), "Full serialized positive");
        const before = localStorage.getItem(key);
        let count = 0;
        const reject = (bad: unknown, label: string) => {
            const bytes = JSON.stringify(bad);
            localStorage.setItem(key, bytes);
            check(!isSupportedGameStateSnapshot(bad), label + " structural rejection");
            check(!store.hasValidSave(), label + " storage rejection");
            check(!readSaved(current().main, current().container), label + " restore rejection");
            check(localStorage.getItem(key) === bytes, label + " read preserves rejected bytes");
            count++;
        };
        try {
            for (const version of [...Array.from({ length: 23 }, (_, i) => i), 24, "23", 23.5]) reject({ ...positive, version }, "schema-" + version);
            const mutations: Array<(s: Extract<JackalGameStateSnapshot, { kind: "game" }>) => void> = [
                (s) => Reflect.deleteProperty(s.gameMode, "indexes"),
                (s) => Reflect.deleteProperty(s.gameMode.indexes, "mines"),
                (s) => Reflect.set(s.gameMode.indexes, "extra", []),
                (s) => {
                    s.gameMode.indexes.enemies = [];
                },
                (s) => {
                    s.gameMode.indexes.enemies.push(s.gameMode.indexes.enemies[0]);
                },
                (s) => {
                    s.gameMode.indexes.mines = [4096];
                },
                (s) => {
                    s.gameMode.indexes.solids = [0.5];
                },
                (s) => {
                    s.gameMode.indexes.enemies = Array(4097).fill(0);
                },
                (s) => {
                    s.gameMode.fields.bossCameraPan = true;
                    s.gameMode.fields.endingCameraPan = true;
                },
                (s) => {
                    s.gameMode.fields.cameraPanListener = null;
                    s.gameMode.fields.bossCameraPan = true;
                },
                (s) => {
                    s.gameMode.fields.endingCameraPan = true;
                    s.gameMode.fields.playing = true;
                }
            ];
            for (const [i, mutate] of mutations.entries()) {
                const bad = structuredClone(positive);
                mutate(bad);
                reject(bad, "graph-mutation-" + i);
            }
            check(normalized(capture()) === normalized(positive), "Invalid reads do not mutate live runtime");
        } finally {
            if (before === null) localStorage.removeItem(key);
            else localStorage.setItem(key, before);
        }
        return count;
    }
    async function orderedCollision(): Promise<unknown> {
        await mount(false);
        const { main, container } = current();
        main.stageIndex = 0;
        main.requestMode(Modes.GAME, container);
        const w = world(),
            x = 1024,
            y = w.cameraY + 400;
        const first = new EnemySoldier(x, y, EnemySoldierType.STATIONARY),
            second = new EnemySoldier(x, y, EnemySoldierType.STATIONARY);
        first.changeLayer(6);
        await tick();
        check(
            Array.from({ length: w.enemies.size() }, (_, i) => w.enemies.get(i)).indexOf(first) <
                Array.from({ length: w.enemies.size() }, (_, i) => w.enemies.get(i)).indexOf(second),
            "Producer index insertion order"
        );
        const bullet = new PlayerBullet(x, y + PlayerBullet.VELOCITY);
        check(save(main, () => true).saved, "Ordered collision checkpoint");
        const bytes = localStorage.getItem(key);
        check(bytes, "Collision bytes");
        const score = main.score;
        bullet.update();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        check(second.removeFlag && !first.removeFlag, "Actual reverse first-hit victim");
        check(main.score > score, "Actual enemy score award");
        const expected = normalized(capture());
        await mount(true);
        const restored = active().find((e) => e instanceof PlayerBullet);
        check(restored instanceof PlayerBullet, "Restored bullet");
        restored.update();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        check(
            normalized(capture()) === expected,
            "Real collision score, RNG, effects, and victim continue exactly " + JSON.stringify(diff(JSON.parse(expected), JSON.parse(normalized(capture()))))
        );
        check(readSaved(current().main, current().container), "Restore destroyAll control");
        world().destroyAll();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const destroyed = normalized(capture());
        check(readSaved(current().main, current().container), "Restore destroyAll comparison");
        world().destroyAll();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        check(normalized(capture()) === destroyed, "Effectful destroyAll order");
        return { label: "actual-enemy-collision-and-destroyAll", scoreAward: main.score - score };
    }
    async function togglePause(): Promise<void> {
        const input = world().input,
            original = input.isPause;
        input.isPause = () => true;
        try {
            await tick();
        } finally {
            input.isPause = original;
        }
    }
    function startEdge(): void {
        const canvas = host.querySelector("canvas");
        check(canvas, "Real input canvas");
        canvas.dispatchEvent(new KeyboardEvent("keyup", { code: "Enter", key: "Enter", bubbles: true }));
        canvas.dispatchEvent(new KeyboardEvent("keydown", { code: "Enter", key: "Enter", bubbles: true }));
    }
    async function preparePauseAudio(): Promise<void> {
        await prepareBoss(0);
        await reach("pause-audio-song", () => current().main.isSongPlaying() && world().playing);
        const m = current().main;
        m.stopAllSoundEffects();
        m.explodeSound.play();
        m.explodeSound.play();
        m.helicopterSound.loop();
        m.pauseSound.play();
        check(m.explodeSound.capturePlaybackState().voices.length === 2, "Real overlapping explosion voices");
    }
    function pausedContract(label: string, negatives = false): void {
        const good = capture();
        check(good.kind === "game" && good.gameMode.fields.paused === true, "Actual paused producer " + label);
        check(isSupportedGameStateSnapshot(good), "Paused contract positive " + label);
        const before = normalized(good),
            get = Storage.prototype.getItem;
        Storage.prototype.getItem = function (k) {
            if (k === key) throw Error("No-read authorized paused overwrite");
            return get.call(this, k);
        };
        try {
            check(save(current().main, () => true).saved, "Paused no-read save " + label);
        } finally {
            Storage.prototype.getItem = get;
        }
        const bytes = localStorage.getItem(key);
        check(bytes, "Paused saved bytes");
        if (!negatives) return;
        const cue = good.audioState.sounds[0];
        check(cue && cue.playback.voices.length === 1, "Actual pause cue fixture");
        const mutations: Array<[string, (s: Extract<JackalGameStateSnapshot, { kind: "game" }>) => void]> = [
            [
                "pending-song",
                (s) => {
                    s.requestedSongId = s.currentSongState!.id === "stageSong0" ? "bossSong" : "stageSong0";
                }
            ],
            [
                "pending-null",
                (s) => {
                    s.requestedSongId = null;
                }
            ],
            [
                "extra-effect",
                (s) => {
                    s.audioState.sounds.push({ ...structuredClone(cue), id: "explodeSound" });
                }
            ],
            [
                "extra-cue",
                (s) => {
                    Reflect.set(s.audioState.sounds[0].playback, "voices", [...cue.playback.voices, structuredClone(cue.playback.voices[0])]);
                }
            ],
            [
                "looped-cue",
                (s) => {
                    Reflect.set(s.audioState.sounds[0].playback.voices[0], "looped", true);
                }
            ],
            [
                "rate",
                (s) => {
                    Reflect.set(s.audioState.sounds[0].playback.voices[0], "playbackRate", 0.5);
                }
            ],
            [
                "position",
                (s) => {
                    Reflect.set(s.audioState.sounds[0].playback.voices[0], "spatialPosition", { x: 0, y: 0, z: 0 });
                }
            ],
            [
                "not-playing",
                (s) => {
                    s.gameMode.fields.playing = false;
                }
            ],
            [
                "completed",
                (s) => {
                    s.gameMode.fields.stageCompletedFlag = true;
                }
            ]
        ];
        const policy = JSON.stringify([SoundStore.get().musicOn(), SoundStore.get().soundsOn()]);
        for (const [name, mutate] of mutations) {
            const bad = structuredClone(good);
            mutate(bad);
            const badBytes = JSON.stringify(bad);
            localStorage.setItem(key, badBytes);
            check(!isSupportedGameStateSnapshot(bad), "Paused full reader rejects " + name);
            check(!store.hasValidSave() && !readSaved(current().main, current().container), "Paused store rejects " + name);
            check(localStorage.getItem(key) === badBytes && normalized(capture()) === before, "Paused failed read preserves bytes/live state " + name);
            check(JSON.stringify([SoundStore.get().musicOn(), SoundStore.get().soundsOn()]) === policy, "Paused failed restore policy " + name);
        }
        // Same resource and app identity, old schema: a nonwriting miss at the stable slot.
        localStorage.setItem(key, JSON.stringify({ ...good, version: 22 }));
        const oldBytes = localStorage.getItem(key);
        check(!readSaved(current().main, current().container), "Old paused schema rejected");
        check(localStorage.getItem(key) === oldBytes, "Old paused bytes preserved");
        const main = current().main,
            requested = main.requestedSong;
        for (const song of [main.currentSong === main.bossSong ? main.stageSong0 : main.bossSong, null]) {
            localStorage.setItem(key, bytes);
            main.requestedSong = song;
            try {
                check(!save(main, () => true).saved, "Paused outgoing rejects pending Song");
            } finally {
                main.requestedSong = requested;
            }
            check(localStorage.getItem(key) === bytes, "Paused outgoing preserves bytes");
        }
        for (const kind of ["extra-effect", "extra-cue", "looped-cue"]) {
            localStorage.setItem(key, bytes);
            if (kind === "extra-effect") main.explodeSound.play();
            else if (kind === "extra-cue") main.pauseSound.play();
            else main.pauseSound.restorePlaybackState({ activeVoiceIndex: 0, voices: [{ ...cue.playback.voices[0], looped: true }] });
            try {
                check(!save(main, () => true).saved, "Paused outgoing rejects " + kind);
            } finally {
                main.stopAllSoundEffects();
                main.pauseSound.restorePlaybackState(cue.playback);
            }
            check(localStorage.getItem(key) === bytes, "Paused outgoing preserves cue bytes");
        }
        check(normalized(capture()) === before, "Paused controls restore their fixture");
        check(save(main, () => true).saved, "Later valid paused overwrite");
    }
    async function pausedSongWitness(): Promise<void> {
        await preparePauseAudio();
        startEdge();
        await tick();
        const main = current().main,
            w = world(),
            old = main.currentSong;
        const pending = old === main.bossSong ? main.stageSong0 : main.bossSong;
        main.requestedSong = pending;
        const bad = capture();
        check(!isSupportedGameStateSnapshot(bad), "Paused pending witness rejected before restore");
        await tick();
        check(w.paused && main.currentSong === pending && pending.playing, "Actual Main reconciles pending Song before paused world returns");
        // This is a control-flow witness, not an accepted restore. Recreate a real unpaused producer.
        await preparePauseAudio();
        const unpaused = current().main;
        unpaused.requestedSong = unpaused.currentSong === unpaused.bossSong ? unpaused.stageSong0 : unpaused.bossSong;
        check(isSupportedGameStateSnapshot(capture()), "Unpaused pending Song remains valid");
    }
    async function pauseAudioMatrix(): Promise<unknown> {
        console.info("Checkpoint: real-pause-audio");
        await pausedSongWitness();
        await preparePauseAudio();
        const m = current().main,
            w = world(),
            audio = SoundStore.get();
        m.explodeSound.stop();
        check(
            !m.explodeSound.playing() && m.explodeSound.capturePlaybackState().voices.length === 1,
            "Positive control: latest stopped while older explosion survives"
        );
        const policy = () => JSON.stringify([audio.soundsOn(), audio.musicOn(), audio.getSoundVolume(), audio.getMusicVolume()]);
        const originalPolicy = policy();
        const song = m.currentSong,
            requested = m.requestedSong;
        check(song, "Real current Song");
        const part = [song.intro, song.intro2, song.loop].find((p) => p?.getTransportState() === "playing");
        check(part, "Real current music part");
        const position = part.getPosition();
        const fields = () => JSON.stringify([w.cameraX, w.cameraY, w.waterAlphaIndex, w.player.x, w.player.y]);
        const before = fields();
        m.lastPlayTime.set(m.pauseSound, now);
        const cooldowns = [...m.lastPlayTime];
        const cueOnly = () => {
            for (const { id, sound } of registeredSounds(m))
                check(sound.capturePlaybackState().voices.length === (sound === m.pauseSound ? 1 : 0), "Pause voice inventory: " + id);
        };
        startEdge();
        await tick();
        check(
            w.paused && fields() === before,
            "Accepted real Start is non-simulating: " +
                JSON.stringify({
                    paused: w.paused,
                    playing: w.playing,
                    before,
                    after: fields(),
                    focus: document.hasFocus(),
                    down: current().container.getInput().isKeyDown(28)
                })
        );
        cueOnly();
        check(
            m.currentSong === song && m.requestedSong === requested && part.getTransportState() === "paused" && part.getPosition() === position,
            "Exact music transport retained"
        );
        pausedContract("cue-start", true);
        check(policy() === originalPolicy, "Pause preserves application audio policy");
        check(cooldowns.length === m.lastPlayTime.size && cooldowns.every(([s, t]) => m.lastPlayTime.get(s) === t), "Pause preserves cooldown history");
        await tick();
        cueOnly();
        check(w.paused, "Held Start does not repeat");
        startEdge();
        await tick();
        cueOnly();
        check(!w.paused && fields() === before && part.getPosition() === position, "Unpause only resumes music");
        startEdge();
        await tick();
        cueOnly();
        check(w.paused, "Rapid re-pause under cooldown gets a cue");
        audio.endPlaybackGeneration();
        check(await audio.beginPlaybackGenerationFromUserGesture(), "Replacement audio generation");
        cueOnly();
        startEdge();
        await tick();
        m.explodeSound.play();
        check(m.explodeSound.capturePlaybackState().voices.length === 1, "Later legitimate effects still work");
        audio.setSoundsOn(false);
        startEdge();
        await tick();
        check(
            w.paused && !audio.soundsOn() && registeredSounds(m).every(({ sound }) => sound.capturePlaybackState().voices.length === 0),
            "Sounds OFF remains OFF"
        );
        pausedContract("sounds-off");
        startEdge();
        await tick();
        audio.setSoundsOn(true);
        audio.setSoundVolume(0);
        startEdge();
        await tick();
        cueOnly();
        check(audio.soundsOn() && audio.getSoundVolume() === 0, "Volume zero is not OFF");
        pausedContract("zero-volume");
        audio.setSoundVolume(JSON.parse(originalPolicy)[2] as number);
        // Delay only the resource boundary; the voice, purge and completion fence are real engine objects.
        const ref = "soundeffects/explode.ogg";
        const decoded = audio.getDecodedAudioBuffer(ref);
        check(decoded, "Loaded explosion buffer");
        const getBuffer = audio.getDecodedAudioBuffer.bind(audio),
            loadBuffer = audio.loadAudioBuffer.bind(audio);
        let completeDecode: (buffer: AudioBuffer) => void = () => {
            throw new Error("Decode was not requested");
        };
        const delayed = new Promise<AudioBuffer>((resolve) => {
            completeDecode = resolve;
        });
        audio.getDecodedAudioBuffer = (name) => (name === ref ? null : getBuffer(name));
        audio.loadAudioBuffer = (name, options) => (name === ref ? delayed : loadBuffer(name, options));
        try {
            m.explodeSound.play();
            check(m.explodeSound.capturePlaybackState().voices.length === 1, "Pending decode owns a real logical voice");
            m.stopAllSoundEffects();
            completeDecode(decoded);
            await delayed;
            await Promise.resolve();
            check(m.explodeSound.capturePlaybackState().voices.length === 0, "Delayed decode cannot resurrect retired effect");
        } finally {
            audio.getDecodedAudioBuffer = getBuffer;
            audio.loadAudioBuffer = loadBuffer;
        }
        m.explodeSound.play();
        check(m.explodeSound.capturePlaybackState().voices.length === 1, "Legitimate post-decode play works");
        m.stopAllSoundEffects();
        // Let an actual native Web Audio source finish, instead of synthesizing an empty saved voice list.
        AudioBufferSourceNode.prototype.start = audioStart;
        try {
            m.playSoundAlways(m.pauseSound);
            check(m.pauseSound.capturePlaybackState().voices.length === 1, "Natural completion starts with a cue");
            const deadline = performance.now() + 10000;
            while (m.pauseSound.capturePlaybackState().voices.length) {
                check(performance.now() < deadline, "Native pause cue completes within its bounded duration");
                await new Promise((resolve) => setTimeout(resolve, 25));
            }
            check(
                w.paused && registeredSounds(m).every(({ sound }) => sound.capturePlaybackState().voices.length === 0),
                "Completed paused cue leaves no SFX to restore"
            );
        } finally {
            AudioBufferSourceNode.prototype.start = () => {};
        }

        pausedContract("naturally-completed-cue");
        const realCooldown = () => prepared.Main.prototype.getSoundCooldownTime.call(m);
        const clockBefore = realCooldown();
        await new Promise((resolve) => setTimeout(resolve, 30));
        check(realCooldown() > clockBefore, "Gameplay Pause ages the actual cooldown clock");
        m.setBrowserSuspended(true);
        const suspendedClock = realCooldown();
        await new Promise((resolve) => setTimeout(resolve, 30));
        check(realCooldown() === suspendedClock, "PWA suspension freezes the actual cooldown clock");
        m.setBrowserSuspended(false);
        // Advance the real Song across its intro boundary, then pause/resume that exact loop.
        startEdge();
        await tick();
        check(song.loop, "Boss Song has a real loop");
        song.intro?.stop();
        song.intro2?.stop();
        song.update();
        check(song.loop.getTransportState() === "playing", "Real Song intro-to-loop boundary");
        const loopPosition = song.loop.getPosition();
        w.player.respawning = 5;
        m.extraLives = 1;
        startEdge();
        await tick();
        check(
            w.paused && song.loop.getTransportState() === "paused" && song.loop.getPosition() === loopPosition,
            "Reserve-backed respawn accepts Pause and retains exact loop position"
        );
        pausedContract("reserve-life-loop");
        startEdge();
        await tick();
        check(!w.paused && song.loop.getTransportState() === "playing" && song.loop.getPosition() === loopPosition, "Loop unpause resumes without restart");
        w.player.respawning = 0;
        for (const refusal of ["completed", "last-life", "no-song"] as const) {
            m.stopAllSoundEffects();
            m.explodeSound.play();
            if (refusal === "completed") w.stageCompletedFlag = true;
            if (refusal === "last-life") {
                w.player.respawning = 5;
                m.extraLives = 0;
            }
            if (refusal === "no-song") {
                m.stopAllSongs();
                m.requestedSong = null;
            }
            startEdge();
            await tick();
            check(
                !w.paused && m.explodeSound.capturePlaybackState().voices.length === 1 && m.pauseSound.capturePlaybackState().voices.length === 0,
                "Refused real Start preserves effects without a cue: " + refusal
            );
            w.stageCompletedFlag = false;
            w.player.respawning = 0;
            m.extraLives = 1;
        }
        return { label: "real-pause-audio", overlap: true, latestStopped: true, rapidToggle: true, generation: true };
    }
    async function matrix(includeBossStages = true): Promise<unknown[]> {
        const results: unknown[] = [await pauseAudioMatrix()];
        for (const hard of includeBossStages ? [false, true] : [])
            for (let stage = 0; stage < 6; stage++) {
                const label = `stage-${stage + 1}-${hard ? "hard" : "normal"}`;
                await prepareBoss(stage, hard, async () => {
                    results.push(await roundtrip(label + "-pre-trigger"));
                });
                results.push(await roundtrip(label + "-entry-start"));
                for (let i = 0; i < 20; i++) await tick();
                results.push(await roundtrip(label + "-entry-middle"));
                await reach(label + "-entry-complete", () => !world().bossCameraPan);
                results.push(await roundtrip(label + "-callback"));
                await tick();
                results.push(await roundtrip(label + "-callback-next-tick"));
                for (let i = 0; i < 100; i++) await tick();
                results.push(await roundtrip(label + "-fight"));
                if (stage === 5) {
                    const manager = () => {
                        const m = world().cameraPanListener;
                        check(m instanceof BossHeadquartersManager, "HQ manager");
                        return m;
                    };
                    // Controlled placement through the production factory guarantees overlap with the short helicopter visit.
                    BrownTank.withTracker(1024, 800, manager());
                    check(
                        [BossHeadquarters, ElephantGun, EnemyHelicopter, BrownTank].every((type) => active().some((e) => e instanceof type)),
                        "Mixed live HQ actors"
                    );
                    results.push(await roundtrip(label + "-HQ-mixed-controlled-ground-placement"));
                    await reach(label + "-natural-HQ-ground-spawn", () => manager().tankSpawnDelay === BossHeadquartersManager.TANK_SPAWN_DELAY);
                    results.push(await roundtrip(label + "-HQ-natural-ground-spawn"));
                    const headquarters = () => {
                        const h = active().find((e) => e instanceof BossHeadquarters);
                        check(h instanceof BossHeadquarters, "Live HQ");
                        return h;
                    };
                    for (let hit = 1; hit <= 12; hit++) {
                        const h = headquarters();
                        check(h.attack(h.x, h.y, h.x + 256, h.y + 256, AttackSource.PLAYER_WEAPON), "HQ milestone hit");
                        if ([1, 11, 12].includes(hit)) results.push(await roundtrip(label + "-HQ-hit-" + hit));
                    }
                    await tick();
                    results.push(await roundtrip(label + "-HQ-manager-detached"));
                    for (let i = 0; i < 220; i++) await tick();
                    results.push(await roundtrip(label + "-HQ-mid-explosions"));
                    await reach(label + "-HQ-final-countdown", () => headquarters().explodeTime === 1);
                    results.push(await roundtrip(label + "-HQ-final-countdown"));
                    await tick();
                    results.push(await roundtrip(label + "-HQ-removed-first-tank-gun-debris"));
                    continue;
                }
                for (let i = 0; !world().stageCompletedFlag; i++) {
                    check(i < 6000, label + " actual defeat bound");
                    const w = world();
                    if (stage === 4) w.player.x = Math.floor(i / 500) % 2 === 0 ? 512 : 1536;
                    for (let j = w.enemies.size() - 1; j >= 0; j--) {
                        const e = w.enemies.get(j);
                        if (!e.removeFlag) e.attack(e.x - 512, e.y - 512, e.x + 1024, e.y + 1024, AttackSource.PLAYER_WEAPON);
                    }
                    await tick();
                }
                results.push(await roundtrip(label + "-completion-delay"));
                await reach(label + "-fade", () => current().main.fading);
                results.push(await roundtrip(label + "-fade"));
            }
        results.push(await orderedCollision());
        results.push(...(await finalSequence(false)), ...(await finalSequence(true)));
        return results;
    }
    async function finalSequence(hard: boolean): Promise<unknown[]> {
        console.info("Checkpoint: final-sequence-" + (hard ? "hard" : "normal"));
        const results: unknown[] = [];
        results.push(await prepareHeadquarters(hard));
        results.push({ invalidSnapshots: validateMutations() });
        await reach("Tank song starts before pause", () => current().main.isSongPlaying());
        const frames = new Set<number>();
        for (let i = 0; frames.size < 16; i++) {
            check(i < 1000, "All loaded conveyor phases");
            render();
            const frame = world().conveyorLastIndex;
            if (!frames.has(frame)) {
                frames.add(frame);
                await togglePause();
                check(world().paused, "Actual pause accepted");
                results.push(await roundtrip("paused-conveyor-" + frame));
                await togglePause();
                check(!world().paused, "Actual unpause accepted");
            }
            await tick();
        }
        results.push(await prepareHeadquarters(hard));
        const seen = new Set<number>();
        const fireSeen = new Set<string>();
        const gunSeen = new Set<number>();
        const recoilSeen = new Set<string>();
        for (let i = 0; i < 3000 && (seen.size < 5 || fireSeen.size < 6 || gunSeen.size < 3 || recoilSeen.size < 9); i++) {
            const t = tank();
            if (!seen.has(t.state)) {
                seen.add(t.state);
                results.push(await roundtrip("tank-state-" + t.state));
            }
            const gun = active().find((e) => e instanceof BossSuperTankGun);
            check(gun instanceof BossSuperTankGun, "Tank gun");
            if (!gunSeen.has(gun.state)) {
                gunSeen.add(gun.state);
                results.push(await roundtrip("gun-state-" + gun.state));
            }
            if (gun.state === 0 && [16, 8, 0].includes(gun.recoilIndex)) {
                const boundary = gun.group + "-" + gun.recoilIndex;
                if (!recoilSeen.has(boundary)) {
                    recoilSeen.add(boundary);
                    results.push(await roundtrip("gun-recoil-" + boundary));
                }
            }
            const f = tank().superFire;
            const phase = f === null ? "absent" : f.removeFlag ? "detached" : String(f.state);
            if (!fireSeen.has(phase)) {
                fireSeen.add(phase);
                results.push(await roundtrip("fire-" + phase));
            }
            await tick();
        }
        check(gunSeen.size === 3, "All gun states");
        check(recoilSeen.size === 9, "Every burst group start, mid-recoil, and recoil-end boundary");
        check(seen.size === 5, "All live tank motion phases");
        check(fireSeen.has("detached"), "Naturally detached fire remains reachable");
        const oldFire = tank().superFire;
        check(oldFire, "Fire replacement predecessor");
        await reach("Actual replacement fire", () => tank().superFire !== oldFire);
        results.push(await roundtrip("fire-replacement"));
        world().player.x = 1536;
        await tick();
        for (let hit = 1; hit <= BossSuperTank.HITS_EXPLODE; hit++) {
            const t = tank();
            check(t.attack(t.x, t.y + 32, t.x + 456, t.y + 198, AttackSource.PLAYER_WEAPON), "Actual tank hit");
            if ([1, 4, 5, 9, 10, 14, 15].includes(hit)) results.push(await roundtrip("tank-hit-" + hit));
        }
        await tick();
        results.push(await roundtrip("tank-first-explosion-tick"));
        for (let i = 0; i < 200; i++) await tick();
        results.push(await roundtrip("tank-middle-explosions"));
        for (const state of [6, 7]) {
            await reach("tank-terminal-" + state, () => tank().state === state);
            results.push(await roundtrip("tank-terminal-" + state));
            if (state === 6) {
                for (let i = 0; i < 50; i++) await tick();
                results.push(await roundtrip("tank-middle-finishing"));
            }
        }
        await reach("Tank waits before ending pan", () => tank().state === 7 && tank().delay === 2);
        world().player.explode();
        await tick();
        check(tank().state === 7 && world().player.respawning > 0, "Reserve death blocks ending pan");
        results.push(await roundtrip("tank-waits-for-respawn"));
        for (const state of [8, 9]) {
            await reach("ending phase " + state, () => tank().state === state);
            results.push(await roundtrip("tank-terminal-" + state));
            if (state === 8) {
                for (let i = 0; i < 20; i++) await tick();
                check(world().endingCameraPan, "Positive-distance middle ending pan");
                results.push(await roundtrip("ending-pan-middle"));
            }
        }
        await reach("skull-fading", () => active().some((e) => e instanceof FlashingSkull && e.state === FlashingSkull.STATE_FADING));
        results.push(await roundtrip("skull-fading"));
        await reach("skull pauses for physical song completion", () =>
            active().some((e) => e instanceof FlashingSkull && e.state === FlashingSkull.STATE_PAUSED)
        );
        results.push(await roundtrip("skull-paused"));
        const song = current().main.currentSong;
        check(song, "Ending song");
        for (const part of [song.intro, song.intro2, song.loop])
            if (part?.getTransportState() === "playing") {
                await part.attachPlaybackGeneration();
                const source: unknown = Reflect.get(part, "source");
                check(source instanceof AudioBufferSourceNode, "Actual ending audio source");
                source.dispatchEvent(new Event("ended"));
            }
        await reach("mission text starts", () => active().some((e) => e instanceof MissionAccomplished));
        results.push(await roundtrip("mission-text-start"));
        for (let i = 0; i < 40; i++) await tick();
        results.push(await roundtrip("mission-partial-text"));
        await reach("mission-text-paused", () => active().some((e) => e instanceof MissionAccomplished && e.state === MissionAccomplished.STATE_PAUSED));
        results.push(await roundtrip("mission-text-paused"));
        await reach("mission-complete", () => world().stageCompletedFlag);
        results.push(await roundtrip("mission-done-completion-delay"));
        await reach("final-fade", () => current().main.fading, 4000);
        results.push(await roundtrip("final-fade"));
        await reach("Sunset", () => !(current().main.mode instanceof GameMode), 4000);
        results.push(await roundtrip("Sunset"));
        return results;
    }
    async function prepareReload(label: string) {
        let collisionActors: EnemySoldier[] = [];
        if (label === "ordered-collision") {
            await mount(false);
            const { main, container } = current();
            main.stageIndex = 0;
            main.requestMode(Modes.GAME, container);
            check(save(main, () => true).saved, "Collision earlier valid seed");
            earlierValidBytes = localStorage.getItem(key);
            const w = world(),
                x = 1024,
                y = w.cameraY + 400;
            const first = new EnemySoldier(x, y, EnemySoldierType.STATIONARY);
            const second = new EnemySoldier(x, y, EnemySoldierType.STATIONARY);
            collisionActors = [first, second];
            first.changeLayer(6);
            await tick();
            new PlayerBullet(x, y + PlayerBullet.VELOCITY);
            const positive = capture();
            check(positive.kind === "game", "Loaded collision graph");
            for (const role of ["solids", "mines"] as const) {
                check(positive.gameMode.indexes[role].length >= 2, "Real collision-role registrations");
                const bad = structuredClone(positive);
                bad.gameMode.indexes[role].pop();
                check(!isSupportedGameStateSnapshot(bad), "Loaded missing " + role);
                const validBytes = localStorage.getItem(key);
                const badBytes = JSON.stringify(bad);
                localStorage.setItem(key, badBytes);
                let writes = 0;
                const set = Storage.prototype.setItem,
                    remove = Storage.prototype.removeItem;
                Storage.prototype.setItem = () => {
                    writes++;
                };
                Storage.prototype.removeItem = () => {
                    writes++;
                };
                try {
                    check(!store.hasValidSave(), "Missing role store inspection rejects");
                    check(!readSaved(main, container), "Missing role restore rejects");
                    check(writes === 0, "Missing role readers never write");
                    check(localStorage.getItem(key) === badBytes, "Rejected bytes retained");
                    check(normalized(capture()) === normalized(positive), "Missing role leaves live graph unchanged");
                } finally {
                    Storage.prototype.setItem = set;
                    Storage.prototype.removeItem = remove;
                    if (validBytes !== null) localStorage.setItem(key, validBytes);
                }
            }
        } else if (label === "pause-audio" || label === "pause-middle" || label === "pause-completed" || label === "unpaused-audio") {
            await preparePauseAudio();
            if (label !== "unpaused-audio") {
                if (label === "pause-completed") AudioBufferSourceNode.prototype.start = audioStart;
                try {
                    startEdge();
                    await tick();
                    check(world().paused, "Paused audio reload seed");
                    if (label === "pause-middle") {
                        const duration = SoundStore.get().getDecodedAudioBuffer("soundeffects/pause.ogg")!.duration;
                        audioTime += duration / 2;
                        const cue = current().main.pauseSound.capturePlaybackState();
                        check(cue.voices.length === 1 && cue.voices[0].positionSeconds > 0, "Actual cue advances to its middle");
                    }
                    if (label === "pause-completed") {
                        const deadline = performance.now() + 10000;
                        while (current().main.pauseSound.capturePlaybackState().voices.length) {
                            check(performance.now() < deadline, "Reload cue naturally completes");
                            await new Promise((resolve) => setTimeout(resolve, 25));
                        }
                    }
                } finally {
                    AudioBufferSourceNode.prototype.start = () => {};
                }
            }
        } else if (label === "player-death" || label === "player-respawn") {
            await preparePauseAudio();
            const player = world().player;
            current().main.extraLives = 2;
            player.explode();
            check(player.respawning > 0, "Actual player death producer");
            if (label === "player-respawn") await reach(label, () => player.respawning === 0);
        } else if (label === "headquarters") {
            await prepareBoss();
            await reach(label, () => !world().bossCameraPan);
            const h = active().find((e) => e instanceof BossHeadquarters);
            check(h instanceof BossHeadquarters, "HQ seed");
            for (let i = 0; i < 12; i++) h.attack(h.x, h.y, h.x + 256, h.y + 256, AttackSource.PLAYER_WEAPON);
        } else if (label === "earlier-boss") {
            await prepareBoss(0);
            await reach(label, () => !world().bossCameraPan);
        } else {
            await prepareHeadquarters();
            if (label === "paused-conveyor") {
                await reach(label, () => current().main.isSongPlaying() && world().conveyorLastIndex === 7);
                await togglePause();
                check(world().paused, "Reload paused conveyor");
            }
            if (label === "moving") await reach(label, () => tank().state === 2);
            if (label === "active-fire") await reach(label, () => tank().superFire !== null && !tank().superFire!.removeFlag);
            if (label === "detached-fire") await reach(label, () => tank().superFire?.removeFlag === true);
            if (label === "destruction" || label === "ending-pan") {
                const t = tank();
                for (let i = 0; i < 15; i++) check(t.attack(t.x, t.y + 32, t.x + 456, t.y + 198, AttackSource.PLAYER_WEAPON), "Reload fatal attack");
                if (label === "ending-pan") await reach(label, () => world().endingCameraPan);
            }
        }
        check(earlierValidBytes !== null, "Reload earlier valid seed");
        check(normalized(JSON.parse(earlierValidBytes) as JackalGameStateSnapshot) !== normalized(capture()), "Reload distinct phase");
        localStorage.setItem(key, earlierValidBytes);
        check(save(current().main, () => true).saved, label + " save");
        const bytes = localStorage.getItem(key);
        check(bytes, "Reload bytes");
        const state = normalized(capture());
        render();
        const firstRender = JSON.stringify(textCalls);
        const nextTicks: string[] = [];
        const beforeCollisionScore = current().main.score;
        for (let i = 0; i < 5; i++) {
            await tick();
            nextTicks.push(normalized(capture()));
        }
        if (label === "ordered-collision") {
            check(current().main.score === beforeCollisionScore + 100, "New-document control has an actual first-hit score outcome");
            check(active().filter((e) => collisionActors.includes(e as EnemySoldier)).length === 1, "Exactly one overlapping enemy survives cleanup");
            check(
                !collisionActors[0].removeFlag && collisionActors[1].removeFlag,
                "Reverse insertion-order first hit survives different layer traversal order"
            );
        }
        retire();
        return { label, bytes, state, firstRender, nextTicks };
    }
    async function restoreReload(checkpoint: Awaited<ReturnType<typeof prepareReload>>) {
        localStorage.setItem(key, checkpoint.bytes);
        await mount(true);
        check(normalized(capture()) === checkpoint.state, checkpoint.label + " fresh-document graph");
        check(localStorage.getItem(key) === checkpoint.bytes, "Reader never writes");
        render();
        check(JSON.stringify(textCalls) === checkpoint.firstRender, "Fresh-document first render");
        for (let i = 0; i < 5; i++) {
            await tick();
            check(
                normalized(capture()) === checkpoint.nextTicks[i],
                checkpoint.label +
                    " fresh-document tick " +
                    i +
                    " " +
                    JSON.stringify(diff(JSON.parse(checkpoint.nextTicks[i]), JSON.parse(normalized(capture()))))
            );
        }
        if (checkpoint.label === "pause-audio" || checkpoint.label === "pause-middle" || checkpoint.label === "pause-completed") {
            const sounds = JSON.stringify(capture().audioState.sounds);
            check(world().paused, "Fresh document remains gameplay-paused");
            startEdge();
            await tick();
            check(!world().paused && JSON.stringify(capture().audioState.sounds) === sounds, "Fresh-document unpause neither purges nor manufactures effects");
        }
        return { label: checkpoint.label, restored: true };
    }
    return {
        async verifyLegacyPaused(bytes: string) {
            await mount(false);
            const before = normalized(capture()),
                legacy = JSON.parse(bytes) as { version: number; gameMode: { fields: { paused: boolean } } };
            check(legacy.version === 22 && legacy.gameMode.fields.paused, "Genuine old paused fixture identity");
            localStorage.setItem(key, bytes);
            check(!store.hasValidSave() && !readSaved(current().main, current().container), "Genuine old paused save rejected at unchanged slot");
            check(localStorage.getItem(key) === bytes && normalized(capture()) === before, "Legacy miss preserves bytes and live runtime");
            return { version: legacy.version, nonwriting: true, liveUnchanged: true };
        },
        pauseAudioMatrix,
        matrix,
        prepareReload,
        restoreReload,
        prepareHeadquarters,
        dispose() {
            retire();
            AudioBufferSourceNode.prototype.start = audioStart;
            AudioBufferSourceNode.prototype.stop = audioStop;
            if (audioClock) Object.defineProperty(BaseAudioContext.prototype, "currentTime", audioClock);
            Sys.getTime = previousClock;
            Date.now = previousDateNow;
            if (previousBytes === null) localStorage.removeItem(key);
            else localStorage.setItem(key, previousBytes);
        }
    };
}
