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
        result.textContent = "Real Jackal browser boot/gameplay save/restore verification passed.";
    },
    (error: unknown) => {
        console.error(error);
        result.dataset.status = "failed";
        result.textContent = error instanceof Error ? (error.stack ?? error.message) : String(error);
    }
);
