import { Input } from "slick2d-ts";
import * as NesInputProfile from "./jackal/NesInputProfile.js";
import { IntroMode } from "./jackal/IntroMode.js";
import { ContinueMode } from "./jackal/ContinueMode.js";
import { GameMode } from "./jackal/GameMode.js";
import { Mine } from "./jackal/Mine.js";
import { Player } from "./jackal/Player.js";
import { InputMode } from "./jackal/InputMode.js";
import { ButtonMapping } from "./jackal/ButtonMapping.js";
import { JackalInputMappingStore } from "./app/JackalInputMappingStore.js";
import { JackalGameStateSerializer } from "./jackal/persistence/JackalGameStateSerializer.js";
import { isSupportedGameStateSnapshot } from "./jackal/persistence/GameStateSnapshotValidator.js";
import { GAME_STATE_STORAGE_KEY } from "./jackal/persistence/GameStateSchema.js";
import { getDeploymentStorageKey } from "./app/DeploymentStorageKeys.js";
import { verifyAuthoritativeSave } from "./PersistenceContractVerification.js";
import { JackalRuntimeLoader, type PreparedRuntime } from "./app/JackalRuntimeLoader.js";
import { Modes } from "./jackal/Modes.js";

const result = document.querySelector<HTMLElement>("#result");
const host = document.querySelector<HTMLElement>("#game-host");
if (result === null || host === null) {
    throw new Error("Browser verification fixture is missing required elements.");
}
const gameHost = host;

type RuntimeMain = InstanceType<PreparedRuntime["Main"]>;

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

interface MountedGame {
    main: RuntimeMain;
    buffered: InstanceType<PreparedRuntime["slick"]["BufferedScalableGame"]>;
    container: InstanceType<PreparedRuntime["slick"]["AppGameContainer"]>;
}

function soundVoice(positionSeconds: number) {
    return {
        looped: false,
        playbackRate: 1,
        positionSeconds,
        gain: 1,
        spatialPosition: null
    };
}

