import { BossStatuesManager } from "./jackal/BossStatuesManager.js";
import { BossHelicopterManager } from "./jackal/BossHelicopterManager.js";
import { BossHeadquartersManager } from "./jackal/BossHeadquartersManager.js";
import { Triggers } from "./jackal/Triggers.js";
import { GrayJeep } from "./jackal/GrayJeep.js";
import { BossHeadquarters } from "./jackal/BossHeadquarters.js";
import { CutsceneSequence } from "./jackal/CutsceneSequence.js";
import type { ArrayList } from "./java/JavaRuntime.js";
import { FlashingSkull } from "./jackal/FlashingSkull.js";
import { BossBlueTank } from "./jackal/BossBlueTank.js";
import { BossBlueTanksManager } from "./jackal/BossBlueTanksManager.js";
import { BossShipManager } from "./jackal/BossShipManager.js";
import { BossShipGun } from "./jackal/BossShipGun.js";
import { BossGarageManager } from "./jackal/BossGarageManager.js";
import { BossGarage } from "./jackal/BossGarage.js";
import { BossSuperTank } from "./jackal/BossSuperTank.js";
import { Gate } from "./jackal/Gate.js";
import { PlayerMissile } from "./jackal/PlayerMissile.js";
import { AttackSource } from "./jackal/AttackSource.js";
import { Enemy } from "./jackal/Enemy.js";
import { referenceEnemySoldier, referenceBossHelicopter } from "./RenderPauseReferences.js";
import { LasersManager } from "./jackal/LasersManager.js";
import { Flame } from "./jackal/Flame.js";
import { Fire } from "./jackal/Fire.js";
import { FloorGun } from "./jackal/FloorGun.js";
import { Star } from "./jackal/Star.js";
import { BossHelicopter } from "./jackal/BossHelicopter.js";
import { EnemyHelicopter } from "./jackal/EnemyHelicopter.js";
import { EnemySoldierType } from "./jackal/EnemySoldierType.js";
import { EnemySoldier } from "./jackal/EnemySoldier.js";
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
import type { JackalGameStateSnapshot } from "./jackal/persistence/GameStateSnapshot.js";
import { GAME_STATE_STORAGE_KEY, GAME_STATE_VERSION } from "./jackal/persistence/GameStateSchema.js";
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
        if (new URL(location.href).searchParams.get("suite") === "last-life-arbitration") {
            await verifyLastLifeArbitration(runtime);
            return;
        }
        if (new URL(location.href).searchParams.get("suite") === "last-life-music") {
            await verifyLastLifeMusicResume(runtime);
            return;
        }
        if (new URL(location.href).searchParams.get("suite") === "boss-entry-last-life") {
            await verifyBossEntryLastLife(runtime);
            return;
        }
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
            assert(restoredMain.currentSong?.lastLifeSuspended === true && !restoredMain.isSongPlaying(), "Death reload lost silent held-song intent");
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
        await verifyGameplayPauseFadePolicy(runtime);
        await verifyLastLifeArbitration(runtime);
        await verifyBossEntryLastLife(runtime);
        await verifySaveSemanticCutover(runtime);
        await verifyLastLifeMusicResume(runtime);
        await verifyPausedWorldRendering(runtime);
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
                assert(
                    currentSong()?.lastLifeSuspended === true && requestedSong() === currentSong() && !main.isSongPlaying(),
                    scenario.name + ": death did not hold interrupted song"
                );
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
        pad.axes[0] = pad.axes[1] = 0;
        if (binding !== null && binding < 0 && pad.mapping !== "standard") {
            pad.axes[binding === -2 || binding === -3 ? 1 : 0] = binding === -2 || binding === -4 ? -1 : 1;
        } else if (binding !== null) {
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
        let resets = 0;
        const wanted = [7, 6, 3, 0, -2, -3, -4];
        for (let cycle = 0; cycle < 2; cycle++) {
            pad.mapping = cycle === 0 ? "standard" : "";
            hardware(null);
            tick();
            mode().optionSelected(InputMode.OPTION_RESET);
            resets++;
            assert(writes === cycle + resets, "Reset must persist once under either style");
            verifyGamepadLabelTransitions(mounted);
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
            assert(writes === cycle + 1 + resets && mode().state === InputMode.STATE_SAVED, "Repeated mapping did not commit once");
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
        const mappingBeforeRestore = JSON.stringify(mounted.main.buttonMapping);
        const writesBeforeRestore = writes;
        pad.mapping = "standard";
        assert(store.restore(mounted.main, mounted.container), "Same-instance editor restore failed");
        assert(
            JSON.stringify(mounted.main.buttonMapping) === mappingBeforeRestore && writes === writesBeforeRestore,
            "Same-instance restore changed mapping authority or persisted"
        );
        verifyGamepadLabelTransitions(mounted);
        pad.mapping = "";
        mounted.container.getInput().poll(1024, 960);
        save();
        const oldMain = mounted.main;
        const authority = oldMain.buttonMapping.clone();
        pad.mapping = "standard";
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
            restored && mode().nameIndex === 1 && mode().draftButtonMapping.controllerDown === -1 && writes === 2 + resets,
            "Mid-editor restore lost transaction or replayed preference commit"
        );
        assert(JSON.stringify(mounted.main.buttonMapping) === JSON.stringify(authority), "Editor restore replaced session authority");
        for (const binding of [7, 0, 3, -3, -2, -5]) {
            press(binding);
            assert(mode().state === InputMode.STATE_READ_FADE, "Restored capture rejected");
            save();
            ready();
        }
        assert(Number(writes) === 3 + resets, "Fresh editor completion did not commit exactly once");
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
    verifyGamepadLabelTransitions(mounted);
    const provider = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
    const labelPad = {
        id: "label-presentation",
        index: 0,
        connected: true,
        mapping: "standard",
        axes: [0, 0],
        timestamp: 1,
        buttons: Array.from({ length: 64 }, () => ({ pressed: false, touched: false, value: 0 }))
    };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [labelPad] });
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
        for (const standard of [false, true])
            for (const binding of [-6, -5, -4, -3, -2, -1, ...Array.from({ length: 64 }, (_, i) => i)]) {
                for (const c of ButtonMapping.getGamepadButtonText(binding, standard))
                    assert(main.fonts[0]![c.charCodeAt(0)] !== null && main.fonts[0]![c.charCodeAt(0)] !== undefined, `Loaded controller glyph ${c}`);
            }
        for (const standard of [false, true]) {
            labelPad.mapping = standard ? "standard" : "";
            input.poll(1024, 960);
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
                for (const c of line)
                    assert(main.fonts[0]![c.charCodeAt(0)] !== null && main.fonts[0]![c.charCodeAt(0)] !== undefined, `Loaded row glyph ${c}`);
            }
        }
        const rawBindings = [0, 2, 9, 15, 17, 63, 12];
        for (let i = 0; i < NesInputProfile.INPUTS.length; i++) main.buttonMapping[NesInputProfile.INPUTS[i]!.controller] = rawBindings[i]!;
        refresh();
        for (const presentation of ["standard", "generic", "transition"] as const) {
            labelPad.mapping = presentation === "generic" ? "" : "standard";
            input.poll(1024, 960);
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
                        game: "jackal-" + presentation,
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
        }
    } finally {
        if (provider) Object.defineProperty(navigator, "getGamepads", provider);
        else Reflect.deleteProperty(navigator, "getGamepads");
        input.poll(1024, 960);
        main.buttonMapping.copyFrom(original);
        refresh();
        input.clearKeyPressedRecord();
        input.clearControlPressedRecord();
    }
}

/** Real polled metadata must refresh the actual renderer without a cache-dirty shortcut. */
function verifyGamepadLabelTransitions(mounted: MountedGame): void {
    const { main, container } = mounted;
    const input = container.getInput();
    const owner: RuntimeMain["mode"] = main.mode;
    assert(owner instanceof InputMode, "Label transition fixture requires InputMode");
    const provider = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
    const disabled = Reflect.get(Input, "controllersDisabled");
    const nativeSet = Storage.prototype.setItem;
    const notification = Object.getOwnPropertyDescriptor(main, "notifyInputMappingChanged");
    let writes = 0,
        notifications = 0,
        fail = false;
    const pad = {
        id: "unbranded-label-fixture",
        index: 3,
        connected: true,
        mapping: "standard",
        timestamp: 1,
        axes: [0, 0],
        buttons: Array.from({ length: 64 }, () => ({ pressed: false, touched: false, value: 0 }))
    };
    const second = { ...pad, index: 5, buttons: pad.buttons.map((b) => ({ ...b })) };
    let pads: (typeof pad | null)[] = [];
    const state = () =>
        JSON.stringify({
            mapping: main.buttonMapping,
            workflow:
                main.mode instanceof InputMode
                    ? {
                          draft: main.mode.draftButtonMapping,
                          keys: [...main.mode.assignedKeys],
                          bindings: [...main.mode.assignedControllerBindings],
                          step: main.mode.nameIndex,
                          state: main.mode.state
                      }
                    : null
        });
    const before = state();
    const preferences = JSON.stringify(Object.entries(localStorage).sort());
    const draw = (standard: boolean): void => {
        const render = Reflect.get(owner, "renderInputMenu");
        assert(typeof render === "function", "Real Input renderer");
        render.call(owner, container, container.getGraphics());
        const rows: unknown = Reflect.get(owner, "inputMappingLines");
        assert(Array.isArray(rows), "Rendered row cache");
        for (let i = 0; i < NesInputProfile.INPUTS.length; i++) {
            const binding = main.buttonMapping[NesInputProfile.INPUTS[i]!.controller];
            assert(rows[i].endsWith(", " + ButtonMapping.getGamepadButtonText(binding, standard)), "Automatic label refresh " + rows[i]);
        }
        assert(state() === before, "Label rendering changed mapping/editor transaction");
        assert(writes === 0 && notifications === 0 && JSON.stringify(Object.entries(localStorage).sort()) === preferences, "Label rendering persisted state");
    };
    const sample = (standard: boolean): void => {
        pad.timestamp++;
        input.poll(1024, 960);
        draw(standard);
    };
    try {
        Reflect.set(Input, "controllersDisabled", false);
        Object.defineProperty(navigator, "getGamepads", {
            configurable: true,
            value: () => {
                if (fail) throw new Error("label enumeration");
                return pads;
            }
        });
        Storage.prototype.setItem = function (key, value) {
            writes++;
            return nativeSet.call(this, key, value);
        };
        Object.defineProperty(main, "notifyInputMappingChanged", {
            configurable: true,
            value: () => {
                notifications++;
                return { saved: false, reason: "unavailable" };
            }
        });
        sample(false);
        pads = [null, null, null, pad];
        sample(true);
        assert(input.getControllerCount() === 1 && input.getControllerMapping(0) === "standard", "Sparse browser indexes must become dense Slick slots");
        pads = [null, pad, null, second];
        sample(true);
        second.mapping = "";
        sample(false);
        pads = [second, null, pad];
        sample(false);
        pad.mapping = "";
        sample(false);
        pads = [pad];
        pad.mapping = "standard";
        sample(true);
        pad.mapping = "";
        sample(false);
        pad.mapping = "standard";
        sample(true);
        const topology = input.getControllerSampleStatus().topologyGeneration;
        fail = true;
        sample(false);
        assert(input.getControllerSampleStatus().topologyGeneration === topology, "Invalid sample changed topology fixture");
        fail = false;
        sample(true);
        Input.disableControllers();
        sample(false);
        Reflect.set(Input, "controllersDisabled", false);
        sample(true);
        input.poll(1024, 960);
        for (const raw of [0, 12, 13, 14, 15, 17, 63]) {
            pad.buttons[raw]!.pressed = true;
            pad.buttons[raw]!.value = 1;
            input.poll(1024, 960);
            assert(input.isButtonPressed(raw, 0), "Fresh physical button before label draw");
            const control = raw >= 12 && raw <= 15 ? [2, 3, 0, 1][raw - 12]! : 4 + raw;
            draw(true);
            assert(input.isButtonPressed(raw, 0) && input.isControlPressed(control, 0), `Label draw changed physical level or drained edge ${raw}`);
            assert(!input.isControlPressed(control, 0), "Press must remain consumptive");
            pad.buttons[raw]!.pressed = false;
            pad.buttons[raw]!.value = 0;
            input.poll(1024, 960);
        }
        pads = [];
        sample(false);
    } finally {
        for (const b of pad.buttons) {
            b.pressed = false;
            b.value = 0;
        }
        fail = false;
        pads = [];
        input.poll(1024, 960);
        if (provider) Object.defineProperty(navigator, "getGamepads", provider);
        else Reflect.deleteProperty(navigator, "getGamepads");
        Reflect.set(Input, "controllersDisabled", disabled);
        Storage.prototype.setItem = nativeSet;
        if (notification) Object.defineProperty(main, "notifyInputMappingChanged", notification);
        else Reflect.deleteProperty(main, "notifyInputMappingChanged");
        input.poll(1024, 960);
    }
}

