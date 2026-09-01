import { SoundStore } from "slick2d-ts/slick/openal/SoundStore";
import { ResourceLoader } from "slick2d-ts/slick/util/ResourceLoader";
import versionInfo from "../../../version.json";

const RESOURCE_CACHE_RETRY_COUNT = 5;
const RESOURCE_CACHE_RETRY_DELAY_MS = 250;

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

/** Owns lazy module loading and resource preloading independently of a game session. */
export class JackalRuntimeLoader {
    private prepared: PreparedRuntime | null = null;
    private pending: Promise<PreparedRuntime> | null = null;
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

    public async ensurePrepared(forceRetry: boolean): Promise<PreparedRuntime> {
        if (this.prepared !== null) {
            return this.prepared;
        }
        if (forceRetry) {
            this.pending = null;
            this.failure = null;
        }
        if (this.pending === null) {
            ResourceLoader.clearFailures();
            this.configureResourceLoader();
            this.setProgress(0);
            const preparation = this.prepare()
                .then((runtime) => {
                    this.prepared = runtime;
                    this.failure = null;
                    this.setProgress(1);
                    return runtime;
                })
                .catch((error) => {
                    this.failure = error;
                    throw error;
                })
                .finally(() => {
                    if (this.pending === preparation) {
                        this.pending = null;
                    }
                });
            this.pending = preparation;
        }
        return this.pending;
    }

    private async prepare(): Promise<PreparedRuntime> {
        const [slick, resourceManifestModule] = await Promise.all([import("slick2d-ts"), import("./ResourceManifest.js")]);
        const [mainModule, gameStateStoreModule] = await Promise.all([import("../jackal/Main.js"), import("../jackal/persistence/JackalGameStateStore.js")]);
        await this.preloadResources(resourceManifestModule.RESOURCE_MANIFEST);
        return {
            slick,
            Main: mainModule.Main,
            JackalGameStateStore: gameStateStoreModule.JackalGameStateStore
        };
    }

    private async preloadResources(resourceManifest: readonly string[]): Promise<void> {
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
        await Promise.all([
            ResourceLoader.preloadResources(resourceRefs, (progress: ResourceLoadProgress) => {
                loadedResources = progress.loaded;
                updateProgress();
            }),
            SoundStore.get().preloadAudioBuffers(audioRefs, (progress: ResourceLoadProgress) => {
                loadedAudio = progress.loaded;
                updateProgress();
            })
        ]);
        this.setProgress(1);
    }

    private configureResourceLoader(): void {
        ResourceLoader.removeAllResourceLocations();
        ResourceLoader.addResourceLocation(getAppUrl("resources/"));
        ResourceLoader.setCacheBust(versionInfo.buildStamp);
        ResourceLoader.setRetryOptions(RESOURCE_CACHE_RETRY_COUNT, RESOURCE_CACHE_RETRY_DELAY_MS);
    }

    private setProgress(value: number): void {
        this.loadedFraction = value;
        this.progressChanged();
    }
}

function getAppUrl(path: string): string {
    const baseUrl = import.meta.env.BASE_URL;
    if (typeof baseUrl !== "string") {
        throw new Error("Vite BASE_URL is unavailable.");
    }
    return new URL(path, new URL(baseUrl, window.location.href)).toString();
}