function assertPlaybackEqual(actual: unknown, expected: unknown, label: string): void {
    assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} did not restore exact logical playback state.`);
}

async function mountGame(
    runtime: PreparedRuntime,
    restore: boolean,
    onRestored?: (main: RuntimeMain) => void,
    beforeRestore?: (main: RuntimeMain) => void
): Promise<MountedGame> {
    gameHost.replaceChildren();
    runtime.slick.Display.setParent(gameHost);

    const main = new runtime.Main();
    main.reserveBrowserRuntime();
    const buffered = new runtime.slick.BufferedScalableGame(main, runtime.Main.DISPLAY_WIDTH, runtime.Main.DISPLAY_HEIGHT, {
        maintainAspect: true,
        scalingMode: runtime.slick.BufferedScalingMode.Nearest
    });
    const container = new runtime.slick.AppGameContainer(buffered, 1024, 960, false);
    container.setPreserveAudioCacheOnDestroy(true);
    container.setLoopSuspended(false);
    container.setHighDpiEnabled(true);
    container.setMaxDevicePixelRatio(2);
    if (restore) {
        const store = new runtime.JackalGameStateStore("browser-verification");
        main.loadingCompleteHandler = (gc) => {
            beforeRestore?.(main);
            const restored = store.restore(main, gc);
            if (restored) {
                onRestored?.(main);
            }
            return restored;
        };
    }

    await Promise.resolve(container.setDisplayMode(1024, 960, false));
    await container.start();
    await runtime.slick.ResourceLoader.waitForAll();
    assert(main.isStateSaveReady(), "Real Jackal Main did not become save-state ready.");
    assert(buffered.getPresentationInfo().physicalWidth > 0, "Buffered presentation did not acquire a physical width.");
    return { main, buffered, container };
}

function destroyMounted(runtime: PreparedRuntime, mounted: MountedGame | null): void {
    if (mounted === null) {
        return;
    }
    mounted.main.stopAllSounds();
    mounted.main.disposeBrowserRuntime();
    mounted.container.destroy();
    runtime.slick.Display.setParent(null);
}

async function verify(): Promise<void> {
    localStorage.clear();
    const loader = new JackalRuntimeLoader(() => undefined);
    const runtime = await loader.ensurePrepared(false);
    const store = new runtime.JackalGameStateStore("browser-verification");
    let first: MountedGame | null = null;
    let second: MountedGame | null = null;

    try {
        first = await mountGame(runtime, false);
        verifyAuthoritativeSave(getDeploymentStorageKey(GAME_STATE_STORAGE_KEY), first.main, (main) => store.save(main, () => true));
        first.main.requestMode(Modes.GAME, first.container);
        first.main.score = 123450;
        first.main.scoreStr = "123450";
        first.main.extraLives = 3;
        first.main.extraLivesStr = "3";
        assert(first.main.mode === runtime.Main.gameMode, "Real Jackal Main did not enter GameMode before save.");

        first.main.helicopterSound2.restorePlaybackState({
            voices: [soundVoice(0.05)],
            activeVoiceIndex: 0
        });
        first.main.machineGunSound.restorePlaybackState({
            voices: [soundVoice(0.02)],
            activeVoiceIndex: 0
        });
        first.main.explodeSound.restorePlaybackState({
            voices: [soundVoice(0.01), soundVoice(0.02)],
            activeVoiceIndex: null
        });
        first.main.lastPlayTime.set(first.main.machineGunSound, Date.now() - 40);

        const expectedHelicopter = first.main.helicopterSound2.capturePlaybackState();
        const expectedMachineGun = first.main.machineGunSound.capturePlaybackState();
        const expectedExplode = first.main.explodeSound.capturePlaybackState();
        assert(expectedHelicopter.voices.length === 1, "Browser fixture did not install helicopter Sound state.");
        assert(expectedMachineGun.voices.length === 1, "Browser fixture did not install machine-gun Sound state.");
        assert(expectedExplode.voices.length === 2 && expectedExplode.activeVoiceIndex === null, "Browser fixture did not install overlapping Sound state.");

        assert(store.save(first.main, () => true).saved, "Real Jackal browser Main did not save successfully.");
        assert(store.hasValidSave(), "Saved real Jackal browser state did not validate.");
        first.buffered.setScalingMode(runtime.slick.BufferedScalingMode.Linear);
        first.buffered.setScalingMode(runtime.slick.BufferedScalingMode.Integer);
        first.buffered.setScalingMode(runtime.slick.BufferedScalingMode.Nearest);

        destroyMounted(runtime, first);
        first = null;

        let restoreObserved = false;
        second = await mountGame(runtime, true, (restoredMain) => {
            restoreObserved = true;

            const helicopter = restoredMain.helicopterSound2.capturePlaybackState();
            assertPlaybackEqual(helicopter, expectedHelicopter, "helicopter Sound");
            restoredMain.playSoundIfNotPlaying(restoredMain.helicopterSound2);
            assertPlaybackEqual(restoredMain.helicopterSound2.capturePlaybackState(), helicopter, "playSoundIfNotPlaying helicopter Sound");

            const machineGun = restoredMain.machineGunSound.capturePlaybackState();
            assertPlaybackEqual(machineGun, expectedMachineGun, "machine-gun Sound");
            restoredMain.playSound(restoredMain.machineGunSound);
            assertPlaybackEqual(restoredMain.machineGunSound.capturePlaybackState(), machineGun, "repeat-limited machine-gun Sound");

            assertPlaybackEqual(restoredMain.explodeSound.capturePlaybackState(), expectedExplode, "overlapping explosion Sound voices");
            assert(restoredMain.extraLifeSound.capturePlaybackState().voices.length === 0, "An omitted Sound should restore empty.");
        });

        assert(restoreObserved, "Fresh Jackal Main did not execute the saved-state restore hook.");
        assert(second.main.mode === runtime.Main.gameMode, "Fresh Jackal Main did not restore GameMode.");
        assert(second.main.score === 123450 && second.main.scoreStr === "123450", "Fresh Jackal Main did not restore score state.");
        assert(second.main.extraLives === 3 && second.main.extraLivesStr === "3", "Fresh Jackal Main did not restore life state.");
        assert(second.main.isBrowserRuntimeActive(), "Restored Jackal Main is not the active browser runtime.");
        // Save a real terminal death countdown, retain it through suspension,
        // then restore it into a fresh runtime through the production store.
        second.container.setLoopSuspended(true);
        second.main.fading = false;
        second.main.fadeListener = null;
        second.main.startPlayer();
        second.main.continued = true;
        second.main.requestMode(Modes.GAME, second.container);
        const deathWorld = second.main.mode;
        assert(deathWorld instanceof GameMode, "Death reload needs gameplay");
        // Finish the actual stage entrance before killing and saving the player.
        for (let i = 0; i < 500 && (!deathWorld.playing || second.main.fading); i++) {
            second.main.nextFrameTime = 0;
            second.main.update(second.container, 80);
        }
        assert(deathWorld.playing && !second.main.fading, "Death reload stage entrance did not finish");
        second.main.extraLives = 0;
        second.main.extraLivesStr = "0";
        deathWorld.player.explode();
        const deathCountdown = deathWorld.player.respawning;
        assert(deathCountdown === Player.RESPAWN_DELAY, "Death reload countdown was not generated by explode");
        second.main.setBrowserSuspended(true);
        second.main.update(second.container, 1000);
        assert(deathWorld.player.respawning === deathCountdown, "Suspended death countdown advanced");
        second.main.setBrowserSuspended(false);
        assert(deathWorld.player.respawning === deathCountdown, "Retained resume advanced death countdown");
        assert(store.save(second.main, () => true).saved && store.hasValidSave(), "Death countdown save failed validation");
        destroyMounted(runtime, second);
        second = null;
        let deathRestoreObserved = false;
        second = await mountGame(runtime, true, (restoredMain) => {
            deathRestoreObserved = true;
            assert(restoredMain.mode instanceof GameMode, "Death reload did not restore gameplay");
            assert(restoredMain.mode.player.respawning === deathCountdown && restoredMain.extraLives === 0, "Death reload changed countdown or reserves");
            assert(restoredMain.currentSong === null && restoredMain.requestedSong === null, "Death reload restarted music before Continue");
            const snapshot = new JackalGameStateSerializer().createSnapshot(restoredMain, "death-reload-contract");
            assert(isSupportedGameStateSnapshot(snapshot), "Restored death countdown did not recapture validly");
        });
        assert(deathRestoreObserved, "Death reload restore hook did not run");
        verifyFinalLifeTransition(runtime, second, "yes");
        destroyMounted(runtime, second);
        second = null;
        second = await mountGame(runtime, true, (main) => {
            assert(main.mode instanceof GameMode && main.mode.player.respawning === deathCountdown, "NO case did not restore the original death countdown");
        });
        verifyFinalLifeTransition(runtime, second, "no");
        verifyFinalLifeTransition(runtime, second);
        verifyInputEditor(runtime, second);
        verifyEditorResume(second.main, second.container);
        destroyMounted(runtime, second);
        second = null;
        await verifyFadeRestoreMatrix(runtime);
        await verifyNesMapping(runtime);
    } finally {
        destroyMounted(runtime, first);
        destroyMounted(runtime, second);
        store.clear(() => true);
        localStorage.clear();
    }
}

void verify().then(
    () => {
        result.dataset.status = "passed";
        result.textContent = "Real Jackal browser boot/gameplay save/restore/audio, final-life transition, and input-editor storage verification passed.";
    },
    (error: unknown) => {
        console.error(error);
        result.dataset.status = "failed";
        result.textContent = error instanceof Error ? (error.stack ?? error.message) : String(error);
    }
);

/** Drive the actual editor, serializer, validators and independent storage slots. */
function verifyInputEditor(runtime: PreparedRuntime, mounted: MountedGame): void {
    const { main, container } = mounted;
    container.setLoopSuspended(true);
    main.requestMode(Modes.INPUT, container);
    assert(main.mode instanceof InputMode, "Expected input editor");
    let mode = main.mode;
    main.setBrowserSuspended(false);
    for (let tick = 0; tick < 40 && main.fading; tick++) {
        main.nextFrameTime = 0;
        main.update(container, 17);
    }
    main.setBrowserSuspended(true);
    assert(!main.fading && mode.state === InputMode.STATE_MENU, "Input menu fade did not complete");
    const input = container.getInput();
    let direction = -1;
    const overrides = {
        getControllerSampleStatus: () => ({ valid: true, sequence: 1, baselineOnly: false }),
        getControllerCount: () => 1,
        getControllerConnectionGeneration: () => 1,
        getButtonCount: () => 0,
        isControllerUp: () => direction === 0,
        isControllerDown: () => direction === 1,
        isControllerLeft: () => direction === 2,
        isControllerRight: () => direction === 3
    };
    const previous = new Map(Object.keys(overrides).map((key) => [key, Object.getOwnPropertyDescriptor(input, key)]));
    const nativeGet = Storage.prototype.getItem;
    const nativeSet = Storage.prototype.setItem;
    const gameKey = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    const mappingKey = getDeploymentStorageKey("jackal.input-mapping");
    const mappingStore = new JackalInputMappingStore();
    const store = new runtime.JackalGameStateStore("editor-contract");
    const serializer = new JackalGameStateSerializer();
    const acceptsSnapshot: (value: unknown) => boolean = isSupportedGameStateSnapshot;
    let mappingWrites = 0;
    try {
        Object.assign(input, overrides);
        assert(mappingStore.save(main.buttonMapping, () => true).saved, "Seed committed mapping");
        const committed = nativeGet.call(localStorage, mappingKey);
        Storage.prototype.setItem = function (key, value) {
            if (key === mappingKey) {
                mappingWrites++;
                throw new DOMException("Injected mapping quota", "QuotaExceededError");
            }
            nativeSet.call(this, key, value);
        };
        main.inputMappingChangedHandler = () => mappingStore.save(main.buttonMapping, () => true);
        mode.optionSelected(InputMode.OPTION_CHANGE);
        for (let step = 0; step < InputMode.ACTIONS.length; step++) {
            direction = -1;
            for (let tick = 0; tick < InputMode.ARM_DELAY; tick++) mode.update(container);
            if (step < 4) {
                direction = step;
                mode.update(container);
            } else mode.keyPressed([30, 31, 32][step - 4]!, "");
            assert(mode.state === InputMode.STATE_READ_FADE, "Editor did not accept assignment " + step);
            assert(store.save(main, () => true).saved && store.hasValidSave(), "Assignment did not survive real store " + step);
            const snapshot = serializer.createSnapshot(main, "editor-contract");
            assert(snapshot.kind === "mode" && snapshot.modeExtra !== null && "input" in snapshot.modeExtra, "Expected input snapshot");
            if (step === 0) {
                for (const invalid of [-1, -6, 64, 0.5, NaN, Infinity, -Infinity]) {
                    const bad = structuredClone(snapshot);
                    bad.modeExtra = { input: { ...snapshot.modeExtra.input, assignedControllerBindings: [invalid] } };
                    assert(!acceptsSnapshot(bad), "Invalid assignment accepted: " + invalid);
                }
                const duplicate = structuredClone(snapshot);
                duplicate.modeExtra = { input: { ...snapshot.modeExtra.input, assignedControllerBindings: [-2, -2] } };
                assert(!acceptsSnapshot(duplicate), "Duplicate accepted");
                const mismatch = structuredClone(snapshot);
                assert(mismatch.modeExtra !== null && "input" in mismatch.modeExtra && mismatch.modeExtra.input.draftButtonMapping !== null, "Expected draft");
                mismatch.modeExtra.input.draftButtonMapping.fields.controllerUp = -3;
                assert(!acceptsSnapshot(mismatch), "Inconsistent draft accepted");
                mismatch.modeExtra.input.draftButtonMapping.fields.controllerUp = -2;
                mismatch.modeExtra.input.draftButtonMapping.fields.controllerGrenade = -2;
                assert(!acceptsSnapshot(mismatch), "Duplicate logical binding accepted");
            }
            assert(store.restore(main, container), "Assignment reload failed");
            assert(main.mode instanceof InputMode, "Assignment restored wrong mode");
            mode = main.mode;
            for (let tick = 0; tick < InputMode.FADE_TIME; tick++) mode.update(container);
        }
        assert(mode.message === "NOT SAVED" && mode.state === InputMode.STATE_SAVED, "Expected real mapping failure outcome");
        assert(mappingWrites === 1 && main.buttonMapping.keyGun === 31, "Mapping failure lost active bindings");
        assert(nativeGet.call(localStorage, mappingKey) === committed, "Failed mapping write changed committed bytes");
        for (const raw of ["{", JSON.stringify({ version: 15 }), JSON.stringify({ version: 17 })]) {
            nativeSet.call(localStorage, gameKey, raw);
            let reads = 0;
            Storage.prototype.getItem = function () {
                reads++;
                throw new Error("No old-slot reads allowed");
            };
            try {
                assert(store.save(main, () => true).saved, "NOT SAVED game progress rejected");
                assert(reads === 0, "Writer read old slot");
            } finally {
                Storage.prototype.getItem = nativeGet;
            }
        }
        main.buttonMapping.resetToDefaults();
        const authority = main.buttonMapping.clone();
        assert(store.restore(main, container), "Completion reload failed");
        assert(main.mode instanceof InputMode, "Completion restored wrong mode");
        mode = main.mode;
        assert(mode.completionMessage() === "DONE", "Restore falsely reported saved mapping");
        assert(JSON.stringify(main.buttonMapping) === JSON.stringify(authority), "Restore replaced committed mapping authority");
        assert(mappingWrites === 1, "Restore replayed mapping commit");
        for (let tick = 0; tick < InputMode.DONE_DELAY; tick++) mode.update(container);
        assert(mode.state === InputMode.STATE_MENU && store.save(main, () => true).saved, "Completed input menu rejected");
        assert(store.restore(main, container), "Completed input menu reload failed");
        assert(!ButtonMapping.isValidRawControllerButton(-2), "Raw physical API was broadened");
    } finally {
        Storage.prototype.getItem = nativeGet;
        Storage.prototype.setItem = nativeSet;
        main.inputMappingChangedHandler = null;
        for (const [key, descriptor] of previous) {
            if (descriptor) Object.defineProperty(input, key, descriptor);
            else Reflect.deleteProperty(input, key);
        }
    }
}

/** Exercise real DOM -> Slick Input -> Main resume -> editor boundaries. */
function verifyEditorResume(main: RuntimeMain, container: MountedGame["container"]): void {
    container.setLoopSuspended(true);
    const input = container.getInput();
    const canvas = document.querySelector("canvas");
    assert(canvas !== null, "Missing actual input canvas");
    main.requestMode(Modes.INPUT, container);
    main.setBrowserSuspended(false);
    for (let tick = 0; tick < 40 && main.fading; tick++) {
        main.nextFrameTime = 0;
        main.update(container, 17);
    }
    assert(main.mode instanceof InputMode, "Expected actual Jackal editor");
    const mode = main.mode;
    const start = () => {
        mode.optionSelected(InputMode.OPTION_CHANGE);
    };
    const update = () => {
        mode.update(container);
    };
    const count = () => mode.assignedKeys.size;
    const poll = () => input.poll(1024, 960);
    const event = (target: EventTarget, type: string, code = "KeyQ", key = "q", repeat = false) =>
        target.dispatchEvent(new KeyboardEvent(type, { code, key, repeat, bubbles: true }));
    for (const scenario of ["released", "held", "queued", "menu-only"]) {
        input.resume();
        main.setBrowserSuspended(false);
        canvas.focus();
        start();
        if (scenario !== "menu-only") {
            event(canvas, "keydown");
            poll();
        }
        if (scenario === "queued") {
            event(canvas, "keyup");
            event(canvas, "keydown");
            event(canvas, "keyup");
        }
        assert(count() === 0, "Arming must not bind");
        main.setBrowserSuspended(true);
        input.pause();
        if (scenario === "released") event(window, "keyup");
        if (scenario === "menu-only") {
            event(window, "keydown");
            event(window, "keyup");
        }
        for (const [code, key] of [
            ["Enter", "Enter"],
            ["Space", " "]
        ]) {
            event(window, "keydown", code, key);
            event(window, "keyup", code, key);
        }
        input.resume();
        main.setBrowserSuspended(false);
        canvas.focus();
        for (let i = 0; i < 12; i++) {
            poll();
            update();
        }
        assert(count() === 0, "Paused/queued activation leaked: " + scenario);
        if (scenario === "held") {
            event(canvas, "keydown", "KeyQ", "q", true);
            poll();
            update();
            assert(count() === 0, "Held repeat bound after resume");
            event(canvas, "keyup");
            poll();
        }
        event(canvas, "keydown");
        poll();
        update();
        assert(count() === 1, "First fresh released key rejected: " + scenario);
        event(canvas, "keydown", "KeyQ", "q", true);
        poll();
        update();
        assert(count() === 1, "Repeat advanced editor twice");
        event(canvas, "keyup");
        poll();
        // Complete this setup through actual input so the next case starts from its menu.
        for (const key of ["w", "e", "r", "t", "y", "u"]) {
            for (let tick = 0; tick < InputMode.FADE_TIME + InputMode.ARM_DELAY + 1; tick++) {
                poll();
                update();
            }
            event(canvas, "keydown", "Key" + key.toUpperCase(), key);
            poll();
            update();
            event(canvas, "keyup", "Key" + key.toUpperCase(), key);
            poll();
        }
        for (let tick = 0; tick < InputMode.FADE_TIME + InputMode.DONE_DELAY + 1; tick++) update();
        assert(mode.state === InputMode.STATE_MENU, "Setup did not return to menu");
    }
}

/** Final-life ownership must end before old movement, weapons, and collisions. */
function verifyFinalLifeTransition(runtime: PreparedRuntime, mounted: MountedGame, restoredChoice?: "yes" | "no"): void {
    const { main, container } = mounted;
    container.setLoopSuspended(true);
    const input = container.getInput();
    const canvas = document.querySelector("canvas");
    assert(canvas !== null, "Final-life fixture needs the real game canvas");
    const mapping = main.buttonMapping.clone();
    const currentMode = (): RuntimeMain["mode"] => main.mode;
    const currentSong = (): RuntimeMain["currentSong"] => main.currentSong;
    const requestedSong = (): RuntimeMain["requestedSong"] => main.requestedSong;
    const restores: Array<() => void> = [];
    let now = runtime.slick.Sys.getTime();
    const replace = (target: object, key: string, value: unknown): void => {
        const old = Object.getOwnPropertyDescriptor(target, key);
        Object.defineProperty(target, key, { configurable: true, writable: true, value });
        restores.push(() => {
            if (old !== undefined) Object.defineProperty(target, key, old);
            else Reflect.deleteProperty(target, key);
        });
    };
    const unwind = (length: number): void => {
        while (restores.length > length) restores.pop()!();
    };
    const key = (type: "keydown" | "keyup", code: string, value: string): void => {
        canvas.dispatchEvent(new KeyboardEvent(type, { code, key: value, bubbles: true }));
    };
    const release = (): void => {
        for (const [code, value] of [
            ["KeyJ", "j"],
            ["KeyK", "k"],
            ["KeyD", "d"],
            ["KeyS", "s"],
            ["Enter", "Enter"]
        ]) {
            key("keyup", code!, value!);
        }
        input.poll(1024, 960);
    };
    const tick = (): void => {
        input.poll(1024, 960);
        runtime.slick.Music.poll(10);
        runtime.slick.SoundStore.get().poll(10);
        main.nextFrameTime = now;
        main.update(container, 10);
        now += 10;
    };
    try {
        replace(runtime.slick.Sys, "getTime", () => now);
        replace(navigator, "getGamepads", () => []);
        input.resume();
        main.setBrowserSuspended(false);
        canvas.focus();
        main.buttonMapping.keyGun = runtime.slick.Input.KEY_J;
        main.buttonMapping.keyGrenade = runtime.slick.Input.KEY_K;
        main.buttonMapping.keyRight = runtime.slick.Input.KEY_D;
        main.buttonMapping.keyDown = runtime.slick.Input.KEY_S;
        main.buttonMapping.keyStart = runtime.slick.Input.KEY_ENTER;

        for (const scenario of restoredChoice
            ? [{ name: "restored-" + restoredChoice, gun: true, secondary: false, hazard: true }]
            : [
                  { name: "idle", gun: false, secondary: false, hazard: false },
                  { name: "held-gun", gun: true, secondary: false, hazard: false },
                  { name: "held-secondary", gun: false, secondary: true, hazard: false },
                  { name: "contact", gun: false, secondary: false, hazard: true },
                  { name: "held-weapons-and-contact", gun: true, secondary: true, hazard: true }
              ]) {
            release();
            if (!restoredChoice) {
                main.stopAllSongs();
                main.stopAllSoundEffects();
                main.startPlayer();
                main.continued = true;
                main.requestMode(Modes.GAME, container);
            }
            const world = currentMode();
            assert(world instanceof GameMode, scenario.name + ": GameMode not installed");
            const player = world.player;
            if (!restoredChoice) {
                // A controlled arena in a fully initialized real GameMode. No unrelated
                // stage triggers, enemies or rewards may obscure the transition under test.
                world.triggerY = 0;
                world.playing = true;
                world.paused = false;
                world.bossCameraPan = false;
                world.endingCameraPan = false;
                world.stageCompletedFlag = false;
                for (const list of world.elements) list.clear();
                world.enemies.clear();
                world.solids.clear();
                world.mines.clear();
                for (const row of world.typesMap) row.fill(GameMode.TYPE_EMPTY);
                player.x = 512;
                player.y = 480;
                player.angle = player.nextAngle = player.displayAngle = 0;
                player.angleSteps = 0;
                player.invincible = 0;
                player.pows = player.releaseablePows = 0;
                main.fading = false;
                main.fadeListener = null;
                main.stopAllSongs();
                main.requestSong(main.stageSong0);
                tick();
                assert(currentSong() === main.stageSong0, scenario.name + ": seed song not started");
                if (scenario.name === "idle") {
                    // Real input and a live contact hazard: accepting Pause must stop
                    // every world callback before movement, weapons, or collision.
                    const pauseMine = new Mine(player.x - 16, player.y - 16);
                    pauseMine.points = 0;
                    const pauseMark = restores.length;
                    let worldCalls = 0;
                    const frozenState = (): string =>
                        JSON.stringify([
                            player.x,
                            player.y,
                            player.respawning,
                            player.gunArmed,
                            world.cameraX,
                            world.cameraY,
                            world.waterAlphaIndex,
                            world.triggerY,
                            world.stageCompletedDelay,
                            world.elements.map((list) => list.size()),
                            main.score,
                            main.extraLives
                        ]);
                    try {
                        for (const [target, method] of [
                            [world, "processTriggers"],
                            [world, "cameraTrackPlayer"],
                            [player, "update"],
                            [pauseMine, "update"],
                            [pauseMine, "bump"]
                        ] as const) {
                            const original = Reflect.get(target, method) as (...args: unknown[]) => unknown;
                            replace(target, method, (...args: unknown[]): unknown => {
                                worldCalls++;
                                return original.apply(target, args);
                            });
                        }
                        const before = frozenState();
                        key("keydown", "KeyD", "d");
                        key("keydown", "KeyJ", "j");
                        key("keydown", "Enter", "Enter");
                        tick();
                        assert(world.paused && worldCalls === 0 && frozenState() === before, "Pause entry ran world work");
                        for (let i = 0; i < 5; i++) tick();
                        assert(world.paused && worldCalls === 0 && frozenState() === before, "Held Pause advanced the world");
                        key("keyup", "Enter", "Enter");
                        tick();
                        key("keydown", "Enter", "Enter");
                        tick();
                        assert(!world.paused && worldCalls === 0 && frozenState() === before, "Unpause tick ran world work");
                        tick();
                        assert(worldCalls > 0 && frozenState() !== before, "World did not resume on the following tick");
                        assert(player.respawning === Player.RESPAWN_DELAY, "Live hazard was not exercised after unpause");
                    } finally {
                        unwind(pauseMark);
                        release();
                        for (const list of world.elements) list.clear();
                        world.enemies.clear();
                        world.solids.clear();
                        world.mines.clear();
                        player.respawning = 0;
                        player.x = 512;
                        player.y = 480;
                    }
                }
                main.extraLives = 0;
                main.extraLivesStr = "0";
                player.explode();
                assert(currentSong() === null && requestedSong() === null, scenario.name + ": death did not clear songs");
                assert(player.respawning === Player.RESPAWN_DELAY, "Changed death countdown");
            }
            assert(player.respawning > 0 && main.extraLives === 0, "Expected same restored final-life countdown");
            const deathTicks = player.respawning;
            // Introduce a real contact hazard during the death interval. Mine uses
            // production Enemy.bump(), not an audio-canceling test stub.
            const hazard = scenario.hazard ? new Mine(player.x - 16, player.y - 16) : null;
            if (hazard !== null) hazard.points = 0; // An earned reserve life would change the branch.
            if (!restoredChoice) player.gunArmed = 0;
            if (!restoredChoice) player.shootReleased = true;
            if (!restoredChoice) player.fireReleased = true;
            if (!restoredChoice) player.weaponArmed = true;
            if (scenario.gun) key("keydown", "KeyJ", "j");
            if (scenario.secondary) key("keydown", "KeyK", "k");
            if (scenario.gun || scenario.secondary) key("keydown", "KeyD", "d");

            let handedOff = false;
            let continueInstalls = 0;
            let playerAtHandoff: string | null = null;
            let entitiesAtHandoff = -1;
            let scoreAtHandoff = -1;
            let lateCameraCalls = 0;
            let lateCollisionCalls = 0;
            let lateWeaponOrDeathSounds = 0;
            const state = (): string =>
                JSON.stringify([
                    player.x,
                    player.y,
                    player.angle,
                    player.nextAngle,
                    player.displayAngle,
                    player.angleSteps,
                    player.diagonalDelay,
                    player.targetAngle,
                    player.lastTargetAngle,
                    player.fireAngle,
                    player.rumble,
                    player.invincible,
                    player.gunArmed,
                    player.weaponArmed,
                    player.fireReleased,
                    player.shootReleased,
                    player.respawning,
                    player.pows,
                    player.releaseablePows
                ]);
            const entityCount = (): number => world.elements.reduce((count, list) => count + list.size(), 0);
            const mark = restores.length;
            const setMode = main.setMode;
            const cameraTrack = Reflect.get(world, "cameraTrackPlayer") as () => void;
            const playSound = main.playSound;
            const playSoundAlways = main.playSoundAlways;
            try {
                replace(main, "setMode", (mode: Parameters<RuntimeMain["setMode"]>[0], gc: Parameters<RuntimeMain["setMode"]>[1]): void => {
                    setMode.call(main, mode, gc);
                    if (mode instanceof ContinueMode) {
                        continueInstalls++;
                        handedOff = true;
                        playerAtHandoff = state();
                        entitiesAtHandoff = entityCount();
                        scoreAtHandoff = main.score;
                    }
                });
                replace(world, "cameraTrackPlayer", (): void => {
                    if (handedOff) lateCameraCalls++;
                    cameraTrack.call(world);
                });
                replace(main, "playSound", (sound: Parameters<RuntimeMain["playSound"]>[0]): void => {
                    if (
                        handedOff &&
                        main.mode instanceof ContinueMode &&
                        (sound === main.throwSound || sound === main.missileSound || sound === main.playerExplodeSound)
                    ) {
                        lateWeaponOrDeathSounds++;
                    }
                    playSound.call(main, sound);
                });
                replace(main, "playSoundAlways", (sound: Parameters<RuntimeMain["playSoundAlways"]>[0]): void => {
                    if (handedOff && main.mode instanceof ContinueMode && sound === main.machineGunSound) lateWeaponOrDeathSounds++;
                    playSoundAlways.call(main, sound);
                });
                if (hazard !== null) {
                    const bump = hazard.bump;
                    replace(hazard, "bump", (...args: Parameters<Mine["bump"]>): boolean => {
                        if (handedOff) lateCollisionCalls++;
                        return bump.apply(hazard, args);
                    });
                }
                for (let i = 0; i < deathTicks; i++) tick();
                const menu = currentMode();
                assert(
                    handedOff && continueInstalls === 1 && menu instanceof ContinueMode,
                    scenario.name +
                        ": no Continue handoff " +
                        JSON.stringify({
                            installs: continueInstalls,
                            mode: main.mode?.constructor.name,
                            countdown: player.respawning,
                            playing: world.playing,
                            paused: world.paused,
                            lives: main.extraLives
                        })
                );
                assert(!menu.optionSelectedFlag && !menu.menu.selectionMade, scenario.name + ": unintended menu selection");
                assert(state() === playerAtHandoff, scenario.name + ": old player ran after handoff");
                assert(entityCount() === entitiesAtHandoff, scenario.name + ": stale projectile/explosion created");
                assert(main.score === scoreAtHandoff && main.extraLives === 0, scenario.name + ": stale collision changed score/lives");
                assert(lateCameraCalls === 0, scenario.name + ": old GameMode tracked camera after handoff");
                assert(lateCollisionCalls === 0, scenario.name + ": old player queried hazards after handoff");
                assert(lateWeaponOrDeathSounds === 0, scenario.name + ": gameplay sound after cleanup");
                assert(requestedSong() === main.continueSong, scenario.name + ": continueSong request erased");
                for (let i = 0; i < 40; i++) tick();
                assert(
                    main.mode === menu && menu.state === ContinueMode.STATE_MENU && !menu.optionSelectedFlag,
                    scenario.name + ": Continue did not wait for a fresh selection"
                );
                assert(
                    currentSong() === main.continueSong && main.continueSong.playing && main.continueSong.intro?.getTransportState() === "playing",
                    scenario.name + ": Continue transport not playing"
                );
                const snapshot = new JackalGameStateSerializer().createSnapshot(main, "final-life-contract");
                assert(isSupportedGameStateSnapshot(snapshot), scenario.name + ": transition-generated Continue snapshot rejected");
                // Releasing a held weapon is not selection. A subsequent fresh Enter is.
                release();
                tick();
                assert(!menu.optionSelectedFlag, scenario.name + ": release selected YES");
                if (restoredChoice === "no") {
                    key("keydown", "KeyS", "s");
                    tick();
                    key("keyup", "KeyS", "s");
                    tick();
                }
                key("keydown", "Enter", "Enter");
                tick();
                key("keyup", "Enter", "Enter");
                assert(menu.optionSelectedFlag && menu.selectedIndex === (restoredChoice === "no" ? 1 : 0), scenario.name + ": fresh selection failed");
                for (let i = 0; i < 60; i++) tick();
                const restarted = currentMode();
                const restartedSong = currentSong();
                if (restoredChoice === "no") {
                    assert(restarted instanceof IntroMode, "Fresh NO did not return to Intro");
                    assert(currentSong() !== main.continueSong, "NO retained Continue music");
                } else {
                    assert(restarted instanceof GameMode && restarted !== world, scenario.name + ": YES reused old world");
                    assert(
                        restartedSong !== null && restartedSong !== main.continueSong && restartedSong.playing,
                        scenario.name + ": restarted level has no active song"
                    );
                }
            } finally {
                unwind(mark);
            }
        }
    } finally {
        try {
            release();
            main.buttonMapping.copyFrom(mapping);
        } finally {
            unwind(0);
            input.resume();
            main.setBrowserSuspended(false);
        }
    }
}

/** Every source-generated active fade index survives a new Main/container. */
async function verifyFadeRestoreMatrix(runtime: PreparedRuntime): Promise<void> {
    const store = new runtime.JackalGameStateStore("browser-verification");
    const serializer = new JackalGameStateSerializer();
    const slot = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    const clock = Object.getOwnPropertyDescriptor(runtime.slick.Sys, "getTime");
    assert(clock !== undefined, "Missing fade clock");
    let now = runtime.slick.Sys.getTime();
    let mounted: MountedGame | null = null;
    const tick = (count = 1): void => {
        assert(mounted !== null, "Missing fade runtime");
        mounted.container.getInput().poll(1024, 960);
        mounted.main.nextFrameTime = now - (count - 1) * 10;
        mounted.main.update(mounted.container, count * 10);
        now += 10;
    };
    const retire = (): void => {
        destroyMounted(runtime, mounted);
        mounted = null;
    };
    try {
        Object.defineProperty(runtime.slick.Sys, "getTime", { configurable: true, value: () => now });
        for (const [stage, completion] of [
            [0, false],
            [1, false],
            [1, true],
            [5, true]
        ] as const) {
            mounted = await mountGame(runtime, false);
            mounted.container.setLoopSuspended(true);
            const source = mounted.main;
            source.startPlayer();
            source.stageIndex = stage;
            source.continued = true;
            source.fading = false;
            source.fadeListener = null;
            source.requestMode(Modes.GAME, mounted.container);
            const world = source.mode;
            assert(world instanceof GameMode, "Missing source world");
            assert(source.fading && !source.fadeOut && source.fadeListener === null, "Source entrance ownership");
            assert(world.playing, "PLAYER/continued CHINOOK did not activate player");
            if (completion) {
                while (source.fading) tick();
                world.stageCompleted();
                for (let i = 0; i < GameMode.STAGE_COMPLETED_DELAY; i++) tick();
                assert(source.fading && source.fadeOut && source.fadeListener === world, "Source completion ownership");
            }
            const saves: Array<{ raw: string; index: number; requested: string | null }> = [];
            while (source.mode === world && source.fading) {
                if (completion) assert(world.stageCompletedFlag && world.stageCompletedDelay === 0, "Completion delay underflow before save");
                const snapshot = serializer.createSnapshot(source, "fade-matrix");
                assert(
                    isSupportedGameStateSnapshot(snapshot) && serializer.isSupportedSnapshotForLoadedResources(source, snapshot),
                    "Source fade snapshot invalid"
                );
                assert(store.save(source, () => true).saved, "Source fade store save failed");
                const raw = localStorage.getItem(slot);
                assert(raw !== null, "Missing saved fade bytes");
                saves.push({ raw, index: source.fadeIndex, requested: snapshot.requestedSongId });
                tick();
            }
            assert(saves.length === 23 && new Set(saves.map((s) => s.index)).size === 23, "Missing active fade indices");
            retire();
            for (const saved of saves) {
                localStorage.setItem(slot, saved.raw);
                mounted = await mountGame(runtime, true, (fresh) => {
                    assert(fresh !== source, "Restore reused source Main");
                    assert(fresh.mode instanceof GameMode, "Fade did not restore GameMode");
                    assert(fresh.fading && fresh.fadeOut === completion && fresh.fadeIndex === saved.index, "Fade state changed on restore");
                    assert(fresh.fadeListener === (completion ? fresh.mode : null), "Restored fade callback owner is wrong");
                });
                mounted.container.setLoopSuspended(true);
                const fresh = mounted.main;
                const restored = fresh.mode;
                assert(restored instanceof GameMode, "Missing restored gameplay");
                const requested = fresh.requestMode;
                const destinations: Modes[] = [];
                fresh.requestMode = (mode, gc) => {
                    destinations.push(mode);
                    requested.call(fresh, mode, gc);
                };
                try {
                    const remaining = completion ? 23 - saved.index : saved.index + 1;
                    // Alternating first-tick and later catch-up completion. All
                    // elapsed ticks are real Main fixed updates with its normal cap.
                    const catchup = remaining > 1 && saved.index % 2 === 0 ? 2 : 1;
                    for (let i = 0; i < remaining - catchup; i++) tick();
                    tick(catchup);
                    if (completion) {
                        assert(destinations.length === 1, "Completion callback did not run exactly once");
                        assert(
                            stage === 5 ? destinations[0] === Modes.SUNSET : [Modes.HERE, Modes.YEAH, Modes.WE_MADE_IT].includes(destinations[0]!),
                            "Wrong completion destination"
                        );
                        tick();
                        assert(destinations.length === 1, "Completion repeated");
                    } else {
                        assert(destinations.length === 0 && fresh.mode === restored && !fresh.fading, "Entrance became a cutscene");
                        assert(restored.stageIndex === stage && restored.playing, "Entrance gameplay changed");
                        const recaptured = serializer.createSnapshot(fresh, "fade-matrix");
                        assert(
                            recaptured.requestedSongId === saved.requested && fresh.currentSong === fresh.requestedSong,
                            "Entrance stage song ownership changed"
                        );
                    }
                    const result = serializer.createSnapshot(fresh, "fade-matrix");
                    assert(
                        isSupportedGameStateSnapshot(result) && serializer.isSupportedSnapshotForLoadedResources(fresh, result),
                        "Continued fade snapshot invalid"
                    );
                } finally {
                    fresh.requestMode = requested;
                }
                retire();
            }
        }
        console.log("Jackal fade matrix passed: 92 fresh restores, every index, PLAYER/CHINOOK and ordinary/final completion.");
    } finally {
        retire();
        store.clear(() => true);
        Object.defineProperty(runtime.slick.Sys, "getTime", clock);
    }
}
/** Actual Slick polling through repeated remapping, persistence and fresh restore. */
async function verifyNesMapping(runtime: PreparedRuntime): Promise<void> {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
    const pad = {
        id: "nes-mapping-contract-pad",
        index: 0,
        connected: true,
        mapping: "standard",
        timestamp: 1,
        axes: [0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }))
    };
    let invalid = false;
    let mounted: MountedGame | null = null;
    const store = new runtime.JackalGameStateStore("nes-mapping");
    const mappingStore = new JackalInputMappingStore();
    const serializer = new JackalGameStateSerializer();
    let writes = 0;
    const mode = (): InputMode => {
        assert(mounted?.main.mode instanceof InputMode, "NES fixture lost editor");
        return mounted.main.mode;
    };
    const tick = (): void => {
        assert(mounted !== null, "NES fixture unmounted");
        pad.timestamp++;
        mounted.container.getInput().poll(1024, 960);
        mounted.main.input.snap();
        mode().update(mounted.container);
    };
    const hardware = (binding: number | null): void => {
        for (const b of pad.buttons) {
            b.pressed = b.touched = false;
            b.value = 0;
        }
        if (binding !== null) {
            const b = pad.buttons[binding < 0 ? 10 - binding : binding]!;
            b.pressed = b.touched = true;
            b.value = 1;
        }
    };
    const ready = (): void => {
        for (let i = 0; i < 45 && (mode().armDelay > 0 || mode().state === InputMode.STATE_READ_FADE); i++) tick();
    };
    const press = (binding: number): void => {
        hardware(null);
        tick();
        ready();
        hardware(binding);
        tick();
    };
    const save = (): void => {
        assert(mounted !== null, "Missing mapping runtime");
        const snapshot = serializer.createSnapshot(mounted.main, "nes-mapping");
        assert(
            isSupportedGameStateSnapshot(snapshot) && serializer.isSupportedSnapshotForLoadedResources(mounted.main, snapshot),
            "NES editor snapshot invalid"
        );
        assert(store.save(mounted.main, () => true).saved, "NES editor save failed");
        assert(snapshot.kind === "mode" && snapshot.modeExtra !== null && "input" in snapshot.modeExtra, "Expected INPUT save");
        const old = structuredClone(snapshot);
        assert(old.modeExtra !== null && "input" in old.modeExtra, "Missing cloned editor state");
        const extra = old.modeExtra.input;
        Reflect.set(extra, "assignedControllerButtons", extra.assignedControllerBindings);
        Reflect.deleteProperty(extra, "assignedControllerBindings");
        assert(!isSupportedGameStateSnapshot(old), "Old assigned-property alias accepted");
    };
    const attachWriter = (main: RuntimeMain): void => {
        main.inputMappingChangedHandler = () => {
            writes++;
            return mappingStore.save(main.buttonMapping, () => true);
        };
    };
    try {
        Object.defineProperty(navigator, "getGamepads", {
            configurable: true,
            value: () => {
                if (invalid) throw new Error("Injected enumeration failure");
                return [pad];
            }
        });
        mounted = await mountGame(runtime, false);
        mounted.container.setLoopSuspended(true);
        attachWriter(mounted.main);
        mounted.main.requestMode(Modes.INPUT, mounted.container);
        for (let i = 0; i < 40 && mounted.main.fading; i++) {
            mounted.main.nextFrameTime = 0;
            mounted.main.update(mounted.container, 17);
        }
        assert(mode().state === InputMode.STATE_MENU, "Input menu did not open");
        pad.mapping = "";
        pad.id = "nonstandard-raw-pad";
        hardware(null);
        mounted.container.getInput().poll(1024, 960);
        for (const raw of [12, 13, 14, 15]) {
            hardware(raw);
            const input = mounted.container.getInput();
            input.poll(1024, 960);
            assert(input.isButtonPressed(raw, 0) && !input.isControllerButtonDirectional(raw, 0), "Nonstandard browser button stays raw");
            assert(
                !input.isControllerUp(0) && !input.isControllerDown(0) && !input.isControllerLeft(0) && !input.isControllerRight(0),
                "Native fallback leaked into browser"
            );
            hardware(null);
            input.poll(1024, 960);
        }
        pad.mapping = "standard";
        pad.id = "nes-mapping-contract-pad";
        mounted.container.getInput().poll(1024, 960);
        mounted.container.getInput().clearControlPressedRecord();
        await verifyCompactLabels(mounted);
        const wanted = [7, 6, 3, 0, -2, -3, -4];
        for (let cycle = 0; cycle < 2; cycle++) {
            hardware(null);
            tick();
            mode().optionSelected(InputMode.OPTION_CHANGE);
            ready();
            for (let i = 0; i < wanted.length; i++) {
                press(wanted[i]!);
                assert(mode().state === InputMode.STATE_READ_FADE, `NES capture ${cycle}/${i}`);
                save();
                ready();
            }
            assert(writes === cycle + 1 && mode().state === InputMode.STATE_SAVED, "Repeated mapping did not commit once");
            save();
            const stored = JSON.parse(localStorage.getItem(getDeploymentStorageKey("jackal.input-mapping"))!);
            assert(
                stored.version === 4 && stored.controllerGrenade === -2 && stored.controllerGun === -3 && stored.controllerStart === -4,
                "Wrong stored NES map"
            );
            for (let i = 0; i < InputMode.DONE_DELAY + 3; i++) tick();
            assert(
                mode().state === InputMode.STATE_MENU && mode().menu.selectedIndex === InputMode.OPTION_DONE && !mode().menu.selectionMade,
                "Held final control activated review"
            );
        }
        hardware(null);
        tick();
        mode().optionSelected(InputMode.OPTION_CHANGE);
        ready();
        press(6);
        assert(mode().draftButtonMapping.controllerDown === -1, "Old future owner not displaced");
        ready();
        const before = JSON.stringify(mode().draftButtonMapping);
        press(6);
        assert(mode().message === "ALREADY USED" && mode().nameIndex === 1 && JSON.stringify(mode().draftButtonMapping) === before, "Duplicate changed draft");
        save();
        hardware(null);
        tick();
        const oldMain = mounted.main;
        const authority = oldMain.buttonMapping.clone();
        destroyMounted(runtime, mounted);
        mounted = null;
        let restored = false;
        mounted = await mountGame(
            runtime,
            true,
            (fresh) => {
                restored = true;
                assert(fresh !== oldMain, "Reused Main");
            },
            (fresh) => {
                fresh.buttonMapping.copyFrom(authority);
                attachWriter(fresh);
            }
        );
        mounted.container.setLoopSuspended(true);
        assert(
            restored && mode().nameIndex === 1 && mode().draftButtonMapping.controllerDown === -1 && writes === 2,
            "Mid-editor restore lost transaction or replayed preference commit"
        );
        assert(JSON.stringify(mounted.main.buttonMapping) === JSON.stringify(authority), "Editor restore replaced session authority");
        for (const binding of [7, 0, 3, -3, -2, -5]) {
            press(binding);
            assert(mode().state === InputMode.STATE_READ_FADE, "Restored capture rejected");
            save();
            ready();
        }
        assert(Number(writes) === 3, "Fresh editor completion did not commit exactly once");
        save();
        for (let i = 0; i < InputMode.DONE_DELAY + 3; i++) tick();
        assert(mode().state === InputMode.STATE_MENU, "Restored review failed");
        await verifyCompactLabels(mounted);
        // Logical A drives menu Done. The held final Start was not an activation.
        press(-3);
        assert(mode().state === InputMode.STATE_FADE_OUT, "Logical A did not confirm Done");
        hardware(null);
        mounted.container.getInput().poll(1024, 960);
        mounted.main.buttonMapping.copyFrom(authority);
        mounted.main.startPlayer();
        mounted.main.stageIndex = 1;
        mounted.main.continued = true;
        mounted.main.fading = false;
        mounted.main.fadeListener = null;
        mounted.main.requestMode(Modes.GAME, mounted.container);
        for (let i = 0; i < 30; i++) {
            mounted.main.nextFrameTime = 0;
            mounted.main.update(mounted.container, 10);
        }
        const world = mounted.main.mode;
        assert(world instanceof GameMode && world.playing && mounted.main.isSongPlaying(), "Pause fixture is not eligible gameplay");
        const sample = (): void => {
            pad.timestamp++;
            mounted!.container.getInput().poll(1024, 960);
            mounted!.main.input.snap();
        };
        hardware(-2);
        sample();
        assert(mounted.main.input.isFire() && !mounted.main.input.isUp(), "Logical A gameplay meaning");
        assert(mounted.main.input.isEnter(), "Logical A confirm edge missing");
        hardware(-3);
        sample();
        assert(mounted.main.input.isShoot() && !mounted.main.input.isDown(), "Logical B gameplay meaning");
        assert(mounted.main.input.isEnter(), "Logical B confirm edge missing");
        hardware(7);
        sample();
        assert(mounted.main.input.isUp() && !mounted.main.input.isEnter(), "Mapped raw movement also confirmed");
        hardware(null);
        sample();
        hardware(-4);
        sample();
        world.update(mounted.container);
        assert(world.paused, "Logical Start did not pause");
        sample();
        world.update(mounted.container);
        assert(world.paused, "Held Start unpaused");
        hardware(null);
        sample();
        world.update(mounted.container);
        hardware(-4);
        sample();
        world.update(mounted.container);
        assert(!world.paused, "Fresh Start did not unpause");
        // Same-slot replacement and invalid samples preserve quarantine, without a hidden neutral poll.
        hardware(-2);
        pad.id = "nes-replacement";
        sample();
        assert(!mounted.main.input.isFire(), "Replacement held A leaked");
        invalid = true;
        hardware(null);
        sample();
        invalid = false;
        hardware(-2);
        sample();
        assert(!mounted.main.input.isFire(), "Invalid enumeration manufactured release");
        hardware(null);
        sample();
        hardware(-2);
        sample();
        assert(mounted.main.input.isFire(), "First fresh replacement A lost");
    } finally {
        invalid = false;
        destroyMounted(runtime, mounted);
        store.clear(() => true);
        if (descriptor) Object.defineProperty(navigator, "getGamepads", descriptor);
        else Reflect.deleteProperty(navigator, "getGamepads");
    }
}

async function verifyCompactLabels(mounted: MountedGame): Promise<void> {
    const { main, container } = mounted;
    const original = main.buttonMapping.clone();
    const input = container.getInput();
    const canvas = gameHost.querySelector("canvas");
    assert(canvas !== null, "Label canvas");
    canvas.focus();
    const mode = main.mode;
    assert(mode instanceof InputMode, "Label editor mode");
    const owner = mode;
    const refreshName = "refreshInputMappingLines";
    const linesName = "inputMappingLines";
    const xName = "inputMappingX";
    const cell = 32,
        left = 0,
        right = 1024;
    const refresh = (): void => {
        const f = Reflect.get(owner, refreshName);
        assert(typeof f === "function", "Production cache refresher");
        f.call(owner);
    };
    try {
        const variants = [
            ["ControlLeft", Input.KEY_LCONTROL],
            ["ControlRight", Input.KEY_RCONTROL],
            ["AltLeft", Input.KEY_LALT],
            ["AltRight", Input.KEY_RALT],
            ["ShiftLeft", Input.KEY_LSHIFT],
            ["ShiftRight", Input.KEY_RSHIFT],
            ["MetaLeft", Input.KEY_LWIN],
            ["MetaRight", Input.KEY_RWIN],
            ["Enter", Input.KEY_ENTER],
            ["NumpadEnter", Input.KEY_NUMPADENTER],
            ["Digit1", Input.KEY_1],
            ["Numpad1", Input.KEY_NUMPAD1],
            ["Equal", Input.KEY_EQUALS],
            ["NumpadAdd", Input.KEY_ADD],
            ["NumpadDivide", Input.KEY_DIVIDE],
            ["BracketLeft", Input.KEY_LBRACKET],
            ["Backslash", Input.KEY_BACKSLASH]
        ] as const;
        for (const [code, key] of variants) {
            canvas.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true }));
            input.poll(1024, 960);
            assert(input.isKeyDown(key), `Real DOM code ${code}`);
            main.buttonMapping.keyUp = key;
            refresh();
            const lines: unknown = Reflect.get(owner, linesName);
            assert(Array.isArray(lines) && typeof lines[0] === "string" && lines[0].includes(ButtonMapping.getKeyText(key)), `Actual row for ${code}`);
            canvas.dispatchEvent(new KeyboardEvent("keyup", { code, key: code, bubbles: true }));
            input.poll(1024, 960);
        }
        for (let key = -1; key < 256; key++)
            for (const c of ButtonMapping.getKeyText(key)) {
                assert(main.fonts[0]![c.charCodeAt(0)] !== null && main.fonts[0]![c.charCodeAt(0)] !== undefined, `Loaded bitmap glyph ${c}`);
            }
        for (const row of NesInputProfile.INPUTS) {
            main.buttonMapping[row.key] = Input.KEY_SEMICOLON;
            main.buttonMapping[row.controller] = -5;
        }
        refresh();
        const lines: unknown = Reflect.get(owner, linesName);
        const x: unknown = Reflect.get(owner, xName);
        assert(Array.isArray(lines) && lines.length === NesInputProfile.INPUTS.length && typeof x === "number", "Actual mapping cache shape");
        for (const line of lines) {
            assert(
                typeof line === "string" && line.includes("SEMICOLON") && line.includes("GP-RIGHT") && x >= left && x + line.length * cell <= right,
                "Painted mapping row bounds"
            );
            for (const c of line) assert(main.fonts[0]![c.charCodeAt(0)] !== null && main.fonts[0]![c.charCodeAt(0)] !== undefined, `Loaded row glyph ${c}`);
        }

        const originalWidth = container.getWidth(),
            originalHeight = container.getHeight();
        const bodyStyle = document.body.getAttribute("style");
        document.body.style.margin = "0";
        document.body.style.overflow = "hidden";
        const update = main.update;
        main.update = () => {};
        try {
            container.setLoopSuspended(false);
            await new Promise<void>((resolve) => {
                Reflect.set(window, "compactLabelCapture", {
                    game: "jackal",
                    resolve,
                    resize: async (width: number, height: number): Promise<void> => {
                        await container.setDisplayMode(width, height, false);
                    }
                });
            });
        } finally {
            container.setLoopSuspended(true);
            main.update = update;
            await container.setDisplayMode(originalWidth, originalHeight, false);
            if (bodyStyle === null) document.body.removeAttribute("style");
            else document.body.setAttribute("style", bodyStyle);
        }
    } finally {
        main.buttonMapping.copyFrom(original);
        refresh();
        input.clearKeyPressedRecord();
        input.clearControlPressedRecord();
    }
}