/** Controlled production Main ticks, real polled input and fresh persistence. */
async function verifyGameplayPauseFadePolicy(runtime: PreparedRuntime): Promise<void> {
    const clock = Object.getOwnPropertyDescriptor(runtime.slick.Sys, "getTime");
    const provider = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
    assert(clock !== undefined, "Missing pause/fade clock");
    const store = new runtime.JackalGameStateStore("browser-verification");
    const serializer = new JackalGameStateSerializer();
    const slot = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    const pad = {
        id: "pause-policy",
        index: 0,
        connected: true,
        mapping: "standard",
        timestamp: 1,
        axes: [0, 0],
        buttons: Array.from({ length: 64 }, () => ({ pressed: false, touched: false, value: 0 }))
    };
    let now = runtime.slick.Sys.getTime(),
        mounted: MountedGame | null = null;
    const current = (): MountedGame => {
        assert(mounted !== null, "Pause policy runtime missing");
        return mounted;
    };
    const world = (): GameMode => {
        const w = current().main.mode;
        assert(w instanceof GameMode, "Pause policy world missing");
        return w;
    };
    const diagnostic = (): string => {
        const { main } = current();
        return JSON.stringify({
            now,
            deadline: main.nextFrameTime,
            index: main.fadeIndex,
            fading: main.fading,
            out: main.fadeOut,
            paused: main.mode instanceof GameMode && main.mode.paused,
            mode: main.mode?.constructor.name,
            music: main.currentSong?.playing
        });
    };
    const check = (condition: unknown, message: string): void => assert(condition, `${message}: ${diagnostic()}`);
    const tick = (elapsed = 10): void => {
        now += elapsed;
        const { main, container } = current();
        pad.timestamp++;
        container.getInput().poll(1024, 960);
        main.update(container, elapsed);
    };
    const project = (): string => {
        const s = serializer.createSnapshot(current().main, "pause-projection");
        assert(s.kind === "game", "Pause projection requires world");
        const fields = { ...s.gameMode.fields };
        delete fields.paused;
        return JSON.stringify({
            world: { ...s.gameMode, fields },
            player: s.playerFields,
            random: s.random,
            score: s.mainFields.score,
            lives: s.mainFields.extraLives
        });
    };
    const key = (down: boolean): void => {
        const { main } = current();
        const canvas = gameHost.querySelector("canvas");
        assert(canvas !== null, "Pause canvas");
        canvas.focus();
        const names: Array<[number, string]> = [
            [Input.KEY_ENTER, "Enter"],
            [Input.KEY_SPACE, "Space"],
            [Input.KEY_NUMPADENTER, "NumpadEnter"]
        ];
        for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") names.push([Reflect.get(Input, "KEY_" + letter) as number, "Key" + letter]);
        const code = names.find(([value]) => value === main.buttonMapping.keyStart)?.[1];
        assert(code !== undefined, "Fixture Start has no DOM code");
        canvas.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, key: code === "Enter" ? "Enter" : code, bubbles: true }));
    };
    const hardware = (down: boolean): void => {
        const binding = current().main.buttonMapping.controllerStart;
        const b = pad.buttons[binding < 0 ? 10 - binding : binding];
        assert(b !== undefined, "Mapped Start button");
        b.pressed = b.touched = down;
        b.value = down ? 1 : 0;
    };
    const transport = (): string => {
        const song = current().main.currentSong;
        assert(song !== null && song.playing, "Paused active Song");
        return JSON.stringify([song.playedIntro2, ...[song.intro, song.intro2, song.loop].map((m) => m?.getTransportState() ?? null)]);
    };
    const retire = (): void => {
        if (mounted !== null) {
            key(false);
            hardware(false);
            mounted.container.getInput().poll(1024, 960);
        }
        destroyMounted(runtime, mounted);
        mounted = null;
    };
    const enter = async (stage = 1, continued = true): Promise<void> => {
        mounted = await mountGame(runtime, false);
        mounted.container.setLoopSuspended(true);
        const { main, container } = mounted;
        main.startPlayer();
        main.stageIndex = stage;
        main.continued = continued;
        main.fading = false;
        main.fadeListener = null;
        main.requestMode(Modes.GAME, container);
        main.nextFrameTime = now;
        tick(0);
        key(false);
        hardware(false);
        container.getInput().poll(1024, 960);
        main.clearInputPressedRecords();
    };
    const finish = (): void => {
        for (let i = 0; i < 30 && current().main.fading; i++) tick();
        check(!current().main.fading, "Bounded fade completion");
    };
    try {
        Object.defineProperty(runtime.slick.Sys, "getTime", { configurable: true, value: () => now });
        Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
        for (const device of ["keyboard", "gamepad"] as const) {
            await enter();
            const { main } = current();
            const w = world();
            check(w.playing && main.fading && main.fadeListener === null, "Reachable active entrance");
            const press = device === "keyboard" ? key : hardware;
            const frozen = project(),
                index = main.fadeIndex;
            press(true);
            tick(1000); // Intentionally overdue once; all later deadlines are production-owned.
            check(w.paused && main.fadeIndex === index - 1 && main.nextFrameTime === now + 10, "Pause tick ordering and debt reset");
            check(project() === frozen, "Pause acceptance did world work");
            const audio = transport();
            check(audio.includes("paused"), "Pause did not pause active music");
            tick(1);
            check(main.fadeIndex === index - 1, "No-due callback advanced fade");
            tick(9);
            check(w.paused && project() === frozen, "Held Start toggled or advanced world");
            press(false);
            tick();
            check(w.paused, "Release unpaused");
            const savedIndex = main.fadeIndex;
            main.setBrowserSuspended(true);
            for (const elapsed of [1000, 10000, 100000]) {
                tick(elapsed);
                check(main.fadeIndex === savedIndex && main.nextFrameTime === now && project() === frozen, "Strong suspension advanced world/fade");
            }
            main.setBrowserSuspended(false);
            tick(0);
            check(
                w.paused && main.fadeIndex === savedIndex - 1 && main.nextFrameTime === now + 10 && transport() === audio,
                "Retained Continue changed pause/audio or replayed debt"
            );
            if (device === "keyboard") {
                const snapshot = serializer.createSnapshot(main, "paused-fade");
                check(
                    isSupportedGameStateSnapshot(snapshot) && serializer.isSupportedSnapshotForLoadedResources(main, snapshot),
                    "Paused entrance snapshot invalid"
                );
                check(store.save(main, () => true).saved, "Paused entrance save failed");
                const raw = localStorage.getItem(slot),
                    saved = main.fadeIndex,
                    source = main;
                retire();
                mounted = await mountGame(runtime, true, (fresh) => {
                    assert(fresh.gc instanceof runtime.slick.AppGameContainer, "Fresh container boundary");
                    fresh.gc.setLoopSuspended(true);
                    assert(fresh !== source && fresh.mode instanceof GameMode && fresh.mode.paused, "Fresh paused identity");
                    assert(fresh.fading && !fresh.fadeOut && fresh.fadeIndex === saved && fresh.fadeListener === null, "Fresh entrance fade ownership");
                });
                current().container.setLoopSuspended(true);
                check(project() === frozen && transport() === audio, "Fresh paused world/audio changed");
                const restored = world();
                for (let i = 0; i < saved + 1; i++) tick();
                check(
                    !current().main.fading && current().main.fadeIndex === -1 && world() === restored && restored.paused,
                    "Fresh paused fade did not complete"
                );
                check(project() === frozen && transport() === audio && localStorage.getItem(slot) === raw, "Fade completion mutated world/music/save");
                const recaptured = serializer.createSnapshot(current().main, "paused-fade");
                check(
                    isSupportedGameStateSnapshot(recaptured) && serializer.isSupportedSnapshotForLoadedResources(current().main, recaptured),
                    "Post-fade snapshot invalid"
                );
            } else finish();
            check(world().paused && project() === frozen && transport() === audio, "Entrance completion resumed gameplay/audio");
            press(false);
            tick();
            press(true);
            tick();
            check(!world().paused && project() === frozen, "Fresh unpause tick advanced world");
            press(false);
            tick();
            check(project() !== frozen, "Gameplay did not resume");
            retire();
        }
        // Final entrance step completes before the real Pause branch accepts input.
        await enter();
        for (let i = 0; i < 30 && current().main.fadeIndex > 0; i++) tick();
        check(current().main.fadeIndex === 0, "Bounded last entrance step");
        key(true);
        tick();
        check(world().paused && !current().main.fading && current().main.fadeIndex === -1, "Index-zero Pause ordering");
        retire();
        // Continued Chinook is eligible; a normal introduction is not.
        for (const continued of [false, true]) {
            await enter(0, continued);
            check(world().playing === continued, "Chinook entry eligibility");
            key(true);
            tick();
            check(world().paused === continued, "Chinook Pause policy");
            key(false);
            finish();
            retire();
        }
        for (const stage of [1, 5]) {
            await enter(stage);
            finish();
            const w = world(),
                main = current().main;
            w.stageCompleted();
            for (let i = 0; i < GameMode.STAGE_COMPLETED_DELAY; i++) tick();
            check(main.fading && main.fadeOut && main.fadeListener === w, "Transition-generated completion fade");
            const descriptor = Object.getOwnPropertyDescriptor(main, "requestMode"),
                request = main.requestMode,
                destinations: Modes[] = [];
            main.requestMode = (mode, gc) => {
                destinations.push(mode);
                request.call(main, mode, gc);
            };
            try {
                key(true);
                tick();
                check(!w.paused && w.stageCompletedDelay === 0, "Completion accepted Pause or underflowed");
                key(false);
                for (let i = 0; i < 30 && main.mode === w; i++) tick();
                check(
                    destinations.length === 1 &&
                        (stage === 5 ? destinations[0] === Modes.SUNSET : [Modes.HERE, Modes.YEAH, Modes.WE_MADE_IT].includes(destinations[0]!)),
                    "Completion destination count"
                );
                tick();
                check(destinations.length === 1, "Completion callback repeated");
            } finally {
                if (descriptor) Object.defineProperty(main, "requestMode", descriptor);
                else Reflect.deleteProperty(main, "requestMode");
            }
            retire();
        }
        console.log("Jackal gameplay Pause/fade policy passed: real keyboard/pad, debt reset, retained/fresh restore, music and completion ownership.");
    } finally {
        retire();
        store.clear(() => true);
        Object.defineProperty(runtime.slick.Sys, "getTime", clock);
        if (provider) Object.defineProperty(navigator, "getGamepads", provider);
        else Reflect.deleteProperty(navigator, "getGamepads");
    }
}

