import { runSettledBatch } from "slick2d-ts/slick/util/BatchLoader";
import { prepareWithDeadline, ReloadRequiredError, settleRequired } from "./PreparationDeadline.js";
import { SoundStore } from "slick2d-ts/slick/openal/SoundStore";
import { ResourceLoader } from "slick2d-ts/slick/util/ResourceLoader";
import { BUILD_STAMP } from "./BuildInfo.js";
import { RESOURCE_VERSIONS } from "./ResourceVersions.js";
import { waitForServiceWorkerStartupGrace } from "./ServiceWorkerRegistrar.js";

const RESOURCE_CACHE_RETRY_COUNT = 5;
const RESOURCE_CACHE_RETRY_DELAY_MS = 250;
const RESOURCE_PRELOAD_CONCURRENCY = 8;
const AUDIO_PRELOAD_CONCURRENCY = 3;

type SlickRuntimeModule = typeof import("slick2d-ts");
type MainConstructor = typeof import("../jackal/Main.js").Main;
type JackalGameStateStoreConstructor = typeof import("../jackal/persistence/JackalGameStateStore.js").JackalGameStateStore;

export interface PreparedRuntime {
    readonly slick: SlickRuntimeModule;
    readonly Main: MainConstructor;
    readonly JackalGameStateStore: JackalGameStateStoreConstructor;
}

/** Owns lazy module loading and cancellable resource preloading independently of a game session. */

export class JackalRuntimeLoader {
    public prepared: PreparedRuntime | null = null;
    public error: unknown = null;
    public progress = 0;
    private pending: Promise<PreparedRuntime> | null = null;
    private controller: AbortController | null = null;
    private reloadFailure: ReloadRequiredError | null = null;
    public constructor(private readonly progressChanged: () => void) {}

    public get preparedRuntime(): PreparedRuntime | null {
        return this.prepared;
    }

    public get isPreparing(): boolean {
        return this.pending !== null;
    }

    public cancelPreparation(): void {
        this.controller?.abort(new DOMException("Preparation cancelled", "AbortError"));
    }

    public async ensurePrepared(forceRetry = false): Promise<PreparedRuntime> {
        if (this.reloadFailure !== null) throw this.reloadFailure;
        if (this.prepared !== null) return this.prepared;
        const prior = this.pending;
        if (prior !== null) {
            const alreadyCancelled = this.controller?.signal.aborted === true;
            if (!forceRetry && !alreadyCancelled) return prior;
            this.controller?.abort(new DOMException("Preparation superseded", "AbortError"));
            await prior.catch(() => undefined);
            return this.ensurePrepared(this.pending === null);
        }
        if (!forceRetry && this.error !== null) throw this.error;
        const controller = new AbortController();
        this.controller = controller;
        this.error = null;
        const work = prepareWithDeadline(controller, async () => {
            await waitForServiceWorkerStartupGrace();
            controller.signal.throwIfAborted();
            ResourceLoader.clearFailures();
            ResourceLoader.removeAllResourceLocations();
            ResourceLoader.addResourceLocation(getAppUrl("resources/"));
            ResourceLoader.setCacheVersionResolver((ref) => RESOURCE_VERSIONS[ref] ?? BUILD_STAMP);
            ResourceLoader.setRetryOptions(RESOURCE_CACHE_RETRY_COUNT, RESOURCE_CACHE_RETRY_DELAY_MS);
            this.setProgress(0, controller.signal);
            const [slick, manifest, mainModule, storeModule] = await settleRequired(
                [import("slick2d-ts"), import("./ResourceManifest.js"), import("../jackal/Main.js"), import("../jackal/persistence/JackalGameStateStore.js")],
                controller
            );
            controller.signal.throwIfAborted();
            await this.preloadResources(manifest.RESOURCE_MANIFEST, controller);
            controller.signal.throwIfAborted();
            return { slick, Main: mainModule.Main, JackalGameStateStore: storeModule.JackalGameStateStore };
        });
        const pending = work
            .then((runtime) => {
                controller.signal.throwIfAborted();
                if (this.controller !== controller) throw new DOMException("Preparation superseded", "AbortError");
                this.prepared = runtime;
                Reflect.set(window, "__gameResourcesPrepared", true);
                this.setProgress(1, controller.signal);
                return runtime;
            })
            .catch((error: unknown) => {
                if (error instanceof ReloadRequiredError) this.reloadFailure = error;
                if (this.controller === controller) this.error = error;
                throw error;
            })
            .finally(() => {
                if (this.pending === pending) this.pending = null;
                if (this.controller === controller) this.controller = null;
            });
        this.pending = pending;
        return pending;
    }

    private async preloadResources(refs: readonly string[], controller: AbortController): Promise<void> {
        const signal = controller.signal;
        const unique = Array.from(new Set(refs));
        const audio = unique.filter((ref) => ref.toLowerCase().endsWith(".ogg"));
        const resources = unique.filter((ref) => !ref.toLowerCase().endsWith(".ogg"));
        let loaded = 0;
        let failed = false;
        let firstFailure: unknown;
        const runRequired = async (ref: string): Promise<void> => {
            signal.throwIfAborted();
            try {
                if (ref.toLowerCase().endsWith(".ogg")) await SoundStore.get().preloadAudioBuffer(ref, { signal });
                else await ResourceLoader.loadResource(ref, { signal });
                this.setProgress(++loaded / unique.length, signal);
            } catch (error) {
                if (!failed) {
                    failed = true;
                    firstFailure = error;
                    controller.abort(error);
                }
                throw error;
            }
        };
        await Promise.all([
            runSettledBatch(resources, RESOURCE_PRELOAD_CONCURRENCY, runRequired),
            runSettledBatch(audio, AUDIO_PRELOAD_CONCURRENCY, runRequired)
        ]);
        if (failed) throw firstFailure;
        signal.throwIfAborted();
    }

    private setProgress(value: number, signal: AbortSignal): void {
        if (signal.aborted || this.controller?.signal !== signal) return;
        this.progress = value;
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

function isAbortFailure(error: unknown): boolean {
    return (
        (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
        (typeof error === "object" && error !== null && "name" in error && (error as { name?: unknown }).name === "AbortError")
    );
}
