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

async function mountGame(runtime: PreparedRuntime, restore: boolean, onRestored?: (main: RuntimeMain) => void): Promise<MountedGame> {
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
        verifyInputEditor(runtime, second);
        verifyEditorResume(second.main, second.container);
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
        result.textContent = "Real Jackal browser boot/gameplay save/restore/audio and input-editor storage verification passed.";
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
                    bad.modeExtra = { input: { ...snapshot.modeExtra.input, assignedControllerButtons: [invalid] } };
                    assert(!acceptsSnapshot(bad), "Invalid assignment accepted: " + invalid);
                }
                const duplicate = structuredClone(snapshot);
                duplicate.modeExtra = { input: { ...snapshot.modeExtra.input, assignedControllerButtons: [-2, -2] } };
                assert(!acceptsSnapshot(duplicate), "Duplicate accepted");
                const mismatch = structuredClone(snapshot);
                assert(mismatch.modeExtra !== null && "input" in mismatch.modeExtra && mismatch.modeExtra.input.draftButtonMapping !== null, "Expected draft");
                mismatch.modeExtra.input.draftButtonMapping.fields.controllerUp = -3;
                assert(!acceptsSnapshot(mismatch), "Inconsistent draft accepted");
                mismatch.modeExtra.input.draftButtonMapping.fields.controllerUp = -2;
                mismatch.modeExtra.input.draftButtonMapping.fields.controllerGrenade = -2;
                assert(!acceptsSnapshot(mismatch), "Logical direction accepted as raw action");
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