/** Rare effect states below are explicit loaded-resource fixtures, not natural playthroughs. */
async function verifyPausedWorldRendering(runtime: PreparedRuntime): Promise<void> {
    const clock = Object.getOwnPropertyDescriptor(runtime.slick.Sys, "getTime");
    const provider = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
    assert(clock !== undefined, "Render clock descriptor");
    let now = runtime.slick.Sys.getTime(),
        mounted: MountedGame | null = null;
    const store = new runtime.JackalGameStateStore("browser-verification"),
        serializer = new JackalGameStateSerializer();
    const slot = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    const pad = {
        id: "paused-render",
        index: 0,
        connected: true,
        mapping: "standard",
        timestamp: 1,
        axes: [0, 0],
        buttons: Array.from({ length: 64 }, () => ({ pressed: false, touched: false, value: 0 }))
    };
    const current = (): MountedGame => {
        assert(mounted !== null, "Render runtime missing");
        return mounted;
    };
    const tick = (): void => {
        now += 10;
        const { main, container } = current();
        container.getInput().poll(1024, 960);
        main.update(container, 10);
    };
    const press = (down: boolean): void => {
        const binding = current().main.buttonMapping.controllerStart;
        const b = pad.buttons[binding < 0 ? 10 - binding : binding]!;
        b.pressed = b.touched = down;
        b.value = down ? 1 : 0;
    };
    const render = (): void => {
        const { buffered, container } = current();
        buffered.render(container, container.getGraphics());
        container.getGraphics().flush();
    };
    const projection = (): string => {
        const s = serializer.createSnapshot(current().main, "render-pause");
        assert(s.kind === "game", "Render world snapshot");
        return JSON.stringify({ world: s.gameMode, player: s.playerFields, random: s.random });
    };
    const capture = async (name: string): Promise<void> => {
        const { main, container } = current(),
            update = main.update;
        const bodyStyle = document.body.getAttribute("style");
        document.body.style.margin = "0";
        document.body.style.overflow = "hidden";
        const width = container.getWidth(),
            height = container.getHeight();
        main.update = () => {};
        try {
            container.setLoopSuspended(false);
            await new Promise<void>((resolve) =>
                Reflect.set(window, "compactLabelCapture", { game: name, resolve, resize: (w: number, h: number) => container.setDisplayMode(w, h, false) })
            );
        } finally {
            container.setLoopSuspended(true);
            main.update = update;
            await container.setDisplayMode(width, height, false);
            if (bodyStyle === null) document.body.removeAttribute("style");
            else document.body.setAttribute("style", bodyStyle);
        }
    };
    try {
        Object.defineProperty(runtime.slick.Sys, "getTime", { configurable: true, value: () => now });
        Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
        mounted = await mountGame(runtime, false);
        mounted.container.setLoopSuspended(true);
        const { main, container } = mounted;
        main.startPlayer();
        main.stageIndex = 1;
        main.continued = true;
        main.fading = false;
        main.fadeListener = null;
        main.requestMode(Modes.GAME, container);
        main.nextFrameTime = now;
        for (let i = 0; i < 30 && main.fading; i++) tick();
        assert(!main.fading && main.mode instanceof GameMode, "Renderable ordinary world");
        const world = main.mode,
            x = world.cameraX,
            y = world.cameraY;
        // Real constructor registration and resource arrays, with explicit visual branches.
        const soldier = new EnemySoldier(x + 200, y + 240, EnemySoldierType.STATIONARY);
        soldier.aiming = 12;
        soldier.blink = 3;
        const rotor = new EnemyHelicopter(true);
        rotor.x = x + 350;
        rotor.y = y + 220;
        const boss = new BossHelicopter();
        boss.x = x + 700;
        boss.y = y + 370;
        boss.tailIndex = 3;
        const mine = new Mine(x + 160, y + 400);
        mine.visible = true;
        const star = new Star(x + 260, y + 400, Star.TYPE_FLASHING);
        star.flashingIndex = 2;
        const gun = FloorGun.create(x + 440, y + 400);
        gun.state = FloorGun.STATE_SHOOTING;
        gun.colorIndex = 1;
        const fire = new Fire(x + 360, y + 520, 1, 0, 0, soldier);
        fire.length = 96;
        new Flame(x + 500, y + 520);
        const lasers = new LasersManager(x + 640, y + 650);
        lasers.state = LasersManager.STATE_LASERING;
        press(false);
        container.getInput().poll(1024, 960);
        main.clearInputPressedRecords();
        press(true);
        tick();
        assert(world.paused, "Actual mapped Start did not pause scene");
        press(false);
        tick();
        render();
        const frozen = projection();
        const originalDraw = Object.getOwnPropertyDescriptor(main, "drawImage"),
            draw = main.drawImage;
        const ids = new WeakMap<object, number>();
        let nextId = 0;
        const trace: string[] = [];
        main.drawImage = (image, dx, dy) => {
            if (!ids.has(image)) ids.set(image, ++nextId);
            trace.push(`${ids.get(image)}:${dx}:${dy}`);
            draw.call(main, image, dx, dy);
        };
        try {
            render();
            const first = trace.join("|");
            assert(trace.length > 20, "Paused scene stopped drawing");
            for (let i = 0; i < 201; i++) {
                trace.length = 0;
                render();
                assert(trace.join("|") === first && projection() === frozen, `Paused scene changed at render ${i}`);
            }
        } finally {
            if (originalDraw) Object.defineProperty(main, "drawImage", originalDraw);
            else Reflect.deleteProperty(main, "drawImage");
        }
        const canvas = gameHost.querySelector("canvas");
        assert(canvas !== null, "Paused scene canvas");
        render();
        const pixels = canvas.toDataURL();
        for (let i = 0; i < 80; i++) render();
        assert(canvas.toDataURL() === pixels, "Ordinary paused framebuffer changed");
        await capture("jackal-paused-world-before");
        for (let i = 0; i < 80; i++) render();
        await capture("jackal-paused-world-after");
        assert(projection() === frozen, "Screenshots changed paused phase");
        const snapshot = serializer.createSnapshot(main, "render-pause");
        assert(isSupportedGameStateSnapshot(snapshot) && serializer.isSupportedSnapshotForLoadedResources(main, snapshot), "Loaded effect snapshot invalid");
        assert(store.save(main, () => true).saved, "Paused world save failed");
        const savedBytes = localStorage.getItem(slot);
        for (let i = 0; i < 40; i++) render();
        assert(projection() === frozen && localStorage.getItem(slot) === savedBytes, "Paused rendering changed save state");
        main.setBrowserSuspended(true);
        now += 100000;
        main.update(container, 100000);
        main.setBrowserSuspended(false);
        render();
        assert(world.paused && projection() === frozen, "Same-page Continue changed paused phase");
        // Diagnostic CPU submission timing, not GPU completion. No traces/snapshots in measured loops.
        const performanceRows: Array<{ version: string; paused: boolean; ms: number[]; heap: number[] }> = [];
        const soldierRender = soldier.render,
            bossRender = boss.render;
        try {
            for (const version of ["original-two-effects", "guarded-two-effects"])
                for (const paused of [false, true]) {
                    soldier.render = version === "original-two-effects" ? referenceEnemySoldier : soldierRender;
                    boss.render = version === "original-two-effects" ? referenceBossHelicopter : bossRender;
                    world.paused = paused;
                    for (let i = 0; i < 20; i++) render();
                    const ms: number[] = [],
                        heap: number[] = [];
                    for (let run = 0; run < 5; run++) {
                        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                        const start = performance.now();
                        for (let i = 0; i < 30; i++) render();
                        ms.push(performance.now() - start);
                        const memory: unknown = Reflect.get(performance, "memory");
                        heap.push(typeof memory === "object" && memory !== null ? Number(Reflect.get(memory, "usedJSHeapSize")) : 0);
                    }
                    performanceRows.push({ version, paused, ms, heap });
                }
        } finally {
            soldier.render = soldierRender;
            boss.render = bossRender;
            world.paused = true;
        }
        Reflect.set(window, "renderPauseEvidence", {
            viewport: [1024, 960],
            warmupRenders: 20,
            rendersPerRun: 30,
            repeats: 5,
            cpuSubmissionOnly: true,
            referenceEffects: ["EnemySoldier", "BossHelicopter"],
            rows: performanceRows
        });
        destroyMounted(runtime, mounted);
        mounted = null;
        // Restore the saved pre-benchmark phase into a new Main, stopping at the restore boundary.
        mounted = await mountGame(runtime, true, (fresh) => {
            assert(fresh.gc instanceof runtime.slick.AppGameContainer, "Fresh render container");
            fresh.gc.setLoopSuspended(true);
            assert(fresh !== main && fresh.mode instanceof GameMode && fresh.mode.paused, "Fresh paused render identity");
        });
        current().container.setLoopSuspended(true);
        render();
        assert(projection() === frozen, "Fresh restore changed visual phase");
        for (let i = 0; i < 201; i++) render();
        assert(projection() === frozen, "Fresh paused rendering advanced phase");
        const freshWorld = current().main.mode;
        assert(freshWorld instanceof GameMode, "Fresh visual world");
        const freshRotor = freshWorld.elements
            .flatMap((list) => Array.from({ length: list.size() }, (_, i) => list.get(i)))
            .find((element) => element instanceof EnemyHelicopter);
        assert(freshRotor instanceof EnemyHelicopter, "Fresh rotor identity");
        const angleBeforeResume = freshRotor.rotorAngle;
        press(false);
        tick();
        press(true);
        tick();
        assert(freshRotor.rotorAngle === angleBeforeResume, "Toggle tick advanced visual phase");
        assert(current().main.mode instanceof GameMode && !(current().main.mode as GameMode).paused, "Restored gameplay cannot unpause");
        render();
        assert(
            freshRotor.rotorAngle === (angleBeforeResume === -60 ? 0 : angleBeforeResume - 30),
            "Resumed render did not take exactly one original rotor step"
        );
        assert(projection() !== frozen, "Restored rendering did not resume");
        console.log(
            "Jackal loaded paused world passed: scene traces/framebuffer, real constructors, retained/fresh restore, resumed rendering and diagnostic timing."
        );
    } finally {
        if (mounted !== null) {
            press(false);
            mounted.container.getInput().poll(1024, 960);
        }
        destroyMounted(runtime, mounted);
        store.clear(() => true);
        Object.defineProperty(runtime.slick.Sys, "getTime", clock);
        if (provider) Object.defineProperty(navigator, "getGamepads", provider);
        else Reflect.deleteProperty(navigator, "getGamepads");
    }
}

