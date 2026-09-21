import { JackalRuntimeLoader, type PreparedRuntime } from "./app/JackalRuntimeLoader.js";
import { Modes } from "./jackal/Modes.js";

const result = document.querySelector<HTMLElement>("#result");
const host = document.querySelector<HTMLElement>("#game-host");
if (result === null || host === null) {
    throw new Error("Memory smoke fixture is missing required elements.");
}
const resultElement = result;
const gameHost = host;

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

interface MountedGame {
    main: InstanceType<PreparedRuntime["Main"]>;
    container: InstanceType<PreparedRuntime["slick"]["AppGameContainer"]>;
}

interface MemorySmokeApi {
    initialize(): Promise<void>;
    runCycle(index: number): Promise<void>;
    destroyCycle(): void;
    cleanup(): void;
}

let runtime: PreparedRuntime | null = null;
let store: InstanceType<PreparedRuntime["JackalGameStateStore"]> | null = null;
let mounted: MountedGame | null = null;

function requireRuntime(): PreparedRuntime {
    if (runtime === null) {
        throw new Error("Memory smoke runtime is not initialized.");
    }
    return runtime;
}

function requireStore(): InstanceType<PreparedRuntime["JackalGameStateStore"]> {
    if (store === null) {
        throw new Error("Memory smoke state store is not initialized.");
    }
    return store;
}

async function initialize(): Promise<void> {
    if (runtime !== null) {
        return;
    }
    localStorage.clear();
    const loader = new JackalRuntimeLoader(() => undefined);
    runtime = await loader.ensurePrepared(false);
    store = new runtime.JackalGameStateStore("memory-smoke");
    resultElement.dataset.status = "ready";
    resultElement.textContent = "Memory smoke fixture is ready.";
}

async function runCycle(index: number): Promise<void> {
    assert(mounted === null, "Previous memory smoke session was not destroyed.");
    const prepared = requireRuntime();
    const stateStore = requireStore();

    gameHost.replaceChildren();
    prepared.slick.Display.setParent(gameHost);

    const main = new prepared.Main();
    main.reserveBrowserRuntime();
    const buffered = new prepared.slick.BufferedScalableGame(main, prepared.Main.DISPLAY_WIDTH, prepared.Main.DISPLAY_HEIGHT, {
        maintainAspect: true,
        scalingMode: prepared.slick.BufferedScalingMode.Nearest
    });
    const container = new prepared.slick.AppGameContainer(buffered, 1024, 960, false);
    container.setPreserveAudioCacheOnDestroy(true);
    container.setLoopSuspended(false);
    container.setHighDpiEnabled(true);
    container.setMaxDevicePixelRatio(2);
    main.loadingCompleteHandler = (gc) => stateStore.restore(main, gc);

    mounted = { main, container };
    await Promise.resolve(container.setDisplayMode(1024, 960, false));
    await container.start();
    await prepared.slick.ResourceLoader.waitForAll();
    assert(main.isStateSaveReady(), "Memory smoke Main did not become save-state ready.");

    if (!stateStore.hasValidSave()) {
        main.requestMode(Modes.GAME, container);
    }
    assert(main.mode === prepared.Main.gameMode, "Memory smoke Main did not enter or restore GameMode.");

    main.score = 100000 + index;
    main.scoreStr = String(main.score).padStart(6, "0");
    assert(stateStore.save(main, () => true).saved, "Memory smoke Main did not save successfully.");
}

function destroyCycle(): void {
    if (mounted === null) {
        return;
    }
    const prepared = requireRuntime();
    mounted.main.stopAllSounds();
    mounted.main.disposeBrowserRuntime();
    mounted.container.destroy();
    mounted = null;
    prepared.slick.Display.setParent(null);
    gameHost.replaceChildren();
}

function cleanup(): void {
    destroyCycle();
    store?.clear(() => true);
    store = null;
    runtime = null;
    localStorage.clear();
    resultElement.dataset.status = "cleaned";
    resultElement.textContent = "Memory smoke fixture cleaned up.";
}

const memorySmokeGlobal = globalThis as typeof globalThis & { __jackalMemorySmoke?: MemorySmokeApi };
memorySmokeGlobal.__jackalMemorySmoke = { initialize, runCycle, destroyCycle, cleanup };

void initialize().catch((error: unknown) => {
    console.error(error);
    resultElement.dataset.status = "failed";
    resultElement.textContent = error instanceof Error ? (error.stack ?? error.message) : String(error);
});
