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
        result.textContent = "Real Jackal browser boot/gameplay save/restore/audio verification passed.";
    },
    (error: unknown) => {
        console.error(error);
        result.dataset.status = "failed";
        result.textContent = error instanceof Error ? (error.stack ?? error.message) : String(error);
    }
);