/** Real loaded worlds; rare boss-boundary state is explicitly seeded, never claimed as natural play. */
async function verifyLastLifeArbitration(runtime: PreparedRuntime): Promise<void> {
    const clock = Object.getOwnPropertyDescriptor(runtime.slick.Sys, "getTime");
    assert(clock, "last-life clock descriptor");
    let now = runtime.slick.Sys.getTime(),
        mounted: MountedGame | null = null;
    const cutsceneModes = Reflect.get(CutsceneSequence, "modes") as ArrayList<Modes>;
    const priorCutscenes = [...cutsceneModes];
    const store = new runtime.JackalGameStateStore("browser-verification");
    const serializer = new JackalGameStateSerializer();
    const slot = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    const tick = (elapsed = 10): void => {
        assert(mounted, "last-life mount");
        now += elapsed;
        mounted.container.getInput().poll(1024, 960);
        mounted.main.update(mounted.container, elapsed);
    };
    const current = (): MountedGame => {
        assert(mounted, "last-life current runtime");
        return mounted;
    };
    const retire = (): void => {
        if (mounted) destroyMounted(runtime, mounted);
        mounted = null;
    };
    const enter = async (stage: number, hard: boolean): Promise<GameMode> => {
        mounted = await mountGame(runtime, false);
        const { main, container } = mounted;
        container.setLoopSuspended(true);
        main.startPlayer();
        main.random.setSeed(123);
        cutsceneModes.clear(); // Equal initial sequence for uninterrupted/restored controls.
        main.stageIndex = stage;
        main.hardMode = hard;
        main.continued = true;
        main.fading = false;
        main.fadeListener = null;
        main.requestMode(Modes.GAME, container);
        main.nextFrameTime = now;
        for (let n = 0; n < 500 && (main.fading || !(main.mode instanceof GameMode) || !main.mode.playing); n++) tick();
        assert(main.mode instanceof GameMode && main.mode.playing && !main.fading, "last-life entrance completed");
        const w = main.mode;
        for (const list of w.elements) list.clear();
        w.enemies.clear();
        w.solids.clear();
        w.mines.clear();
        w.cameraX = 512;
        w.cameraY = w.maxCameraY = 0;
        w.triggerY = 0;
        w.bossCameraPan = false;
        w.endingCameraPan = false;
        w.cameraPanListener = null!;
        w.player.x = 1450;
        w.player.y = 700;
        w.player.invincible = 0;
        main.extraLives = 0;
        main.extraLivesStr = "0";
        main.score = 0;
        main.scoreStr = "000000";
        return w;
    };
    const state = (): string => {
        const s = serializer.createSnapshot(current().main, "last-life-projection");
        assert(s.kind === "game", "last-life projection world");
        return JSON.stringify([s.mainFields, s.random, s.playerFields, s.gameMode, s.requestedSongId, s.currentSongState]);
    };
    const roundTrip = async (label: string): Promise<GameMode> => {
        const source = current().main,
            expected = state();
        assert(store.save(source, () => true).saved && store.hasValidSave(), label + " valid save");
        const bytes = localStorage.getItem(slot);
        retire();
        let observed = false;
        mounted = await mountGame(runtime, true, (main) => {
            observed = true;
            assert(main !== source && main.mode instanceof GameMode, label + " fresh ownership");
            assert(main.gc instanceof runtime.slick.AppGameContainer, "restored arbitration container");
            main.gc.setLoopSuspended(true);
        });
        current().container.setLoopSuspended(true);
        assert(observed && state() === expected, label + " exact logical restore");
        assert(localStorage.getItem(slot) === bytes, label + " restore is non-destructive");
        assert(isSupportedGameStateSnapshot(serializer.createSnapshot(current().main, label)), label + " recapture");
        return current().main.mode as GameMode;
    };
    const controls = new Map<string, string>();
    try {
        Object.defineProperty(runtime.slick.Sys, "getTime", { configurable: true, value: () => now });
        for (const kind of ["tank", "ship", "garage", "final"] as const)
            for (const hard of [false, true])
                for (const bonus of [false, true])
                    for (const restoredRun of [false, true]) {
                        let w = await enter(kind === "tank" ? 0 : kind === "ship" ? 2 : kind === "garage" ? 4 : 5, hard);
                        let target: Enemy;
                        const main = current().main;
                        if (kind === "tank") {
                            const manager = new BossBlueTanksManager();
                            manager.spawned = 4;
                            manager.destroyed = 3;
                            manager.ready = false;
                            const tank = new BossBlueTank(1024, 480, manager);
                            tank.colorOffset = 2;
                            target = tank;
                            w.player.x = tank.x;
                            w.player.y = tank.y;
                            w.player.update();
                            assert(w.player.respawning === 182 && !tank.removeFlag, "tank contact registers death without destroying tank");
                            w.player.x = 1450;
                            w.player.y = 700;
                        } else if (kind === "ship") {
                            const manager = new BossShipManager();
                            manager.ready = false;
                            for (let i = manager.shipGuns.size() - 1; i > 0; i--) manager.shipGuns.get(i).remove();
                            const gun = manager.shipGuns.get(0);
                            gun.state = BossShipGun.STATE_AIMING;
                            gun.openY = 32;
                            gun.hits = 1;
                            gun.wasHit = false;
                            target = gun;
                            w.player.attackAt(w.player.x, w.player.y); // Valid damage; no impossible ship-gun/water-gap contact claim.
                        } else if (kind === "garage") {
                            const manager = new BossGarageManager();
                            manager.ready = false;
                            for (const garage of [...manager.garages!]) {
                                garage.state = BossGarage.STATE_OPEN_3;
                                assert(
                                    garage.attack(garage.x, garage.y, garage.x + 128, garage.y + 128, AttackSource.PLAYER_WEAPON),
                                    "garage weapon destruction"
                                );
                            }
                            const gate = [...w.enemies].find((e) => e instanceof Gate && !e.removeFlag);
                            assert(gate instanceof Gate, "real garage destruction spawned gate");
                            target = gate;
                            w.player.attackAt(w.player.x, w.player.y);
                        } else {
                            const tank = new BossSuperTank(800, 400);
                            tank.state = BossSuperTank.STATE_STOPPED;
                            tank.hits = BossSuperTank.HITS_EXPLODE - 1;
                            target = tank;
                            w.player.attackAt(w.player.x, w.player.y);
                        }
                        w.bossCameraPan = false;
                        w.cameraPanListener = null!;
                        main.score = bonus ? 19999 : 0;
                        main.scoreStr = main.score.toString();
                        main.extraLives = 0;
                        main.extraLivesStr = "0";
                        // A genuine outstanding weapon is allowed to finish after registered damage.
                        const cx = target.x + (target.hitX1 + target.hitX2) / 2,
                            cy = target.y + (target.hitY1 + target.hitY2) / 2;
                        const missile = new PlayerMissile(cx, cy + 10, 270, 0);
                        missile.update();
                        assert(missile.removeFlag, "outstanding missile hit boss/gate");
                        assert(
                            kind === "final" ? (target as BossSuperTank).state === BossSuperTank.STATE_EXPLODING : w.stageCompletedFlag,
                            "real boss completion path"
                        );
                        assert(main.currentSong === null && main.requestedSong === null, "authoritative boss cleanup cancels old death hold");
                        assert(main.extraLives > 0 === bonus, kind + " actual per-call boss/cleanup score award");
                        if (kind !== "final") {
                            if (restoredRun) w = await roundTrip(kind + " completed/death-pending");
                            w.stageCompletedDelay = 1; // Explicit accelerated deadline boundary, then production owns progression.
                            if (restoredRun) w = await roundTrip(kind + " held-at-one");
                        }
                        const original = current().main,
                            death = w.player.respawning;
                        for (let n = 0; n < death + 10 && original.mode === w && w.player.respawning > 0; n++) tick();
                        if (!bonus) {
                            assert(original.mode instanceof ContinueMode, kind + " death beats objective");
                            const mode = original.mode;
                            w.fadeCompleted();
                            assert(original.mode === mode, kind + " stale fade callback inert");
                        } else {
                            assert(original.mode === w && w.player.respawning === 0 && original.extraLives === 0, kind + " rescued reserve consumed once");
                            for (let n = 0; n < 2500 && original.mode === w; n++) {
                                // Deterministic backend end notification, not elapsed headless AudioContext time.
                                if (
                                    kind === "final" &&
                                    original.currentSong === original.cutsceneSong &&
                                    [...w.elements[0]].some((e) => e instanceof FlashingSkull && e.state === FlashingSkull.STATE_PAUSED)
                                ) {
                                    const music = original.cutsceneSong.intro!;
                                    music.restorePlaybackState({ ...music.capturePlaybackState(), transport: "ended-pending" });
                                }
                                tick();
                            }
                            assert(original.mode !== w && !(original.mode instanceof ContinueMode), kind + " finite healthy destination after rescue");
                            if (kind === "final") assert(original.mode?.constructor.name === "SunsetMode", "resolved final reaches Sunset");
                        }
                        const key = JSON.stringify([kind, hard, bonus]);
                        const outcome = JSON.stringify([original.mode?.constructor.name, original.extraLives, original.score, original.stageIndex]);
                        if (restoredRun)
                            assert(
                                controls.get(key) === outcome,
                                key + " fresh restore matches uninterrupted winner and score: " + controls.get(key) + " vs " + outcome
                            );
                        else controls.set(key, outcome);
                        retire();
                    }
        for (const bonus of [false, true])
            for (const restoredRun of [false, true]) {
                let w = await enter(5, false);
                const main = current().main;
                const tank = new BossSuperTank(800, 400);
                tank.state = BossSuperTank.STATE_EXPLODED;
                tank.delay = 1;
                // Explicit final-entry race fixture, distinct from the real fatal-hit sequence above.
                w.player.attackAt(w.player.x, w.player.y);
                w.player.respawning = 1;
                main.stopAllSongs();
                if (bonus) main.addPoints(20000);
                if (restoredRun) w = await roundTrip("final-ending-boundary");
                const held = [...w.enemies].find((e) => e instanceof BossSuperTank);
                assert(held instanceof BossSuperTank, "restored final tank");
                tick(restoredRun ? 0 : 10);
                if (!bonus) assert(current().main.mode instanceof ContinueMode, "final boundary no reserve loses");
                else {
                    assert(w.playing && held.delay === 1, "boss waits before same-tick player resolves");
                    tick();
                    assert(!w.playing && held.state === BossSuperTank.STATE_PANNING, "next eligible boss tick enters ending");
                }
                const key = "final-boundary-" + bonus,
                    outcome = JSON.stringify([current().main.mode?.constructor.name, current().main.extraLives, held.state, held.delay, w.playing]);
                if (restoredRun) assert(controls.get(key) === outcome, key + " fresh restore matches uninterrupted ending gate");
                else controls.set(key, outcome);
                retire();
            }
    } finally {
        retire();
        Object.defineProperty(runtime.slick.Sys, "getTime", clock);
        cutsceneModes.clear();
        for (const mode of priorCutscenes) cutsceneModes.add(mode);
        localStorage.removeItem(slot);
    }
}

