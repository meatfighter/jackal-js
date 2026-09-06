import { SoundStore } from "slick2d-ts/slick/openal/SoundStore";
import { ResourceLoadException, ResourceLoader } from "slick2d-ts/slick/util/ResourceLoader";
import { BUILD_STAMP } from "./BuildInfo.js";
import { RESOURCE_VERSIONS } from "./ResourceVersions.js";

const RESOURCE_CACHE_RETRY_COUNT = 5;
const RESOURCE_CACHE_RETRY_DELAY_MS = 250;
const RESOURCE_PRELOAD_CONCURRENCY = 8;
const AUDIO_PRELOAD_CONCURRENCY = 3;

type SlickRuntimeModule = typeof import("slick2d-ts");
type MainConstructor = typeof import("../jackal/Main.js").Main;
type JackalGameStateStoreConstructor = typeof import("../jackal/persistence/JackalGameStateStore.js").JackalGameStateStore;

interface ResourceLoadProgress {
    readonly loaded: number;
}

export interface PreparedRuntime {
    readonly slick: SlickRuntimeModule;
    readonly Main: MainConstructor;
    readonly JackalGameStateStore: JackalGameStateStoreConstructor;
}

/** Owns lazy module loading and cancellable resource preloading independently of a game session. */
export class JackalRuntimeLoader {
    private prepared: PreparedRuntime | null = null;
    private pending: Promise<PreparedRuntime> | null = null;
    private preparationAbortController: AbortController | null = null;
    private cancellationBarrier: Promise<void> = Promise.resolve();
    private failure: unknown = null;
    private loadedFraction = 0;

    public constructor(private readonly progressChanged: () => void) {}

    public get preparedRuntime(): PreparedRuntime | null {
        return this.prepared;
    }

    public get progress(): number {
        return this.loadedFraction;
    }

    public get error(): unknown {
        return this.failure;
    }

    public get isPreparing(): boolean {
        return this.pending !== null;
    }

    public cancelPreparation(): void {
        const pending = this.pending;
        this.preparationAbortController?.abort();
        if (pending !== null) {
            const previousBarrier = this.cancellationBarrier;
            this.cancellationBarrier = Promise.allSettled([previousBarrier, pending]).then(() => undefined);
        }
        this.preparationAbortController = null;
        this.pending = null;
    }

    public async ensurePrepared(forceRetry: boolean): Promise<PreparedRuntime> {
        if (this.prepared !== null) {
            return this.prepared;
        }
        if (forceRetry) {
            this.cancelPreparation();
            this.failure = null;
        }
        if (this.pending === null) {
            const controller = new AbortController();
            const cancellationBarrier = this.cancellationBarrier;
            this.preparationAbortController = controller;
            const preparation = this.prepareAfterCancellation(cancellationBarrier, controller.signal)
                .then((runtime) => {
                    if (controller.signal.aborted) {
                        throw createAbortError();
                    }
                    this.prepared = runtime;
                    Reflect.set(window, "__gameResourcesPrepared", true);
                    this.failure = null;
                    this.setProgress(1);
                    return runtime;
                })
                .catch((error) => {
                    if (controller.signal.aborted) {
                        throw createAbortError();
                    }
                    // A resource deadline aborts its fetch, not this preparation.
                    // Only cancellation requested by this loader may suppress Retry.
                    this.failure = isAbortFailure(error) ? new Error("Resource loading timed out or was interrupted.", { cause: error }) : error;
                    throw this.failure;
                })
                .finally(() => {
                    if (this.pending === preparation) {
                        this.pending = null;
                    }
                    if (this.preparationAbortController === controller) {
                        this.preparationAbortController = null;
                    }
                });
            this.pending = preparation;
        }
        return this.pending;
    }

    private async prepareAfterCancellation(cancellationBarrier: Promise<void>, signal: AbortSignal): Promise<PreparedRuntime> {
        await cancellationBarrier;
        throwIfAborted(signal);
        ResourceLoader.clearFailures();
        this.configureResourceLoader();
        this.setProgress(0);
        return this.prepare(signal);
    }

    private async prepare(signal: AbortSignal): Promise<PreparedRuntime> {
        const [slick, resourceManifestModule] = await Promise.all([import("slick2d-ts"), import("./ResourceManifest.js")]);
        throwIfAborted(signal);
        const [mainModule, gameStateStoreModule] = await Promise.all([import("../jackal/Main.js"), import("../jackal/persistence/JackalGameStateStore.js")]);
        throwIfAborted(signal);
        await this.preloadResources(resourceManifestModule.RESOURCE_MANIFEST, signal);
        return {
            slick,
            Main: mainModule.Main,
            JackalGameStateStore: gameStateStoreModule.JackalGameStateStore
        };
    }

    private async preloadResources(resourceManifest: readonly string[], signal: AbortSignal): Promise<void> {
        const audioRefs: string[] = [];
        const resourceRefs: string[] = [];
        for (const ref of resourceManifest) {
            if (ref.endsWith(".ogg")) {
                audioRefs.push(ref);
            } else {
                resourceRefs.push(ref);
            }
        }

        const total = audioRefs.length + resourceRefs.length;
        if (total === 0) {
            this.setProgress(1);
            return;
        }

        let loadedAudio = 0;
        let loadedResources = 0;
        const updateProgress = (): void => this.setProgress((loadedAudio + loadedResources) / total);
        const settled = await Promise.allSettled([
            ResourceLoader.preloadResources(resourceRefs, {
                signal,
                concurrency: RESOURCE_PRELOAD_CONCURRENCY,
                onProgress: (progress: ResourceLoadProgress) => {
                    loadedResources = progress.loaded;
                    updateProgress();
                }
            }),
            SoundStore.get().preloadAudioBuffers(audioRefs, {
                signal,
                concurrency: AUDIO_PRELOAD_CONCURRENCY,
                onProgress: (progress: ResourceLoadProgress) => {
                    loadedAudio = progress.loaded;
                    updateProgress();
                }
            })
        ]);
        const failure = settled.find((entry): entry is PromiseRejectedResult => entry.status === "rejected");
        if (failure) {
            throw failure.reason;
        }
        throwIfAborted(signal);
        this.setProgress(1);
    }

    private configureResourceLoader(): void {
        ResourceLoader.removeAllResourceLocations();
        ResourceLoader.addResourceLocation(getAppUrl("resources/"));
        ResourceLoader.setCacheVersionResolver((ref) => RESOURCE_VERSIONS[ref] ?? BUILD_STAMP);
        ResourceLoader.setRetryOptions(RESOURCE_CACHE_RETRY_COUNT, RESOURCE_CACHE_RETRY_DELAY_MS);
    }

    private setProgress(value: number): void {
        this.loadedFraction = value;
        this.progressChanged();
    }
}

export function isRuntimePreparationAbort(error: unknown): boolean {
    return isAbortFailure(error);
}

function getAppUrl(path: string): string {
    const baseUrl = import.meta.env.BASE_URL;
    if (typeof baseUrl !== "string") {
        throw new Error("Vite BASE_URL is unavailable.");
    }
    return new URL(path, new URL(baseUrl, window.location.href)).toString();
}

function throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
        throw createAbortError();
    }
}

function createAbortError(): DOMException {
    return new DOMException("Jackal runtime preparation was cancelled.", "AbortError");
}

function isAbortFailure(error: unknown): boolean {
    return (
        (error instanceof ResourceLoadException && error.kind === "abort") ||
        (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
        (typeof error === "object" && error !== null && "name" in error && (error as { name?: unknown }).name === "AbortError")
    );
}
