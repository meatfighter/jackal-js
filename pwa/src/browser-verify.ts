import { JackalRuntimeLoader, type PreparedRuntime } from "./app/JackalRuntimeLoader.js";
import { Modes } from "./jackal/Modes.js";

const result = document.querySelector<HTMLElement>("#result");
const host = document.querySelector<HTMLElement>("#game-host");
if (result === null || host === null) {
    throw new Error("Browser verification fixture is missing required elements.");
}
const gameHost = host;

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

interface MountedGame {
    main: InstanceType<PreparedRuntime["Main"]>;
    buffered: InstanceType<PreparedRuntime["slick"]["BufferedScalableGame"]>;
    container: InstanceType<PreparedRuntime["slick"]["AppGameContainer"]>;
}

function soundVoice(positionSeconds: number, looped = false) {
    return {
        looped,
        playbackRate: 1,
        positionSeconds,
        gain: 1,
        spatialPosition: null
    };
}

function assertRestoredPosition(actual: number, expected: number, label: string): void {
    assert(actual > 0.005, `${label} restarted too close to sample zero.`);
    assert(actual >= expected - 0.03, `${label} restored before its saved logical offset.`);
    assert(actual <= expected + 0.5, `${label} advanced unexpectedly far after restore.`);
}

async function mountGame(runtime: PreparedRuntime, restore: boolean): Promise<MountedGame> {
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
        main.loadingCompleteHandler = (gc) => store.restore(main, gc);
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

        first.main.helicopterSound.restorePlaybackState({
            voices: [soundVoice(0.05, true)],
            activeVoiceIndex: 0
        });
        first.main.machineGunSound.restorePlaybackState({
            voices: [soundVoice(0.02, true)],
            activeVoiceIndex: 0
        });
        first.main.explodeSound.restorePlaybackState({
            voices: [soundVoice(0.01, true), soundVoice(0.02, true)],
            activeVoiceIndex: null
        });
        first.main.lastPlayTime.set(first.main.machineGunSound, Date.now() - 40);

        const expectedHelicopter = first.main.helicopterSound.capturePlaybackState();
        const expectedMachineGun = first.main.machineGunSound.capturePlaybackState();
        const expectedExplode = first.main.explodeSound.capturePlaybackState();
        assert(expectedHelicopter.voices.length === 1, "Browser fixture did not install helicopter Sound state.");
        assert(expectedMachineGun.voices.length === 1, "Browser fixture did not install machine-gun Sound state.");
        assert(expectedExplode.voices.length === 2 && expectedExplode.activeVoiceIndex === null, "Browser fixture did not install overlapping Sound state.");

        assert(store.save(first.main), "Real Jackal browser Main did not save successfully.");
        assert(store.hasValidSave(), "Saved real Jackal browser state did not validate.");
        first.buffered.setScalingMode(runtime.slick.BufferedScalingMode.Linear);
        first.buffered.setScalingMode(runtime.slick.BufferedScalingMode.Integer);
        first.buffered.setScalingMode(runtime.slick.BufferedScalingMode.Nearest);

        destroyMounted(runtime, first);
        first = null;

        second = await mountGame(runtime, true);
        assert(second.main.mode === runtime.Main.gameMode, "Fresh Jackal Main did not restore GameMode.");
        assert(second.main.score === 123450 && second.main.scoreStr === "123450", "Fresh Jackal Main did not restore score state.");
        assert(second.main.extraLives === 3 && second.main.extraLivesStr === "3", "Fresh Jackal Main did not restore life state.");
        assert(second.main.isBrowserRuntimeActive(), "Restored Jackal Main is not the active browser runtime.");

        const helicopter = second.main.helicopterSound.capturePlaybackState();
        assert(helicopter.voices.length === 1 && helicopter.activeVoiceIndex === 0, "Fresh Jackal Main did not restore helicopter Sound state.");
        assertRestoredPosition(helicopter.voices[0].positionSeconds, expectedHelicopter.voices[0].positionSeconds, "helicopter Sound");
        second.main.playSoundIfNotPlaying(second.main.helicopterSound);
        assert(
            second.main.helicopterSound.capturePlaybackState().voices.length === helicopter.voices.length,
            "Restored helicopter ambience was restarted by playSoundIfNotPlaying()."
        );

        const machineGun = second.main.machineGunSound.capturePlaybackState();
        assert(machineGun.voices.length === 1 && machineGun.activeVoiceIndex === 0, "Fresh Jackal Main did not restore machine-gun Sound state.");
        assertRestoredPosition(machineGun.voices[0].positionSeconds, expectedMachineGun.voices[0].positionSeconds, "machine-gun Sound");

        const explode = second.main.explodeSound.capturePlaybackState();
        assert(explode.voices.length === 2 && explode.activeVoiceIndex === null, "Fresh Jackal Main did not restore overlapping Sound voices.");
        assertRestoredPosition(explode.voices[0].positionSeconds, expectedExplode.voices[0].positionSeconds, "first explosion Sound voice");
        assertRestoredPosition(explode.voices[1].positionSeconds, expectedExplode.voices[1].positionSeconds, "second explosion Sound voice");
        assert(second.main.extraLifeSound.capturePlaybackState().voices.length === 0, "An omitted Sound should restore empty.");

        const machineGunVoicesBefore = machineGun.voices.length;
        second.main.playSound(second.main.machineGunSound);
        const machineGunAfterImmediatePlay = second.main.machineGunSound.capturePlaybackState();
        assert(
            machineGunAfterImmediatePlay.voices.length === machineGunVoicesBefore,
            "Restored repeat cooldown did not suppress an immediate duplicate machine-gun Sound."
        );
    } finally {
        destroyMounted(runtime, first);
        destroyMounted(runtime, second);
        store.clear();
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