async function verifyLastLifeMusicResume(runtime: PreparedRuntime): Promise<void> {
    const clock = Object.getOwnPropertyDescriptor(runtime.slick.Sys, "getTime");
    assert(clock, "music clock");
    const sound = runtime.slick.SoundStore.get(),
        policy = sound.musicOn();
    const startDescriptor = Object.getOwnPropertyDescriptor(AudioBufferSourceNode.prototype, "start");
    assert(startDescriptor, "native browser source start");
    const originalStart = AudioBufferSourceNode.prototype.start,
        starts: number[] = [];
    let now = runtime.slick.Sys.getTime(),
        mounted: MountedGame | null = null;
    const store = new runtime.JackalGameStateStore("browser-verification"),
        serializer = new JackalGameStateSerializer();
    const slot = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    const current = (): MountedGame => {
        assert(mounted, "music runtime");
        return mounted;
    };
    const tick = (elapsed = 10): void => {
        now += elapsed;
        const f = current();
        f.container.getInput().poll(1024, 960);
        f.main.update(f.container, elapsed);
    };
    const world = (): GameMode => {
        const w = current().main.mode;
        assert(w instanceof GameMode, "music world");
        return w;
    };
    const key = (down: boolean): void => {
        document.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code: "Enter", key: "Enter", bubbles: true }));
    };
    const projection = (): string => {
        const s = serializer.createSnapshot(current().main, "music-projection");
        assert(s.kind === "game", "music projection");
        return JSON.stringify([s.playerFields, s.random, s.mainFields.extraLives, s.mainFields.score, s.currentSongState, s.requestedSongId]);
    };
    const retire = (): void => {
        if (mounted) destroyMounted(runtime, mounted);
        mounted = null;
    };
    const fresh = async (label: string): Promise<void> => {
        const source = current().main,
            expected = projection();
        assert(store.save(source, () => true).saved && store.hasValidSave(), label + " save");
        const bytes = localStorage.getItem(slot);
        retire();
        mounted = await mountGame(runtime, true, (main) => {
            assert(main !== source && main.gc instanceof runtime.slick.AppGameContainer, label + " fresh container");
            main.gc.setLoopSuspended(true);
        });
        current().container.setLoopSuspended(true);
        assert(projection() === expected, label + " exact state/offset restore");
        assert(localStorage.getItem(slot) === bytes, label + " unchanged slot");
    };
    const activate = (): Promise<boolean> => {
        const request = Reflect.get(window, "activateLastLifeAudio") as ((start: () => Promise<boolean>) => Promise<boolean>) | undefined;
        assert(request, "driver-owned user gesture activation");
        return request(() => sound.beginPlaybackGenerationFromUserGesture());
    };
    const controls = new Map<string, string>();
    try {
        Object.defineProperty(runtime.slick.Sys, "getTime", { configurable: true, value: () => now });
        Object.defineProperty(AudioBufferSourceNode.prototype, "start", {
            configurable: true,
            writable: true,
            value: function (this: AudioBufferSourceNode, when = 0, offset = 0, duration?: number) {
                if (this.buffer === sound.getDecodedAudioBuffer("music/stage2_repeat.ogg")) starts.push(offset);
                if (duration === undefined) originalStart.call(this, when, offset);
                else originalStart.call(this, when, offset, duration);
            }
        });
        for (const queued of [false, true])
            for (const disabled of [false, true])
                for (const restoredRun of [false, true]) {
                    mounted = await mountGame(runtime, false);
                    current().container.setLoopSuspended(true);
                    let main = current().main;
                    main.startPlayer();
                    main.stageIndex = 1;
                    main.continued = true;
                    main.fading = false;
                    main.fadeListener = null;
                    main.requestMode(Modes.GAME, current().container);
                    main.nextFrameTime = now;
                    for (let n = 0; n < 500 && (main.fading || !world().playing); n++) tick();
                    assert(!main.fading && world().playing, "music entrance");
                    for (const layer of world().elements) layer.clear();
                    world().enemies.clear();
                    world().mines.clear();
                    world().solids.clear();
                    world().triggerY = 0;
                    main.stopAllSongs();
                    main.requestSong(main.stageSong2);
                    tick();
                    const song = main.currentSong;
                    assert(song === main.stageSong2 && song.loop, "music loop ownership");
                    const part = song.loop,
                        buffer = sound.getDecodedAudioBuffer("music/stage2_repeat.ogg");
                    assert(buffer && buffer.duration > 0, "decoded duration");
                    const offset = Math.min(buffer.duration / 3, 0.5);
                    sound.setMusicOn(true);
                    assert(await activate(), "real playback generation");
                    part.restorePlaybackState({ transport: "playing", positionSeconds: offset, playbackRate: 0.8, volume: 0.4, looped: true, fade: null });
                    await part.attachPlaybackGeneration();
                    const oldSource = Reflect.get(part, "source") as AudioBufferSourceNode | null,
                        oldEnded = oldSource?.onended;
                    main.extraLives = 0;
                    main.extraLivesStr = "0";
                    main.score = 19999;
                    main.scoreStr = "019999";
                    if (disabled) sound.setMusicOn(false); // Required policy already off before damage.
                    if (queued) main.requestSong(main.stageSong1); // Pending before damage: preserve it through the hold.
                    world().player.invincible = 0;
                    assert(world().player.attackAt(world().player.x, world().player.y), "real last-life damage accepted");
                    assert(song.lastLifeSuspended && !main.isSongPlaying(), "immediate last-life silence");
                    const paused = part.capturePlaybackState();
                    assert(paused.transport === "paused" && paused.positionSeconds > 0, "nonzero held transport");
                    key(true);
                    tick();
                    assert(!world().paused && song.lastLifeSuspended, "fresh Pause cannot own death hold");
                    key(false);
                    tick();
                    const held = projection();
                    main.setBrowserSuspended(true);
                    now += 10000;
                    main.update(current().container, 10000);
                    main.setBrowserSuspended(false);
                    assert(projection() === held, "same-page suspension retains hold/count/offset");
                    await activate();
                    if (oldSource && oldEnded) oldEnded.call(oldSource, new Event("ended"));
                    assertPlaybackEqual(part.capturePlaybackState(), paused, "stale generation cannot finish held part");
                    if (restoredRun) await fresh(queued ? "queued-different-song-hold" : "silent-death-offset");
                    main = current().main;
                    const restored = main.currentSong;
                    assert(restored?.lastLifeSuspended && restored.loop, "restored hold reason");
                    const restoredPart = restored.loop;
                    const before = restoredPart.capturePlaybackState();
                    sound.setMusicOn(!disabled);
                    starts.length = 0;
                    new EnemySoldier(world().player.x + 200, world().player.y, EnemySoldierType.STATIONARY).explode();
                    assert(main.extraLives === 1 && restored.lastLifeSuspended, "nested production score does not resume inside gainExtraLife");
                    tick(restoredRun ? 0 : 10);
                    assert(!restored.lastLifeSuspended && world().player.respawning > 0, "Player releases rescue before vehicle returns");
                    if (queued) {
                        assert(main.currentSong === null, "obsolete held track not briefly resumed");
                        tick();
                        assert(main.currentSong === main.stageSong1, "queued track wins normal scheduler");
                    } else {
                        assert(main.currentSong === restored, "rescued exact song identity");
                        const recovered = restoredPart.capturePlaybackState();
                        assert(
                            recovered.transport === "playing" &&
                                Math.abs(recovered.positionSeconds - before.positionSeconds) < 0.1 &&
                                recovered.playbackRate === 0.8 &&
                                recovered.volume === 0.4 &&
                                recovered.looped,
                            "rescued exact transport intent"
                        );
                        assert(sound.musicOn() === !disabled, "user Music policy preserved");
                        if (disabled) {
                            assert(starts.length === 0, "disabled rescue attached no audible source");
                            sound.setMusicOn(true);
                        }
                        assert(await activate(), "accepted recovery generation");
                        await restoredPart.attachPlaybackGeneration();
                        assert(
                            starts.some((value) => Math.abs(value - before.positionSeconds) < 0.1),
                            "actual source attachment uses preserved offset"
                        );
                        // Save after release but before respawn, detached at an exact logical boundary.
                        sound.endPlaybackGeneration();
                        if (restoredRun) await fresh("rescued-before-respawn");
                        key(true);
                        tick();
                        assert(world().paused, "normal Pause eligible after rescue");
                        key(false);
                        tick();
                        key(true);
                        tick();
                        assert(!world().paused, "fresh unpause after rescue");
                        key(false);
                        tick();
                    }
                    const final = serializer.createSnapshot(current().main, "music-final");
                    assert(isSupportedGameStateSnapshot(final), "music candidate valid");
                    const caseKey = JSON.stringify([queued, disabled]),
                        state = final.currentSongState;
                    const outcome = JSON.stringify([
                        final.mainFields.extraLives,
                        final.mainFields.score,
                        state?.id,
                        state?.playing,
                        state?.lastLifeSuspended,
                        state?.playedIntro2,
                        state?.activeMusic?.id,
                        state?.activeMusic?.playback.transport
                    ]);
                    if (restoredRun) assert(controls.get(caseKey) === outcome, caseKey + " fresh music restore matches uninterrupted recovery");
                    else controls.set(caseKey, outcome);
                    retire();
                }
        mounted = await mountGame(runtime, false);
        current().container.setLoopSuspended(true);
        const main = current().main;
        main.startPlayer();
        main.stageIndex = 1;
        main.continued = true;
        main.fading = false;
        main.fadeListener = null;
        main.requestMode(Modes.GAME, current().container);
        main.nextFrameTime = now;
        for (let n = 0; n < 500 && (main.fading || !world().playing); n++) tick();
        for (const layer of world().elements) layer.clear();
        world().enemies.clear();
        world().mines.clear();
        world().solids.clear();
        world().triggerY = 0;
        main.stopAllSongs();
        main.requestSong(main.stageSong1);
        tick();
        const boundary = main.stageSong1,
            intro = boundary.intro!,
            loop = boundary.loop!;
        assert(intro.getTransportState() === "playing", "real intro before completion boundary");
        // Explicit backend end notification avoids assuming headless AudioContext wall-clock advancement.
        intro.restorePlaybackState({ ...intro.capturePlaybackState(), transport: "ended-pending" });
        main.extraLives = 0;
        main.extraLivesStr = "0";
        main.score = 19999;
        main.scoreStr = "019999";
        world().player.invincible = 0;
        assert(world().player.attackAt(world().player.x, world().player.y), "boundary death accepted");
        for (let n = 0; n < 8; n++) tick();
        assert(boundary.lastLifeSuspended && !loop.isTransportActive(), "completed intro cannot advance while death held");
        await fresh("completed-intro-death-hold");
        const recovered = current().main.currentSong;
        assert(recovered?.lastLifeSuspended && recovered.intro && recovered.loop, "restored ended-part identity");
        new EnemySoldier(world().player.x + 200, world().player.y, EnemySoldierType.STATIONARY).explode();
        tick(0);
        tick();
        assert(
            !recovered.lastLifeSuspended && recovered.loop.getTransportState() === "playing" && !recovered.intro.isTransportActive(),
            "completed intro stays finished; released sequencer starts loop"
        );
        retire();
    } finally {
        if (mounted) {
            key(false);
            current().container.getInput().poll(1024, 960);
        }
        retire();
        Object.defineProperty(runtime.slick.Sys, "getTime", clock);
        Object.defineProperty(AudioBufferSourceNode.prototype, "start", startDescriptor);
        sound.setMusicOn(policy);
        localStorage.removeItem(slot);
    }
}

/** Real-resource entry overlaps; accelerated death deadlines are explicit fixture boundaries. */
async function verifyBossEntryLastLife(runtime: PreparedRuntime): Promise<void> {
    const clock = Object.getOwnPropertyDescriptor(runtime.slick.Sys, "getTime");
    assert(clock, "entry clock");
    let now = runtime.slick.Sys.getTime(),
        mounted: MountedGame | null = null;
    const serializer = new JackalGameStateSerializer(),
        store = new runtime.JackalGameStateStore("browser-verification"),
        slot = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    const current = (): MountedGame => {
        assert(mounted, "entry mounted");
        return mounted;
    };
    const retire = (): void => {
        if (mounted) destroyMounted(runtime, mounted);
        mounted = null;
    };
    const tick = (elapsed = 10): void => {
        now += elapsed;
        const f = current();
        f.container.getInput().poll(1024, 960);
        f.main.update(f.container, elapsed);
    };
    const projection = (): string => {
        const s = serializer.createSnapshot(current().main, "entry-projection");
        assert(s.kind === "game", "entry projection");
        return JSON.stringify([s.mainFields, s.playerFields, s.random, s.gameMode, s.currentSongState, s.requestedSongId]);
    };
    const fresh = async (label: string): Promise<GameMode> => {
        const old = current().main,
            expected = projection();
        assert(store.save(old, () => true).saved && store.hasValidSave(), label + " valid current-schema save");
        const bytes = localStorage.getItem(slot);
        retire();
        mounted = await mountGame(runtime, true, (m) => {
            assert(m !== old && m.gc instanceof runtime.slick.AppGameContainer, "entry fresh owner");
            m.gc.setLoopSuspended(true);
        });
        current().container.setLoopSuspended(true);
        assert(projection() === expected, label + " exact graph/audio/RNG restore");
        assert(localStorage.getItem(slot) === bytes, label + " non-destructive read");
        assert(current().main.mode instanceof GameMode, "entry restored world");
        return current().main.mode as GameMode;
    };
    const enter = async (stage: number, hard = false, entrance = false): Promise<GameMode> => {
        mounted = await mountGame(runtime, false);
        const { main, container } = current();
        container.setLoopSuspended(true);
        main.startPlayer();
        main.random.setSeed(123);
        main.stageIndex = stage;
        main.hardMode = hard;
        main.continued = true;
        main.fading = false;
        main.fadeListener = null;
        main.requestMode(Modes.GAME, container);
        main.nextFrameTime = now;
        if (!entrance) {
            tick(0);
            for (let i = 0; i < 500 && main.fading; i++) tick();
        }
        assert(main.mode instanceof GameMode && main.mode.playing, "entry resource world");
        const w = main.mode;
        for (const layer of w.elements) layer.clear();
        w.enemies.clear();
        w.solids.clear();
        w.mines.clear();
        w.cameraX = 512;
        w.cameraY = 256;
        w.maxCameraY = Math.max(w.maxCameraY, 512);
        w.player.x = 1100;
        w.player.y = 800;
        w.player.invincible = 0;
        w.triggerY = 0;
        main.extraLives = 0;
        main.extraLivesStr = "0";
        main.score = 0;
        main.scoreStr = "000000";
        return w;
    };
    const triggers = [
        Triggers.BOSS_BLUE_TANKS,
        Triggers.BOSS_STATUES,
        Triggers.BOSS_SHIP,
        Triggers.BOSS_HELICOPTER,
        Triggers.BOSS_GARAGE,
        Triggers.BOSS_HEADQUARTERS
    ];
    const names = ["BossBlueTanksManager", "BossStatuesManager", "BossShipManager", "BossHelicopterManager", "BossGarageManager", "BossHeadquartersManager"];
    const listener = (w: GameMode) => {
        const value = w.cameraPanListener;
        assert(
            value instanceof BossBlueTanksManager ||
                value instanceof BossStatuesManager ||
                value instanceof BossShipManager ||
                value instanceof BossHelicopterManager ||
                value instanceof BossGarageManager ||
                value instanceof BossHeadquartersManager,
            "actual typed entry listener"
        );
        return value;
    };
    const managers = (w: GameMode, name: string): number => w.elements.reduce((n, l) => n + [...l].filter((e) => e.constructor.name === name).length, 0);
    const prepareRow = (w: GameMode, stage: number): void => {
        w.triggerMap = w.triggerMap.map(() => []);
        w.triggerMap[7] = [[triggers[stage], 0, 0]];
        w.triggerY = 8;
    };
    const hit = (w: GameMode, count = 8): void => {
        assert(w.player.attackAt(w.player.x, w.player.y), "entry actual damage");
        assert(w.player.respawning === 182, "production death deadline");
        w.player.respawning = count;
    };
    const controls = new Map<string, string>();
    try {
        Object.defineProperty(runtime.slick.Sys, "getTime", { configurable: true, value: () => now });
        for (let stage = 0; stage < 6; stage++)
            for (const hard of [false, true])
                for (const bonus of [false, true])
                    for (const restored of [false, true]) {
                        let w = await enter(stage, hard);
                        prepareRow(w, stage);
                        hit(w);
                        tick();
                        assert(w.bossCameraPan && !listener(w).ready && managers(w, names[stage]) === 1, "one typed pending manager " + stage);
                        assert(
                            current().main.currentSong?.lastLifeSuspended &&
                                current().main.requestedSong === current().main.bossSong &&
                                !current().main.isSongPlaying(),
                            "silent queued boss entry"
                        );
                        const childNames = ["BossShipGun", "BossGarage", "RotatingGun", "BossHeadquarters", "ElephantGun"];
                        const children = () => childNames.map((name) => managers(w, name));
                        const initialChildren = JSON.stringify(children());
                        const expected = projection();
                        current().main.setBrowserSuspended(true);
                        now += 10000;
                        current().main.update(current().container, 10000);
                        current().main.setBrowserSuspended(false);
                        assert(projection() === expected, "same-page Continue preserves pending entry");
                        if (restored) w = await fresh("boss-" + stage + "-" + hard + "-" + bonus);
                        const manager = listener(w);
                        assert(
                            w.elements.some((l) => [...l].some((e) => e === manager)),
                            "restored listener is manager in graph"
                        );
                        let callbacks = 0;
                        const pan = manager.panComplete.bind(manager);
                        manager.panComplete = () => {
                            callbacks++;
                            pan();
                        };
                        const main = current().main,
                            death = w.player.respawning,
                            row = w.triggerY,
                            oldSong = main.currentSong;
                        if (bonus) {
                            main.score = 19200;
                            main.scoreStr = "019200";
                            const enemy = new GrayJeep(1450, 800);
                            new PlayerMissile(enemy.x, enemy.y + 10, 270, 0);
                        }
                        tick(0); // Both same-page and fresh ownership reset the scheduler to this boundary.
                        assert(w.player.respawning === death - 1 && w.cameraY === 256 && callbacks === 0, "blocked pan advances one death tick");
                        assert(w.triggerY === row && managers(w, names[stage]) === 1, "no row retry or manager duplication");
                        assert(JSON.stringify(children()) === initialChildren, "preconstructed children not duplicated by deferred entry");
                        if (bonus) {
                            assert(main.score === 20000 && main.extraLives === 1 && !oldSong?.lastLifeSuspended, "real element-loop projectile rescues once");
                            assert(main.currentSong === null, "obsolete held stage track not restarted");
                            tick();
                            assert(main.currentSong === main.bossSong && Number(w.cameraY) === 252, "next eligible pan and queued cue");
                            for (let i = 0; i < 100 && w.bossCameraPan; i++) tick();
                            assert(!w.bossCameraPan && manager.ready && Number(callbacks) === 1, "one readiness callback");
                            for (let i = 0; i < 20 && w.player.respawning > 0; i++) tick();
                            assert(main.mode === w && w.player.respawning === 0 && Number(main.extraLives) === 0, "one reserve consumed");
                        } else {
                            for (let i = 1; i < death; i++) tick();
                            assert(main.mode instanceof ContinueMode && callbacks === 0, "finite Continue at death boundary without outgoing callback");
                            assert(oldSong !== null && !oldSong.lastLifeSuspended, "Continue cancels old hold");
                        }
                        const outcome = JSON.stringify([
                            main.mode?.constructor.name,
                            main.score,
                            main.extraLives,
                            main.random.getState(),
                            w.triggerY,
                            callbacks
                        ]);
                        const key = JSON.stringify([stage, hard, bonus]);
                        if (restored) assert(controls.get(key) === outcome, "fresh and uninterrupted entry outcomes " + key);
                        else controls.set(key, outcome);
                        retire();
                    }
        // Seed only the local approach/contact hazard; retain the stock terrain and trigger row.
        // This proves the final movement/contact overlap, not a full-stage route or a stock mine placement.
        {
            const w = await enter(0),
                main = current().main;
            const row = w.triggerMap.findIndex((r) => r.some((t) => t[0] === Triggers.BOSS_BLUE_TANKS));
            assert(row >= 0, "stock boss row exists");
            const camera = (row + 2) * 32,
                y = camera + GameMode.CAMERA_MARGIN_NORTH;
            let x = -1;
            for (let candidate = 128; candidate < w.mapWidth * 32 - 128; candidate += 32)
                if (w.isDriveableBounds(candidate - 64, y - 64, candidate + 64, y + 64)) {
                    x = candidate;
                    break;
                }
            assert(x >= 0, "stock terrain has valid local approach corridor");
            w.player.x = x;
            w.player.y = y;
            w.cameraX = Math.max(0, Math.min(w.maxCameraX, x - 512));
            w.cameraY = camera;
            w.maxCameraY = Math.max(w.maxCameraY, camera);
            w.triggerY = row + 1;
            new Mine(x - 16, y - 40);
            document.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", key: "ArrowUp", bubbles: true }));
            tick();
            document.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp", key: "ArrowUp", bubbles: true }));
            assert(w.player.y < y && w.cameraY < camera && w.player.respawning > 0 && !w.bossCameraPan, "actual movement then contact then camera crossing");
            const crossing = [row, x, y, w.player.y, camera, w.cameraY];
            tick();
            assert(w.bossCameraPan && managers(w, names[0]) === 1 && main.currentSong?.lastLifeSuspended, "stock next trigger retains death silence");
            Reflect.set(window, "bossEntryStockEvidence", {
                scope: "Seeded local approach and Mine on unchanged stock stage-0 terrain/trigger map; actual ArrowUp movement/contact/camera/processTriggers",
                crossing
            });
            retire();
        }
        // Additional current-schema boundaries: no song, positive unreleased hold, and hit after trigger.
        for (const boundary of ["no-song", "positive-hold", "after-trigger", "zero", "four", "headquarters"]) {
            let w = await enter(boundary === "headquarters" ? 5 : 0);
            prepareRow(w, boundary === "headquarters" ? 5 : 0);
            const main = current().main;
            if (boundary === "no-song") main.stopAllSongs();
            if (boundary === "after-trigger") {
                tick();
                hit(w);
            } else {
                hit(w);
                tick();
            }
            assert(w.bossCameraPan, "boundary preserves real pending pan");
            if (boundary === "positive-hold") {
                main.score = 19200;
                new GrayJeep(1450, 800).explode();
                assert(main.extraLives === 1 && main.currentSong?.lastLifeSuspended, "valid positive held checkpoint");
            }
            if (boundary === "zero" || boundary === "four") {
                main.score = 19200;
                new GrayJeep(1450, 800).explode();
                w.cameraY = boundary === "zero" ? 0 : 4;
                w.player.y = 500;
            }
            if (boundary === "no-song") assert(main.currentSong === main.bossSong && main.bossSong.lastLifeSuspended, "never-started held queued cue");
            if (boundary === "headquarters") {
                const h = [...w.enemies].find((e) => e instanceof BossHeadquarters);
                assert(h instanceof BossHeadquarters, "preconstructed headquarters");
                h.hits = BossHeadquarters.HITS - 1;
                assert(h.attack(h.x + 10, h.y + 10, h.x + 100, h.y + 100, AttackSource.PLAYER_WEAPON), "actual held-entry HQ cleanup");
                assert(main.currentSong === null && main.requestedSong === null, "HQ authoritative silence");
            }
            w = await fresh(boundary);
            const owner = current().main,
                manager = listener(w);
            let callbacks = 0;
            const pan = manager.panComplete.bind(manager);
            manager.panComplete = () => {
                callbacks++;
                pan();
            };
            const before = w.player.respawning,
                y = w.cameraY;
            tick(0);
            assert(
                w.player.respawning === before - 1 && w.cameraY === y,
                "boundary reaches Player before pan " + JSON.stringify([boundary, before, w.player.respawning, y, w.cameraY])
            );
            if (["positive-hold", "zero", "four"].includes(boundary)) {
                assert(!owner.currentSong?.lastLifeSuspended, "held reserve releases once");
                tick();
                if (boundary !== "positive-hold") assert(callbacks === 1 && !w.bossCameraPan, "zero/four settles once");
            } else {
                const score = owner.score;
                for (let i = 0; i < 20 && owner.mode === w; i++) tick();
                assert(owner.mode instanceof ContinueMode && callbacks === 0, "no abandoned manager callback");
                if (boundary === "headquarters") assert(owner.score === score, "cleanup score not replayed");
            }
            retire();
        }
        for (const kind of ["living", "reserve", "final-score", "latest-cue", "authoritative"]) {
            let w = await enter(0);
            prepareRow(w, 0);
            let main = current().main;
            if (kind === "reserve") main.extraLives = 1;
            if (kind !== "living") hit(w, kind === "final-score" ? 2 : 8);
            tick();
            const death = w.player.respawning;
            if (kind === "latest-cue") main.queueGameplaySong(main.stageSong2);
            if (kind === "authoritative") {
                const held = main.currentSong;
                main.requestSong(main.bossSong);
                assert(main.currentSong === null && !held?.lastLifeSuspended, "authoritative same-song request cancels hold");
            }
            if (kind === "final-score") {
                assert(death === 1, "final score at last death tick");
                main.score = 19200;
                new GrayJeep(1450, 800);
                new PlayerMissile(1450, 810, 270, 0);
            }
            w = await fresh(kind);
            main = current().main;
            tick(0);
            if (kind === "living" || kind === "reserve")
                assert(w.cameraY === 252 && w.player.respawning === death, "ordinary healthy/reserve pan freezes Player as baseline");
            if (kind === "final-score")
                assert(
                    main.mode === w && w.player.respawning === 0 && main.score === 20000 && main.extraLives === 0,
                    "last-tick actual projectile reserve consumed once"
                );
            if (kind === "latest-cue") {
                assert(main.requestedSong === main.stageSong2 && main.currentSong?.lastLifeSuspended, "latest queue survives restore silently");
                main.score = 19200;
                new GrayJeep(1450, 800).explode();
                tick();
                tick();
                assert(main.currentSong === main.stageSong2, "latest queued cue wins release");
            }
            retire();
        }
        for (const bonus of [false, true]) {
            const w = await enter(0);
            prepareRow(w, 0);
            const main = current().main;
            hit(w, 3);
            main.nextFrameTime = now + 10; // Once, to make tick(30) exactly three due ticks.
            if (bonus) {
                main.score = 19200;
                main.scoreStr = "019200";
                new GrayJeep(1450, 800);
                new PlayerMissile(1450, 810, 270, 0);
            }
            const boss = main.bossSong;
            const originalPlay = boss.play;
            let starts = 0;
            boss.play = function () {
                starts++;
                originalPlay.call(this);
            };
            try {
                tick(30);
                assert(managers(w, names[0]) === 1, "catch-up never duplicates the entry manager");
                if (!bonus) {
                    assert(main.mode instanceof ContinueMode, "third logical death tick owns Continue");
                    assert(starts === 0 && !listener(w).ready, "abandoned catch-up never starts boss cue or readiness");
                } else {
                    assert(main.mode === w && main.extraLives === 1 && w.player.respawning === 2, "first tick rescues; pan ticks do not consume twice");
                    assert(w.cameraY === 248 && !listener(w).ready, "remaining two due ticks advance the pan once each");
                    assert(main.currentSong === null && main.requestedSong === boss && starts === 0, "do not move music scheduling into each catch-up tick");
                    tick(0); // No fixed tick is due; normal outer music polling applies the queued cue.
                    tick(0);
                    assert(main.currentSong === boss && Number(starts) === 1, "queued boss cue starts once at the existing music checkpoint");
                }
            } finally {
                boss.play = originalPlay;
                retire();
            }
        }
        for (const stage of [4, 5]) {
            const w = await enter(stage);
            prepareRow(w, stage);
            hit(w, Player.RESPAWN_DELAY);
            tick();
            const main = current().main;
            const manager = listener(w);
            const death = w.player.respawning;
            const camera = w.cameraY;
            const children = [...w.enemies].filter((enemy) => ["RotatingGun", "ElephantGun"].includes(enemy.constructor.name));
            assert(children.length > 0, "real preconstructed defenses exist");
            const originals = new Map<Enemy, () => void>();
            let updates = 0;
            for (const child of children) {
                const original = child.update;
                originals.set(child, original);
                child.update = function () {
                    updates++;
                    original.call(this);
                };
            }
            try {
                for (let n = 0; n < 30; n++) tick();
                assert(main.mode === w && w.player.respawning === death - 30, "defenses cannot reset the recorded death");
                assert(w.cameraY === camera && !manager.ready && w.bossCameraPan, "unresolved entry remains deferred");
                assert(updates > 0 && managers(w, names[stage]) === 1, "normal defenses advance without reconstructing the manager");
                assert(main.currentSong?.lastLifeSuspended && main.extraLives === 0, "defense progress does not release the music hold");
            } finally {
                for (const [child, original] of originals) child.update = original;
                retire();
            }
        }
        // Real entrance fade composition, kept distinct from objective/exit fades.
        let w = await enter(1, false, true);
        let main = current().main;
        assert(main.fading && !main.fadeOut && main.fadeListener === null, "actual entrance fade");
        main.stopAllSongs();
        main.requestSong(main.stageSong2);
        tick(0);
        const song = main.currentSong;
        assert(song === main.stageSong2 && song.loop, "entrance music");
        song.loop.restorePlaybackState({ transport: "playing", positionSeconds: 0.2, playbackRate: 1, volume: 1, looped: true, fade: null });
        hit(w, 8);
        const held = JSON.stringify(song.loop.capturePlaybackState());
        w = await fresh("entrance-death");
        main = current().main;
        const fade = main.fadeIndex,
            death = w.player.respawning;
        tick(0);
        assert(main.fadeIndex < fade && w.player.respawning === death - 1 && main.fadeListener === null, "fade and death retain separate cadence");
        assert(JSON.stringify(main.currentSong?.loop?.capturePlaybackState()) === held, "entrance retains exact held offset");
        main.score = 19200;
        new GrayJeep(1450, 800).explode();
        tick();
        assert(!main.currentSong?.lastLifeSuspended && main.fadeIndex < fade && main.fadeListener === null, "entrance rescue without restart or listener");
        retire();
    } finally {
        retire();
        Object.defineProperty(runtime.slick.Sys, "getTime", clock);
        localStorage.removeItem(slot);
    }
}

async function verifySaveSemanticCutover(runtime: PreparedRuntime): Promise<void> {
    assert(GAME_STATE_VERSION === 19, "This cutover deliberately establishes schema 19");
    const clock = Object.getOwnPropertyDescriptor(runtime.slick.Sys, "getTime");
    assert(clock, "cutover clock descriptor");
    let now = runtime.slick.Sys.getTime();
    let mounted: MountedGame | null = null;
    const serializer = new JackalGameStateSerializer();
    const store = new runtime.JackalGameStateStore("schema19-semantic-cutover");
    const key = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    const mappingKey = getDeploymentStorageKey("jackal.input-mapping");
    const previous = localStorage.getItem(key);
    const previousMapping = localStorage.getItem(mappingKey);
    const nativeGet = Storage.prototype.getItem;
    const nativeSet = Storage.prototype.setItem;
    const nativeRemove = Storage.prototype.removeItem;
    const current = (): MountedGame => {
        assert(mounted !== null, "cutover mounted owner");
        return mounted;
    };
    const tick = (elapsed = 10): void => {
        now += elapsed;
        const { main, container } = current();
        container.getInput().poll(1024, 960);
        main.update(container, elapsed);
    };
    const retire = (): void => {
        destroyMounted(runtime, mounted);
        mounted = null;
    };
    const freezeBeforeRestore = (main: RuntimeMain): void => {
        assert(main.gc instanceof runtime.slick.AppGameContainer, "cutover fresh container");
        main.gc.setLoopSuspended(true);
    };
    const projection = (snapshot: JackalGameStateSnapshot): string => {
        assert(snapshot.kind === "game", "cutover game snapshot");
        return JSON.stringify([
            snapshot.mainFields,
            snapshot.random,
            snapshot.playerFields,
            snapshot.gameMode,
            snapshot.requestedSongId,
            snapshot.currentSongState
        ]);
    };
    try {
        Object.defineProperty(runtime.slick.Sys, "getTime", { configurable: true, value: () => now });
        mounted = await mountGame(runtime, false);
        const { main, container } = current();
        container.setLoopSuspended(true);
        main.startPlayer();
        main.stageIndex = 0;
        main.continued = true;
        main.fading = false;
        main.fadeListener = null;
        main.requestMode(Modes.GAME, container);
        main.nextFrameTime = now;
        for (let n = 0; n < 600 && (main.fading || !(main.mode instanceof GameMode) || !main.mode.playing); n++) tick();
        assert(main.mode instanceof GameMode && main.mode.playing && !main.fading, "cutover entrance finished");
        const world = main.mode;
        for (const layer of world.elements) layer.clear();
        world.enemies.clear();
        world.solids.clear();
        world.mines.clear();
        world.triggerY = 0;
        main.stopAllSongs();
        main.requestSong(main.stageSong0);
        tick();
        assert(main.currentSong === main.stageSong0 && main.currentSong.playing, "cutover initial song");

        // Local approach setup on the loaded stock map, not a full-stage playthrough.
        const row = world.triggerMap.findIndex((entries) => entries.some((entry) => entry[0] === Triggers.BOSS_BLUE_TANKS));
        assert(row >= 0, "stock boss trigger exists");
        const camera = (row + 2) * 32 - 1;
        const y = camera + GameMode.CAMERA_MARGIN_NORTH;
        let x = -1;
        for (let candidate = 128; candidate < world.mapWidth * 32 - 128; candidate += 32) {
            if (world.isDriveableBounds(candidate - 64, y - 64, candidate + 64, y + 64)) {
                x = candidate;
                break;
            }
        }
        assert(x >= 0 && camera <= world.maxCameraY, "valid loaded-map approach");
        world.cameraX = Math.max(0, Math.min(world.maxCameraX, x - 512));
        world.cameraY = camera;
        world.player.x = x;
        world.player.y = y;
        world.player.invincible = 0;
        world.triggerY = row + 1;
        main.extraLives = 0;
        main.extraLivesStr = "0";
        main.score = 0;
        main.scoreStr = "000000";
        assert(world.player.attackAt(x, y), "cutover recorded death");
        tick();
        assert(world.bossCameraPan && world.player.respawning > 0, "production pending boss entry");
        const held = serializer.createSnapshot(main, "schema19-semantic-cutover");
        assert(isSupportedGameStateSnapshot(held) && held.currentSongState?.lastLifeSuspended, "valid current held state");

        // Causal twins: current authoritative requests can have the same shape as
        // an older boss-entry request. These are compatibility fixtures, not an
        // assertion that the old build generated these exact serialized bytes.
        main.requestSong(main.bossSong);
        const pending = serializer.createSnapshot(main, "schema19-authoritative-pending");
        assert(pending.currentSongState === null && pending.requestedSongId === "bossSong", "queued authoritative twin");
        tick();
        const audible = serializer.createSnapshot(main, "schema19-authoritative-playing");
        assert(audible.currentSongState?.playing && !audible.currentSongState.lastLifeSuspended, "playing authoritative twin");
        const variants: readonly [string, JackalGameStateSnapshot][] = [
            ["correct-but-older held save", held],
            ["legacy-compatible pending cue", pending],
            ["legacy-compatible playing cue", audible]
        ];
        assert(new JackalInputMappingStore().save(main.buttonMapping, () => true).saved, "independent mapping fixture");
        const mappingBytes = nativeGet.call(localStorage, mappingKey);
        let lastLegacy = "";
        for (const [label, candidate] of variants) {
            assert(isSupportedGameStateSnapshot(candidate), label + " current positive control");
            const legacy = JSON.stringify({ ...candidate, version: 18 });
            lastLegacy = legacy;
            nativeSet.call(localStorage, key, legacy);
            const owner: RuntimeMain["mode"] = main.mode;
            const song: RuntimeMain["currentSong"] = main.currentSong;
            const requested = main.requestedSong;
            const death = world.player.respawning;
            let writes = 0;
            let removals = 0;
            Storage.prototype.setItem = function (entryKey, text) {
                if (entryKey === key) writes++;
                nativeSet.call(this, entryKey, text);
            };
            Storage.prototype.removeItem = function (entryKey) {
                if (entryKey === key) removals++;
                nativeRemove.call(this, entryKey);
            };
            try {
                assert(!isSupportedGameStateSnapshot(JSON.parse(legacy)), label + " rejects schema18");
                assert(!store.hasValidSave() && !store.hasValidSave(), label + " read miss");
                assert(!store.restore(main, container), label + " restore miss");
                assert(main.mode === owner && main.currentSong === song && main.requestedSong === requested, label + " no ownership change");
                assert(world.player.respawning === death, label + " no death advance");
                const denied = store.save(main, () => false);
                assert(!denied.saved && denied.reason === "not-authorized", label + " denied writer");
                assert(writes === 0 && removals === 0 && nativeGet.call(localStorage, key) === legacy, label + " bytes retained");
            } finally {
                Storage.prototype.setItem = nativeSet;
                Storage.prototype.removeItem = nativeRemove;
            }
            Storage.prototype.setItem = function (entryKey, text) {
                if (entryKey === key) throw new DOMException("cutover test quota", "QuotaExceededError");
                nativeSet.call(this, entryKey, text);
            };
            try {
                const failed = store.save(main, () => true);
                assert(!failed.saved && failed.reason === "write-failed", label + " quota failure");
                assert(nativeGet.call(localStorage, key) === legacy, label + " failed write retains bytes");
            } finally {
                Storage.prototype.setItem = nativeSet;
            }
            let oldReads = 0;
            Storage.prototype.getItem = function (entryKey) {
                if (entryKey === key) {
                    oldReads++;
                    throw new Error("cutover writer must not inspect the old slot");
                }
                return nativeGet.call(this, entryKey);
            };
            try {
                assert(store.save(main, () => true).saved && oldReads === 0, label + " authorized replacement without read");
            } finally {
                Storage.prototype.getItem = nativeGet;
            }
            const replacement = nativeGet.call(localStorage, key);
            assert(replacement !== null && JSON.parse(replacement).version === 19 && store.hasValidSave(), label + " current replacement");
            assert(nativeGet.call(localStorage, mappingKey) === mappingBytes, label + " separate controls unaffected");
        }

        // A fresh runtime must decline the old record without invoking its
        // restoration callback or deleting the record during normal fallback.
        nativeSet.call(localStorage, key, lastLegacy);
        retire();
        let restoredOld = false;
        mounted = await mountGame(
            runtime,
            true,
            () => {
                restoredOld = true;
            },
            freezeBeforeRestore
        );
        current().container.setLoopSuspended(true);
        assert(!restoredOld && !(current().main.mode instanceof GameMode), "old game not revived by fresh boot");
        assert(nativeGet.call(localStorage, key) === lastLegacy, "fresh fallback is non-destructive");
        retire();

        // Restore a real current held-entry snapshot, preserving its graph and
        // audio intent without advancing the death or replaying the trigger.
        const heldBytes = JSON.stringify(held);
        nativeSet.call(localStorage, key, heldBytes);
        let restoredCurrent = false;
        mounted = await mountGame(
            runtime,
            true,
            (fresh) => {
                restoredCurrent = true;
                assert(fresh !== main, "fresh current owner");
                assert(projection(serializer.createSnapshot(fresh, "recapture")) === projection(held), "current exact graph/death/audio restore");
            },
            freezeBeforeRestore
        );
        current().container.setLoopSuspended(true);
        assert(restoredCurrent && store.hasValidSave(), "schema19 restores normally");
        assert(nativeGet.call(localStorage, key) === heldBytes, "current restore leaves bytes unchanged");
        assert(nativeGet.call(localStorage, mappingKey) === mappingBytes, "fresh restore leaves controls unchanged");
    } finally {
        Storage.prototype.getItem = nativeGet;
        Storage.prototype.setItem = nativeSet;
        Storage.prototype.removeItem = nativeRemove;
        retire();
        Object.defineProperty(runtime.slick.Sys, "getTime", clock);
        // Fixture teardown only. Shipped rejection code must never do this.
        if (previous === null) nativeRemove.call(localStorage, key);
        else nativeSet.call(localStorage, key, previous);
        if (previousMapping === null) nativeRemove.call(localStorage, mappingKey);
        else nativeSet.call(localStorage, mappingKey, previousMapping);
    }
}
