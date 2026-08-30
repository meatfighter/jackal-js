import type { AppGameContainer } from "slick2d-ts/slick/AppGameContainer";
import type { BufferedScalableGame, BufferedScalingMode } from "slick2d-ts";
import { SoundStore } from "slick2d-ts/slick/openal/SoundStore";
import { ResourceLoader } from "slick2d-ts/slick/util/ResourceLoader";
import type { Main } from "../jackal/Main.js";
import { GAME_STATE_STORAGE_KEY, GAME_STATE_VERSION } from "../jackal/persistence/GameStateSchema.js";
import type { JackalGameStateStore } from "../jackal/persistence/JackalGameStateStore.js";
import { getDeploymentStorageKey } from "./DeploymentStorageKeys.js";
import { JackalInputMappingStore } from "./JackalInputMappingStore.js";
import { registerServiceWorker } from "./ServiceWorkerRegistrar.js";
import versionInfo from "../../../version.json";
const GAME_DISPLAY_WIDTH = 1024;
const GAME_DISPLAY_HEIGHT = 960;
const GAME_CURSOR_HIDE_DELAY_MS = 3000;
const VOLUME_STORAGE_KEY = "jackal-volume";
const DEFAULT_VOLUME = 0.1;
const SCALING_STORAGE_KEY = "jackal-scaling";
const SCALING_MODE_DEFINITIONS = [
    { value: "smooth", label: "Smooth" },
    { value: "crisp", label: "Crisp" },
    { value: "pixel-perfect", label: "Pixel Perfect" }
] as const;
const DEFAULT_SCALING_PREFERENCE: JackalScalingPreference = "smooth";
const PWA_RESET_STORAGE_KEYS = [GAME_STATE_STORAGE_KEY, VOLUME_STORAGE_KEY, SCALING_STORAGE_KEY] as const;
const HIGH_DPI_ENABLED = true;
const MAX_DEVICE_PIXEL_RATIO = 2;
const RESOURCE_CACHE_RETRY_COUNT = 5;
const RESOURCE_CACHE_RETRY_DELAY_MS = 250;
const PICKER_BREATHING_ROOM_PX = 10;

type SlickRuntimeModule = typeof import("slick2d-ts");
type MainConstructor = typeof import("../jackal/Main.js").Main;
type JackalGameStateStoreConstructor = typeof import("../jackal/persistence/JackalGameStateStore.js").JackalGameStateStore;
type ScalingModeDefinition = (typeof SCALING_MODE_DEFINITIONS)[number];
type JackalScalingPreference = ScalingModeDefinition["value"];

interface ResourceLoadProgress {
    readonly loaded: number;
}

interface PreparedRuntime {
    readonly slick: SlickRuntimeModule;
    readonly Main: MainConstructor;
    readonly JackalGameStateStore: JackalGameStateStoreConstructor;
}

export class JackalWebApp {
    private readonly root: HTMLElement;
    private readonly inputMappingStore = new JackalInputMappingStore();
    private gameStateStore: JackalGameStateStore | null = null;
    private preparedRuntime: PreparedRuntime | null = null;
    private preparationPromise: Promise<PreparedRuntime> | null = null;
    private preparationError: unknown = null;
    private preparationProgress = 0;
    private backgroundPreparationScheduled = false;
    private container: AppGameContainer | null = null;
    private game: Main | null = null;
    private activeGameShell: HTMLElement | null = null;
    private activeGameHost: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private resizeAnimationFrame = 0;
    private hamburgerVisibilityAnimationFrame = 0;
    private cursorGameHost: HTMLElement | null = null;
    private cursorHideTimer = 0;
    private pointerOverGameHost = false;
    private menuOverlay: HTMLElement | null = null;
    private liveMenuOpen = false;
    private suspendedByFocusLoss = false;
    private suspendedByVisibilityLoss = false;
    private bufferedGame: BufferedScalableGame | null = null;
    private volume = safeReadVolume();
    private scalingPreference = safeReadScalingPreference();

    public constructor(root: HTMLElement) {
        this.root = root;
        registerServiceWorker(versionInfo.buildStamp);
        this.setupPageLifecycleHandlers();
    }

    public showMenu(errorMessage: string | null = null): void {
        this.destroyGame();
        this.renderMenu(this.root, this.hasPotentialSavedGameState(), errorMessage, false);
        this.scheduleBackgroundPreparation();
    }

    private renderMenu(parent: HTMLElement, canContinue: boolean, errorMessage: string | null, overlay: boolean): HTMLElement {
        const menu = document.createElement("main");
        menu.className = overlay ? "menu-screen menu-overlay" : "menu-screen";
        menu.style.visibility = "hidden";
        if (overlay) {
            menu.dataset.liveMenu = "true";
        }
        menu.innerHTML = `
            <section class="menu-panel" aria-label="Jackal menu">
                <label class="volume-row">
                    <span id="volume-icon" class="volume-icon" aria-hidden="true">${volumeIconSvg(this.volume)}</span>
                    <input id="volume-input" type="range" min="0" max="100" step="1" value="${Math.round(this.volume * 100)}" aria-label="Volume">
                    <span id="volume-value" class="volume-value">${Math.round(this.volume * 100)}</span>
                </label>
                <div class="setting-scaling-row" role="group" aria-label="Scaling">
                    <span>Scaling</span>
                    ${this.scalingPickerHtml()}
                </div>
                <div class="menu-buttons">
                    <button id="new-game-button" class="start-button" type="button">New Game</button>
                    <button id="continue-button" class="start-button" type="button"${canContinue ? "" : " disabled"}>Continue</button>
                </div>
                <button id="reset-button" class="reset-button" type="button">Reset</button>
                ${errorMessage ? `<p class="error-message">${escapeHtml(errorMessage)}</p>` : ""}
            </section>
        `;
        if (!overlay) {
            parent.innerHTML = "";
        }
        parent.appendChild(menu);
        this.bindMenuControls(menu);
        menu.style.visibility = "";
        return menu;
    }

    private bindMenuControls(menu: HTMLElement): void {
        const volumeInput = menu.querySelector<HTMLInputElement>("#volume-input");
        const volumeValue = menu.querySelector<HTMLElement>("#volume-value");
        const volumeIcon = menu.querySelector<HTMLElement>("#volume-icon");
        if (volumeInput === null || volumeValue === null || volumeIcon === null) {
            return;
        }
        const updateVolumeUi = (): void => {
            const percent = Math.round(this.volume * 100);
            volumeInput.style.setProperty("--thumb-position", `${percent}%`);
            volumeValue.textContent = String(percent);
            volumeIcon.innerHTML = volumeIconSvg(this.volume);
        };
        volumeInput.addEventListener("input", () => {
            this.setAudioVolume(Number(volumeInput.value) / 100);
            updateVolumeUi();
        });
        updateVolumeUi();
        this.bindScalingPicker(menu);

        menu.querySelector<HTMLButtonElement>("#new-game-button")?.addEventListener("click", () => {
            this.clearStoredGameState();
            this.setAudioVolume(Number(volumeInput.value) / 100);
            void this.startGame(false);
        });
        menu.querySelector<HTMLButtonElement>("#continue-button")?.addEventListener("click", () => {
            this.setAudioVolume(Number(volumeInput.value) / 100);
            if (this.hasLiveSuspendedGame()) {
                this.resumeLiveGameFromMenu();
                return;
            }
            void this.startGame(true);
        });
        menu.querySelector<HTMLButtonElement>("#reset-button")?.addEventListener("click", () => this.resetPwaState());
    }

    private scalingPickerHtml(): string {
        const selectedDefinition = getScalingDefinition(this.scalingPreference);
        return `
            <div id="scaling-picker" class="theme-picker scaling-picker" data-open="false">
                <button id="scaling-button" class="theme-picker-button scaling-picker-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="scaling-list">
                    <span class="theme-picker-label scaling-picker-label">${escapeHtml(selectedDefinition.label)}</span>
                    <span class="picker-caret" aria-hidden="true"></span>
                </button>
                <div id="scaling-popup" class="theme-picker-popup scaling-picker-popup" hidden>
                    <div id="scaling-list" class="theme-picker-list scaling-picker-list" role="listbox" aria-label="Scaling">
                        ${SCALING_MODE_DEFINITIONS.map((definition) => this.scalingOptionHtml(definition)).join("")}
                    </div>
                </div>
            </div>`;
    }

    private scalingOptionHtml(definition: ScalingModeDefinition): string {
        return `
            <button class="theme-picker-option scaling-picker-option" type="button" role="option" aria-selected="${definition.value === this.scalingPreference}" data-scaling-mode="${definition.value}">
                <span>${escapeHtml(definition.label)}</span>
                <span class="picker-caret-placeholder" aria-hidden="true"></span>
            </button>`;
    }

    private bindScalingPicker(menu: HTMLElement): void {
        const scalingPicker = menu.querySelector<HTMLElement>("#scaling-picker");
        const scalingButton = menu.querySelector<HTMLButtonElement>("#scaling-button");
        const scalingPopup = menu.querySelector<HTMLElement>("#scaling-popup");
        const scalingList = menu.querySelector<HTMLElement>("#scaling-list");
        if (scalingPicker === null || scalingButton === null || scalingPopup === null || scalingList === null) {
            return;
        }

        const scalingOptions = Array.from(menu.querySelectorAll<HTMLButtonElement>("[data-scaling-mode]"));
        measureScalingPickerWidth(scalingPicker, scalingButton, scalingPopup, scalingList);
        this.updateScalingUi(scalingPicker);

        const handleScalingChange = (value: string): void => {
            if (!isScalingPreference(value)) {
                this.updateScalingUi(scalingPicker);
                return;
            }
            this.setScalingPreference(value);
            this.updateScalingUi(scalingPicker);
            setScalingPickerOpen(scalingPicker, scalingButton, scalingPopup, false);
            scalingButton.focus();
        };

        scalingButton.addEventListener("click", () => {
            setScalingPickerOpen(scalingPicker, scalingButton, scalingPopup, !isScalingPickerOpen(scalingPicker), true);
        });
        scalingButton.addEventListener("keydown", (event) => {
            if (event.key === " " || event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setScalingPickerOpen(scalingPicker, scalingButton, scalingPopup, true, true);
            }
        });
        scalingList.addEventListener("keydown", (event) => {
            const currentIndex = Math.max(
                0,
                scalingOptions.findIndex((option) => option === document.activeElement)
            );
            if (event.key === "Escape") {
                event.preventDefault();
                setScalingPickerOpen(scalingPicker, scalingButton, scalingPopup, false);
                scalingButton.focus();
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                scalingOptions[(currentIndex + 1) % scalingOptions.length]?.focus();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                scalingOptions[(currentIndex + scalingOptions.length - 1) % scalingOptions.length]?.focus();
            } else if (event.key === "Home") {
                event.preventDefault();
                scalingOptions[0]?.focus();
            } else if (event.key === "End") {
                event.preventDefault();
                scalingOptions[scalingOptions.length - 1]?.focus();
            } else if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                const target = document.activeElement;
                if (target instanceof HTMLElement) {
                    handleScalingChange(target.dataset.scalingMode ?? "");
                }
            }
        });
        for (const option of scalingOptions) {
            option.addEventListener("click", () => handleScalingChange(option.dataset.scalingMode ?? ""));
        }
        menu.addEventListener("click", (event) => {
            if (event.target instanceof Node && !scalingPicker.contains(event.target)) {
                setScalingPickerOpen(scalingPicker, scalingButton, scalingPopup, false);
            }
        });
        scalingPicker.addEventListener("focusout", () => {
            window.setTimeout(() => {
                if (!scalingPicker.contains(document.activeElement)) {
                    setScalingPickerOpen(scalingPicker, scalingButton, scalingPopup, false);
                }
            }, 0);
        });
    }

    private updateScalingUi(scalingPicker: HTMLElement): void {
        const selectedDefinition = getScalingDefinition(this.scalingPreference);
        const selectedLabel = scalingPicker.querySelector<HTMLElement>(".scaling-picker-label");
        if (selectedLabel !== null) {
            selectedLabel.textContent = selectedDefinition.label;
        }
        for (const option of scalingPicker.querySelectorAll<HTMLElement>("[data-scaling-mode]")) {
            option.setAttribute("aria-selected", String(option.dataset.scalingMode === this.scalingPreference));
        }
    }

    private setScalingPreference(value: JackalScalingPreference): void {
        this.scalingPreference = value;
        writeScalingPreference(value);
        if (this.preparedRuntime !== null) {
            this.bufferedGame?.setScalingMode(this.getBufferedScalingMode(this.preparedRuntime.slick));
        }
    }

    private getBufferedScalingMode(slick: SlickRuntimeModule): BufferedScalingMode {
        switch (this.scalingPreference) {
            case "crisp":
                return slick.BufferedScalingMode.Nearest;
            case "pixel-perfect":
                return slick.BufferedScalingMode.Integer;
            case "smooth":
            default:
                return slick.BufferedScalingMode.Linear;
        }
    }

    private resetPwaState(): void {
        this.destroyGame();
        this.clearPwaStorage();
        this.volume = DEFAULT_VOLUME;
        this.scalingPreference = DEFAULT_SCALING_PREFERENCE;
        this.applyAudioVolume(this.volume);
        this.renderMenu(this.root, false, null, false);
        this.scheduleBackgroundPreparation();
    }

    private clearPwaStorage(): void {
        for (const key of PWA_RESET_STORAGE_KEYS) {
            try {
                localStorage.removeItem(getDeploymentStorageKey(key));
            } catch {
                // Storage can be disabled in hardened/private browser contexts.
            }
        }
        this.inputMappingStore.clear();
        this.gameStateStore?.clear();
        this.gameStateStore = null;
    }

    private hasLiveSuspendedGame(): boolean {
        return this.liveMenuOpen && this.menuOverlay !== null && this.game !== null && this.container !== null;
    }

    private showLiveMenuOverlay(): void {
        if (this.game === null || this.container === null || this.activeGameShell === null) {
            this.showMenu();
            return;
        }
        this.removeMenuOverlay();
        this.liveMenuOpen = true;
        this.saveCurrentInputMapping();
        if (!this.game.browserSuspended) {
            this.saveCurrentGameState();
        }
        this.game.setBrowserSuspended(true);
        this.container.stopSoundEffects();
        this.container.setLoopSuspended(true);
        this.container.getInput().pause();
        this.stopHamburgerVisibilityMonitor();
        this.hideHamburgerButton();
        this.stopGameCursorAutoHide();
        this.menuOverlay = this.renderMenu(this.activeGameShell, true, null, true);
    }

    private resumeLiveGameFromMenu(): void {
        if (this.game === null || this.container === null) {
            void this.startGame(true);
            return;
        }
        this.removeMenuOverlay();
        this.container.getInput().resume();
        this.game.clearInputPressedRecords();
        if (this.activeGameHost !== null) {
            this.startGameCursorAutoHide(this.activeGameHost);
        }
        this.startHamburgerVisibilityMonitor();
        this.setAudioVolume(this.volume);
        this.scheduleResponsiveGameResize();
        this.focusGameCanvas();
        this.applyCurrentGameLifecycleSuspension();
    }

    private removeMenuOverlay(): void {
        this.menuOverlay?.remove();
        this.menuOverlay = null;
        this.liveMenuOpen = false;
    }

    private focusGameCanvas(): void {
        const canvas = this.activeGameHost?.querySelector<HTMLCanvasElement>("canvas");
        canvas?.focus();
    }

    private hideHamburgerButton(): void {
        const hamburger = this.root.querySelector<HTMLButtonElement>("#hamburger-button");
        if (hamburger !== null) {
            hamburger.hidden = true;
        }
    }

    private async startGame(restoreSavedGame: boolean): Promise<void> {
        const audioUnlockPromise = this.unlockAudio();
        this.destroyGame();

        try {
            if (this.preparedRuntime === null) {
                this.renderLoading(this.preparationProgress);
            }

            const runtime = await this.ensureRuntimePrepared(this.preparationError !== null);
            await audioUnlockPromise;
            this.setAudioVolume(this.volume);
            await this.launchPreparedGame(runtime, restoreSavedGame);
        } catch (error) {
            console.error(error);
            if (restoreSavedGame) {
                this.showMenu("Unable to restore the saved game. Start a new game and try again.");
                return;
            }
            this.showLoadError("Unable to start.", "Check your connection and try again.", () => {
                void this.startGame(false);
            });
        }
    }

    private async launchPreparedGame(runtime: PreparedRuntime, restoreSavedGame: boolean): Promise<void> {
        if (restoreSavedGame && !this.getGameStateStore(runtime).hasValidSave()) {
            this.showMenu();
            return;
        }

        const host = this.showGameShell();
        this.activeGameHost = host;
        runtime.slick.Display.setParent(host);

        const mainGame = new runtime.Main();
        this.inputMappingStore.restore(mainGame.buttonMapping);

        const bufferedGame = new runtime.slick.BufferedScalableGame(mainGame, GAME_DISPLAY_WIDTH, GAME_DISPLAY_HEIGHT, {
            maintainAspect: true,
            scalingMode: this.getBufferedScalingMode(runtime.slick)
        });
        const displayMode = this.getResponsiveWindowedDisplayMode();
        const appContainer = new runtime.slick.AppGameContainer(bufferedGame, displayMode.width, displayMode.height, false);
        appContainer.setPreserveAudioCacheOnDestroy(true);
        appContainer.setLoopSuspended(true);
        appContainer.setHighDpiEnabled(HIGH_DPI_ENABLED);
        appContainer.setMaxDevicePixelRatio(MAX_DEVICE_PIXEL_RATIO);
        this.container = appContainer;
        this.game = mainGame;
        this.bufferedGame = bufferedGame;
        mainGame.appGameContainer = appContainer;
        mainGame.stateSaveInvalidatedHandler = () => this.clearStoredGameState();
        mainGame.inputMappingChangedHandler = () => this.saveCurrentInputMapping();
        mainGame.windowedDisplayModeProvider = () => this.getResponsiveWindowedDisplayMode();
        mainGame.browserFullscreenController = {
            isFullscreen: () => this.isGameShellFullscreen(),
            enterFullscreen: () => this.enterGameShellFullscreen(),
            exitFullscreen: () => this.exitGameShellFullscreen()
        };
        if (restoreSavedGame) {
            mainGame.loadingCompleteHandler = (gc) => {
                if (!this.getGameStateStore(runtime).restore(mainGame, gc)) {
                    throw new Error("Saved game could not be restored.");
                }
                return true;
            };
        }
        mainGame.loadingFinishedHandler = () => {
            this.preparationProgress = 1;
        };

        appContainer.setAlwaysRender(true);
        appContainer.setVSync(true);
        appContainer.setSmoothDeltas(false);
        appContainer.setShowFPS(false);
        appContainer.setClearEachFrame(true);
        await Promise.resolve(appContainer.setDisplayMode(displayMode.width, displayMode.height, false));
        await appContainer.start();
        await ResourceLoader.waitForAll();

        appContainer.setErrorHandler((error: unknown) => {
            console.error(error);
            this.showLoadError("Unable to start.", "Check your connection and try again.", () => {
                void this.startGame(restoreSavedGame);
            });
        });
        this.startResponsiveGameSizing(host);
        this.startGameCursorAutoHide(host);
        this.startHamburgerVisibilityMonitor();
        this.setAudioVolume(this.volume);
        this.focusGameCanvas();
        mainGame.clearInputPressedRecords();
        this.syncCurrentGameLifecycleSuspension();
    }

    private showGameShell(): HTMLElement {
        this.root.innerHTML = `
            <div id="game-shell" class="game-shell">
                <div id="game-host" class="game-host"></div>
                <button id="hamburger-button" class="hamburger-button" type="button" aria-label="Return to menu" hidden>
                    <span></span>
                </button>
            </div>
        `;
        this.activeGameShell = this.root.querySelector<HTMLElement>("#game-shell");
        const hamburger = this.root.querySelector<HTMLButtonElement>("#hamburger-button");
        hamburger?.addEventListener("click", () => this.returnToMenu());
        return this.root.querySelector<HTMLElement>("#game-host") as HTMLElement;
    }

    private returnToMenu(): void {
        if (this.game?.isLoadingScreenActive()) {
            return;
        }
        if (this.game !== null && this.container !== null) {
            this.showLiveMenuOverlay();
            return;
        }
        this.showMenu();
    }

    private saveCurrentGameState(): boolean {
        if (this.game === null || this.preparedRuntime === null) {
            return false;
        }
        if (!this.game.isStateSaveReady()) {
            return false;
        }
        return this.getGameStateStore(this.preparedRuntime).save(this.game);
    }

    private clearStoredGameState(): void {
        try {
            localStorage.removeItem(getDeploymentStorageKey(GAME_STATE_STORAGE_KEY));
        } catch {
            // Storage can be disabled in hardened/private browser contexts.
        }
        this.gameStateStore?.clear();
    }

    private saveCurrentInputMapping(): boolean {
        if (this.game === null) {
            return false;
        }
        return this.inputMappingStore.save(this.game.buttonMapping);
    }

    private renderLoading(progress: number): void {
        const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
        const progressShell = this.root.querySelector<HTMLElement>("[data-loading-progress='true']");
        const progressBar = this.root.querySelector<HTMLElement>(".progress-bar");
        if (progressShell !== null && progressBar !== null) {
            progressShell.setAttribute("aria-valuenow", String(percent));
            progressBar.style.setProperty("--progress", `${percent}%`);
            return;
        }
        this.root.innerHTML = `
            <main class="boot-screen" role="status" aria-label="Loading">
                <section class="boot-progress" aria-live="polite">
                    <div class="progress-shell" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" data-loading-progress="true">
                        <div class="progress-bar" style="--progress: ${percent}%"></div>
                    </div>
                </section>
            </main>
        `;
    }

    private refreshVisibleLoadingProgress(): void {
        if (this.root.querySelector("[data-loading-progress='true']") !== null) {
            this.renderLoading(this.preparationProgress);
        }
    }

    private showError(message: string): void {
        this.showLoadError("Unable to start.", message, () => this.showMenu());
    }

    private showLoadError(title: string, message: string, retryHandler: () => void): void {
        this.destroyGame();
        this.root.innerHTML = `
            <main class="boot-screen boot-failed" role="alert">
                <section class="load-error-panel" aria-label="${escapeHtml(title)}">
                    <div class="failure-icon" aria-hidden="true">&#x1F480;</div>
                    <div class="boot-title">${escapeHtml(title)}</div>
                    <p class="boot-error">${escapeHtml(message)}</p>
                    <button id="retry-button" class="retry-button" type="button">Retry</button>
                </section>
            </main>
        `;
        this.root.querySelector<HTMLButtonElement>("#retry-button")?.addEventListener("click", retryHandler);
    }

    private destroyGame(): void {
        this.removeMenuOverlay();
        this.saveCurrentInputMapping();
        this.resetLifecycleSuspension();
        this.stopHamburgerVisibilityMonitor();
        this.stopGameCursorAutoHide();
        this.stopResponsiveGameSizing();
        this.game?.stopAllSounds();
        this.exitGameShellFullscreen();
        if (this.container !== null) {
            this.container.destroy();
            this.container = null;
        } else {
            SoundStore.get().stopAllPlayback();
        }
        this.game = null;
        this.bufferedGame = null;
        this.activeGameShell = null;
        this.activeGameHost = null;
        this.preparedRuntime?.slick.Display.setParent(null);
    }

    private scheduleBackgroundPreparation(): void {
        if (this.preparedRuntime !== null || this.preparationPromise !== null || this.preparationError !== null || this.backgroundPreparationScheduled) {
            return;
        }
        this.backgroundPreparationScheduled = true;
        window.setTimeout(() => {
            this.backgroundPreparationScheduled = false;
            void this.ensureRuntimePrepared(false).catch((error) => {
                console.warn("Unable to prepare Jackal resources in the background.", error);
            });
        }, 0);
    }

    private async ensureRuntimePrepared(forceRetry: boolean): Promise<PreparedRuntime> {
        if (this.preparedRuntime !== null) {
            return this.preparedRuntime;
        }
        if (forceRetry) {
            this.preparationPromise = null;
            this.preparationError = null;
        }
        if (this.preparationPromise === null) {
            ResourceLoader.clearFailures();
            this.configureResourceLoader();
            this.preparationProgress = 0;
            this.refreshVisibleLoadingProgress();
            this.preparationPromise = this.prepareRuntime()
                .then((runtime) => {
                    this.preparedRuntime = runtime;
                    this.preparationError = null;
                    this.preparationProgress = 1;
                    this.refreshVisibleLoadingProgress();
                    return runtime;
                })
                .catch((error) => {
                    this.preparationPromise = null;
                    this.preparationError = error;
                    throw error;
                });
        }
        return this.preparationPromise;
    }

    private async prepareRuntime(): Promise<PreparedRuntime> {
        const [slick, resourceManifestModule] = await Promise.all([import("slick2d-ts"), import("./ResourceManifest.js")]);
        const mainModule = await import("../jackal/Main.js");
        const gameStateStoreModule = await import("../jackal/persistence/JackalGameStateStore.js");
        await this.preloadPreparedResources(resourceManifestModule.RESOURCE_MANIFEST);
        return {
            slick,
            Main: mainModule.Main,
            JackalGameStateStore: gameStateStoreModule.JackalGameStateStore
        };
    }

    private async preloadPreparedResources(resourceManifest: string[]): Promise<void> {
        const audioRefs: string[] = [];
        const resourceRefs: string[] = [];
        for (const ref of resourceManifest) {
            if (isAudioResourceRef(ref)) {
                audioRefs.push(ref);
            } else {
                resourceRefs.push(ref);
            }
        }

        const total = audioRefs.length + resourceRefs.length;
        if (total === 0) {
            this.preparationProgress = 1;
            this.refreshVisibleLoadingProgress();
            return;
        }

        let loadedAudio = 0;
        let loadedResources = 0;
        const updateProgress = (): void => {
            this.preparationProgress = (loadedAudio + loadedResources) / total;
            this.refreshVisibleLoadingProgress();
        };

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
        this.preparationProgress = 1;
        this.refreshVisibleLoadingProgress();
    }

    private configureResourceLoader(): void {
        ResourceLoader.removeAllResourceLocations();
        ResourceLoader.addResourceLocation(getAppUrl("resources/"));
        ResourceLoader.setCacheBust(versionInfo.buildStamp);
        ResourceLoader.setRetryOptions(RESOURCE_CACHE_RETRY_COUNT, RESOURCE_CACHE_RETRY_DELAY_MS);
    }

    private getGameStateStore(runtime: PreparedRuntime): JackalGameStateStore {
        if (this.gameStateStore === null) {
            this.gameStateStore = new runtime.JackalGameStateStore(versionInfo.version);
        }
        return this.gameStateStore;
    }

    private hasPotentialSavedGameState(): boolean {
        try {
            const text = localStorage.getItem(getDeploymentStorageKey(GAME_STATE_STORAGE_KEY));
            if (text === null) {
                return false;
            }
            let snapshot: unknown;
            try {
                snapshot = JSON.parse(text) as unknown;
            } catch {
                this.clearStoredGameState();
                return false;
            }
            if (!isPotentialGameStateSnapshot(snapshot)) {
                if (!isFutureGameStateSnapshot(snapshot)) {
                    this.clearStoredGameState();
                }
                return false;
            }
            return true;
        } catch (error) {
            console.warn("Unable to inspect Jackal saved game state.", error);
            return false;
        }
    }

    private startResponsiveGameSizing(host: HTMLElement): void {
        this.stopResponsiveGameSizing();
        this.activeGameHost = host;
        if ("ResizeObserver" in window) {
            this.resizeObserver = new ResizeObserver(() => this.scheduleResponsiveGameResize());
            this.resizeObserver.observe(host);
        }
        window.addEventListener("resize", this.scheduleResponsiveGameResize);
        document.addEventListener("fullscreenchange", this.scheduleResponsiveGameResize);
        this.scheduleResponsiveGameResize();
    }

    private stopResponsiveGameSizing(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        window.removeEventListener("resize", this.scheduleResponsiveGameResize);
        document.removeEventListener("fullscreenchange", this.scheduleResponsiveGameResize);
        if (this.resizeAnimationFrame !== 0) {
            cancelAnimationFrame(this.resizeAnimationFrame);
            this.resizeAnimationFrame = 0;
        }
    }

    private readonly scheduleResponsiveGameResize = (): void => {
        if (this.resizeAnimationFrame !== 0) {
            return;
        }
        this.resizeAnimationFrame = requestAnimationFrame(() => {
            this.resizeAnimationFrame = 0;
            this.applyResponsiveGameDisplayMode();
        });
    };

    private applyResponsiveGameDisplayMode(): void {
        if (this.container === null || this.activeGameHost === null) {
            return;
        }

        const fullscreenElement = document.fullscreenElement;
        if (fullscreenElement !== null && fullscreenElement !== this.activeGameShell) {
            return;
        }

        const displayMode = this.getResponsiveWindowedDisplayMode();
        try {
            void Promise.resolve(this.container.setDisplayMode(displayMode.width, displayMode.height, false)).catch((error) => {
                console.error(error);
                this.showError("Unable to resize the game. Reload the page and try again.");
            });
        } catch (error) {
            console.error(error);
            this.showError("Unable to resize the game. Reload the page and try again.");
        }
    }

    private getResponsiveWindowedDisplayMode(): { width: number; height: number } {
        const host = this.activeGameHost ?? this.root.querySelector<HTMLElement>("#game-host");
        const fallback = this.getResponsiveFullscreenDisplayMode();
        if (host === null) {
            return fallback;
        }

        const rect = host.getBoundingClientRect();
        const width = host.clientWidth || rect.width || fallback.width;
        const height = host.clientHeight || rect.height || fallback.height;
        return getAspectFitDisplayMode(width, height);
    }

    private getResponsiveFullscreenDisplayMode(): { width: number; height: number } {
        const viewport = window.visualViewport;
        const width = viewport?.width || window.innerWidth || document.documentElement.clientWidth || GAME_DISPLAY_WIDTH;
        const height = viewport?.height || window.innerHeight || document.documentElement.clientHeight || GAME_DISPLAY_HEIGHT;
        return normalizeDisplayMode(width, height);
    }

    private isGameShellFullscreen(): boolean {
        return this.activeGameShell !== null && document.fullscreenElement === this.activeGameShell;
    }

    private enterGameShellFullscreen(): void {
        if (this.activeGameShell === null || this.isGameShellFullscreen() || !this.activeGameShell.requestFullscreen) {
            return;
        }
        void this.activeGameShell
            .requestFullscreen()
            .then(() => {
                this.updateHamburgerVisibility();
                this.scheduleResponsiveGameResize();
            })
            .catch((error) => {
                console.error(error);
            });
    }

    private exitGameShellFullscreen(): void {
        if (!this.isGameShellFullscreen() || !document.exitFullscreen) {
            return;
        }
        void document
            .exitFullscreen()
            .then(() => {
                this.updateHamburgerVisibility();
                this.scheduleResponsiveGameResize();
            })
            .catch((error) => {
                console.error(error);
            });
    }

    private startHamburgerVisibilityMonitor(): void {
        this.stopHamburgerVisibilityMonitor();
        document.addEventListener("fullscreenchange", this.updateHamburgerVisibility);
        this.updateHamburgerVisibility();
    }

    private stopHamburgerVisibilityMonitor(): void {
        document.removeEventListener("fullscreenchange", this.updateHamburgerVisibility);
        if (this.hamburgerVisibilityAnimationFrame !== 0) {
            cancelAnimationFrame(this.hamburgerVisibilityAnimationFrame);
            this.hamburgerVisibilityAnimationFrame = 0;
        }
    }

    private readonly updateHamburgerVisibility = (): void => {
        const hamburger = this.root.querySelector<HTMLButtonElement>("#hamburger-button");
        const hidden = this.liveMenuOpen || this.game === null || this.game.isLoadingScreenActive() || this.isGameShellFullscreen();
        if (!hidden) {
            this.applyCurrentGameLifecycleSuspension();
        }
        if (hamburger !== null) {
            hamburger.hidden = hidden;
        }
        if (this.game !== null && this.game.isLoadingScreenActive()) {
            this.hamburgerVisibilityAnimationFrame = requestAnimationFrame(() => {
                this.hamburgerVisibilityAnimationFrame = 0;
                this.updateHamburgerVisibility();
            });
        }
    };

    private startGameCursorAutoHide(host: HTMLElement): void {
        this.stopGameCursorAutoHide();
        this.cursorGameHost = host;
        this.pointerOverGameHost = isElementHovered(host);
        host.addEventListener("pointerenter", this.handleGamePointerEnter);
        host.addEventListener("pointerleave", this.handleGamePointerLeave);
        host.addEventListener("pointermove", this.handleGameMouseInput);
        host.addEventListener("pointerdown", this.handleGameMouseInput);
        host.addEventListener("pointerup", this.handleGameMouseInput);
        host.addEventListener("wheel", this.handleGameMouseInput, { passive: true });
        this.showGameCursor();
        this.scheduleGameCursorHide();
    }

    private stopGameCursorAutoHide(): void {
        if (this.cursorGameHost !== null) {
            this.cursorGameHost.removeEventListener("pointerenter", this.handleGamePointerEnter);
            this.cursorGameHost.removeEventListener("pointerleave", this.handleGamePointerLeave);
            this.cursorGameHost.removeEventListener("pointermove", this.handleGameMouseInput);
            this.cursorGameHost.removeEventListener("pointerdown", this.handleGameMouseInput);
            this.cursorGameHost.removeEventListener("pointerup", this.handleGameMouseInput);
            this.cursorGameHost.removeEventListener("wheel", this.handleGameMouseInput);
            this.cursorGameHost.classList.remove("cursor-hidden");
        }
        this.clearGameCursorHideTimer();
        this.pointerOverGameHost = false;
        this.cursorGameHost = null;
    }

    private readonly handleGamePointerEnter = (): void => {
        this.pointerOverGameHost = true;
        this.handleGameMouseInput();
    };

    private readonly handleGamePointerLeave = (): void => {
        this.pointerOverGameHost = false;
        this.showGameCursor();
        this.clearGameCursorHideTimer();
    };

    private readonly handleGameMouseInput = (): void => {
        this.showGameCursor();
        this.scheduleGameCursorHide();
    };

    private scheduleGameCursorHide(): void {
        this.clearGameCursorHideTimer();
        if (this.cursorGameHost === null || !this.pointerOverGameHost) {
            return;
        }
        this.cursorHideTimer = window.setTimeout(() => {
            this.cursorHideTimer = 0;
            this.hideGameCursorIfIdle();
        }, GAME_CURSOR_HIDE_DELAY_MS);
    }

    private hideGameCursorIfIdle(): void {
        if (this.cursorGameHost === null || !this.pointerOverGameHost) {
            this.showGameCursor();
            return;
        }
        this.cursorGameHost.classList.add("cursor-hidden");
    }

    private showGameCursor(): void {
        this.cursorGameHost?.classList.remove("cursor-hidden");
    }

    private clearGameCursorHideTimer(): void {
        if (this.cursorHideTimer !== 0) {
            clearTimeout(this.cursorHideTimer);
            this.cursorHideTimer = 0;
        }
    }

    private setupPageLifecycleHandlers(): void {
        window.addEventListener("pagehide", () => this.suspendCurrentGameForPageHide());
        window.addEventListener("pageshow", () => this.syncCurrentGameLifecycleSuspension());
        window.addEventListener("blur", () => this.handleWindowBlur());
        window.addEventListener("focus", () => this.handleWindowFocus());
        document.addEventListener("visibilitychange", () => this.handleVisibilityChange());
    }

    private suspendCurrentGameForPageHide(): void {
        this.suspendedByVisibilityLoss = true;
        this.applyCurrentGameLifecycleSuspension();
    }

    private syncCurrentGameLifecycleSuspension(): void {
        if (this.game === null) {
            this.resetLifecycleSuspension();
            return;
        }

        this.suspendedByVisibilityLoss = document.visibilityState !== "visible";
        this.suspendedByFocusLoss = !document.hasFocus();
        this.applyCurrentGameLifecycleSuspension();
    }

    private handleWindowBlur(): void {
        this.suspendedByFocusLoss = true;
        this.applyCurrentGameLifecycleSuspension();
    }

    private handleWindowFocus(): void {
        this.suspendedByFocusLoss = false;
        this.applyCurrentGameLifecycleSuspension();
    }

    private handleVisibilityChange(): void {
        this.suspendedByVisibilityLoss = document.visibilityState !== "visible";
        if (!this.suspendedByVisibilityLoss) {
            this.suspendedByFocusLoss = !document.hasFocus();
        }
        this.applyCurrentGameLifecycleSuspension();
    }

    private applyCurrentGameLifecycleSuspension(): void {
        if (this.game === null) {
            this.resetLifecycleSuspension();
            return;
        }
        if (this.game.isLoadingScreenActive()) {
            return;
        }
        if (this.liveMenuOpen || this.suspendedByVisibilityLoss || this.suspendedByFocusLoss) {
            this.suspendCurrentGameForLifecycle();
            return;
        }

        this.resumeCurrentGameForLifecycle();
    }

    private suspendCurrentGameForLifecycle(): void {
        if (this.game === null || this.game.isLoadingScreenActive()) {
            return;
        }
        if (!this.game.browserSuspended) {
            this.saveCurrentGameState();
        }
        this.game.setBrowserSuspended(true);
        this.container?.stopSoundEffects();
        this.container?.setLoopSuspended(true);
    }

    private resumeCurrentGameForLifecycle(): void {
        if (this.liveMenuOpen || this.game === null || this.game.isLoadingScreenActive()) {
            return;
        }
        this.game.setBrowserSuspended(false);
        this.container?.setLoopSuspended(false);
    }

    private resetLifecycleSuspension(): void {
        this.suspendedByFocusLoss = false;
        this.suspendedByVisibilityLoss = false;
    }

    private async unlockAudio(): Promise<void> {
        await SoundStore.get().unlock();
    }

    private setAudioVolume(value: number): void {
        this.volume = clampVolume(value, this.volume);
        writeVolume(this.volume);
        this.applyAudioVolume(this.volume);
    }

    private applyAudioVolume(value: number): void {
        const clampedValue = clampVolume(value, this.volume);
        const soundVolume = Math.sqrt(clampedValue);
        SoundStore.get().setSoundVolume(soundVolume);
        SoundStore.get().setMusicVolume(clampedValue);
        this.container?.setSoundVolume(soundVolume);
        this.container?.setMusicVolume(clampedValue);
    }
}

function getAspectFitDisplayMode(width: number, height: number): { width: number; height: number } {
    const displayMode = normalizeDisplayMode(width, height);
    const gameAspectRatio = GAME_DISPLAY_WIDTH / GAME_DISPLAY_HEIGHT;
    const displayAspectRatio = displayMode.width / displayMode.height;
    if (displayAspectRatio > gameAspectRatio) {
        return normalizeDisplayMode(displayMode.height * gameAspectRatio, displayMode.height);
    }
    return normalizeDisplayMode(displayMode.width, displayMode.width / gameAspectRatio);
}

function normalizeDisplayMode(width: number, height: number): { width: number; height: number } {
    return {
        width: Math.max(1, Math.trunc(width)),
        height: Math.max(1, Math.trunc(height))
    };
}

function getAppUrl(path: string): string {
    return new URL(path, new URL(import.meta.env.BASE_URL, window.location.href)).toString();
}

function isAudioResourceRef(ref: string): boolean {
    return ref.endsWith(".ogg");
}

const POTENTIAL_STANDALONE_MODE_IDS = [
    "INTRO",
    "HERE",
    "YEAH",
    "WE_MADE_IT",
    "SUNSET",
    "HARD_ENDING",
    "MAP",
    "CONTINUE",
    "DIFFICULTY",
    "OPTIONS",
    "INPUT",
    "INTRO_MAP"
];

function isPotentialGameStateSnapshot(snapshot: unknown): boolean {
    if (!isRecord(snapshot)) {
        return false;
    }
    if (snapshot.version !== GAME_STATE_VERSION || (snapshot.kind !== "game" && snapshot.kind !== "mode")) {
        return false;
    }
    if (!isPotentialBaseSnapshot(snapshot)) {
        return false;
    }
    if (snapshot.kind === "game") {
        return isPotentialGameModeSnapshot(snapshot.gameMode) && isPotentialEncodedRecord(snapshot.playerFields, collectPotentialEntityIds(snapshot.gameMode));
    }
    return POTENTIAL_STANDALONE_MODE_IDS.includes(String(snapshot.modeId)) && isPotentialEncodedRecord(snapshot.modeFields, new Set<number>());
}

function isFutureGameStateSnapshot(snapshot: unknown): boolean {
    return isRecord(snapshot) && Number.isInteger(snapshot.version) && (snapshot.version as number) > GAME_STATE_VERSION;
}

function isPotentialBaseSnapshot(snapshot: Record<string, unknown>): boolean {
    const emptyEntityIds = new Set<number>();
    return (
        isPotentialEncodedRecord(snapshot.mainFields, emptyEntityIds) &&
        isPotentialMainFields(snapshot.mainFields) &&
        (snapshot.konamiCodeFields === null || isPotentialEncodedRecord(snapshot.konamiCodeFields, emptyEntityIds)) &&
        isPotentialRandomSnapshot(snapshot.random) &&
        isNonNegativeInteger(snapshot.friendlySoldierCount) &&
        isPotentialAudioStateSnapshot(snapshot.audioState)
    );
}

function isPotentialMainFields(value: unknown): boolean {
    if (!isRecord(value)) {
        return false;
    }
    return isNonNegativeInteger(value.loadIndex) && value.loadIndex >= 42 && isIntegerInRange(value.stageIndex, 0, 5) && typeof value.hardMode === "boolean";
}

function isPotentialGameModeSnapshot(value: unknown): boolean {
    if (!isRecord(value) || !Array.isArray(value.entities) || !Array.isArray(value.elements)) {
        return false;
    }
    const entityIds = collectPotentialEntityIds(value);
    if (entityIds === null || !isPotentialEncodedRecord(value.fields, entityIds)) {
        return false;
    }
    for (const entity of value.entities) {
        if (!isRecord(entity) || typeof entity.type !== "string" || !isPotentialEncodedRecord(entity.fields, entityIds)) {
            return false;
        }
    }
    return isPotentialElementLayers(value.elements, entityIds);
}

function collectPotentialEntityIds(gameMode: unknown): Set<number> | null {
    if (!isRecord(gameMode) || !Array.isArray(gameMode.entities)) {
        return null;
    }
    const ids = new Set<number>();
    for (const entity of gameMode.entities) {
        if (!isRecord(entity) || !isNonNegativeInteger(entity.id) || ids.has(entity.id) || typeof entity.type !== "string") {
            return null;
        }
        ids.add(entity.id);
    }
    return ids;
}

function isPotentialElementLayers(value: unknown, entityIds: Set<number> | null): boolean {
    if (entityIds === null || !Array.isArray(value) || value.length !== 8) {
        return false;
    }
    const layerRefs = new Set<number>();
    for (const layer of value) {
        if (!Array.isArray(layer)) {
            return false;
        }
        for (const id of layer) {
            if (!isNonNegativeInteger(id) || !entityIds.has(id) || layerRefs.has(id)) {
                return false;
            }
            layerRefs.add(id);
        }
    }
    return true;
}

function isPotentialEncodedRecord(value: unknown, entityIds: Set<number> | null): boolean {
    return isRecord(value) && Object.values(value).every((entry) => isPotentialEncodedValue(entry, entityIds));
}

function isPotentialEncodedValue(value: unknown, entityIds: Set<number> | null): boolean {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return true;
    }
    if (typeof value === "number") {
        return Number.isFinite(value);
    }
    if (!isRecord(value) || typeof value.kind !== "string") {
        return false;
    }
    switch (value.kind) {
        case "nonFiniteNumber":
            return value.value === "NaN" || value.value === "Infinity" || value.value === "-Infinity";
        case "bigint":
            return typeof value.value === "string" && /^-?\d+$/.test(value.value);
        case "array":
        case "arrayList":
            return Array.isArray(value.items) && value.items.every((item) => isPotentialEncodedValue(item, entityIds));
        case "entityRef":
            return isNonNegativeInteger(value.id) && entityIds !== null && entityIds.has(value.id);
        case "playerRef":
        case "mainRef":
        case "gameModeRef":
        case "nullRef":
            return true;
        default:
            return false;
    }
}

function isPotentialRandomSnapshot(value: unknown): boolean {
    return isRecord(value) && Number.isFinite(value.seed0) && Number.isFinite(value.seed1) && Number.isFinite(value.seed2);
}

function isPotentialAudioStateSnapshot(value: unknown): boolean {
    return isRecord(value) && typeof value.musicOn === "boolean" && typeof value.soundOn === "boolean";
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function volumeIconSvg(value: number): string {
    const waves =
        Math.round(value * 100) === 0
            ? `<path d="M18 9l5 5m0-5l-5 5"></path>`
            : value < 0.33
              ? `<path d="M17 10a4 4 0 0 1 0 4"></path>`
              : value < 0.66
                ? `<path d="M17 8a6 6 0 0 1 0 8"></path><path d="M20 6a9 9 0 0 1 0 12"></path>`
                : `<path d="M17 8a6 6 0 0 1 0 8"></path><path d="M20 6a9 9 0 0 1 0 12"></path><path d="M23 4a12 12 0 0 1 0 16"></path>`;

    return `
        <svg viewBox="0 0 26 24" focusable="false" aria-hidden="true">
            <path d="M3 9v6h5l6 5V4L8 9H3z"></path>
            ${waves}
        </svg>`;
}

function safeReadVolume(): number {
    try {
        const value = Number.parseInt(localStorage.getItem(getDeploymentStorageKey(VOLUME_STORAGE_KEY)) ?? String(Math.round(DEFAULT_VOLUME * 100)), 10);
        if (!Number.isFinite(value)) {
            return DEFAULT_VOLUME;
        }
        return Math.max(0, Math.min(1, value / 100));
    } catch {
        return DEFAULT_VOLUME;
    }
}

function writeVolume(value: number): void {
    try {
        localStorage.setItem(getDeploymentStorageKey(VOLUME_STORAGE_KEY), String(Math.round(value * 100)));
    } catch {
        // Storage can be disabled in hardened/private browser contexts.
    }
}

function safeReadScalingPreference(): JackalScalingPreference {
    try {
        const value = localStorage.getItem(getDeploymentStorageKey(SCALING_STORAGE_KEY));
        if (isScalingPreference(value)) {
            return value;
        }
        if (value !== null) {
            writeScalingPreference(DEFAULT_SCALING_PREFERENCE);
        }
        return DEFAULT_SCALING_PREFERENCE;
    } catch {
        return DEFAULT_SCALING_PREFERENCE;
    }
}

function writeScalingPreference(value: JackalScalingPreference): void {
    try {
        localStorage.setItem(getDeploymentStorageKey(SCALING_STORAGE_KEY), value);
    } catch {
        // Storage can be disabled in hardened/private browser contexts.
    }
}

function isScalingPreference(value: unknown): value is JackalScalingPreference {
    return typeof value === "string" && SCALING_MODE_DEFINITIONS.some((definition) => definition.value === value);
}

function getScalingDefinition(value: JackalScalingPreference): ScalingModeDefinition {
    return SCALING_MODE_DEFINITIONS.find((definition) => definition.value === value) ?? SCALING_MODE_DEFINITIONS[0];
}

function measureScalingPickerWidth(scalingPicker: HTMLElement, scalingButton: HTMLButtonElement, scalingPopup: HTMLElement, scalingList: HTMLElement): void {
    measurePickerWidth(
        scalingPicker,
        scalingButton,
        scalingPopup,
        scalingList,
        SCALING_MODE_DEFINITIONS.map((definition) => definition.label),
        [".picker-caret"],
        [".picker-caret-placeholder"]
    );
}

function measurePickerWidth(
    picker: HTMLElement,
    button: HTMLButtonElement,
    popup: HTMLElement,
    list: HTMLElement,
    labels: readonly string[],
    buttonAccessorySelectors: readonly string[],
    optionAccessorySelectors: readonly string[]
): void {
    const wasPopupHidden = popup.hidden;
    popup.hidden = false;
    const buttonStyle = window.getComputedStyle(button);
    const option = list.querySelector<HTMLElement>(".theme-picker-option");
    const optionStyle = option === null ? null : window.getComputedStyle(option);
    const popupStyle = window.getComputedStyle(popup);
    const listStyle = window.getComputedStyle(list);
    const buttonAccessoryWidth = getElementsOuterWidth(button, buttonAccessorySelectors);
    const optionAccessoryWidth = option === null ? 0 : getElementsOuterWidth(option, optionAccessorySelectors);
    const maxLabelWidth = measureWidestPickerLabel(picker, optionStyle ?? buttonStyle, labels);
    const scrollbarWidth = getElementVerticalScrollbarWidth(list, listStyle);
    const buttonWidth =
        maxLabelWidth +
        parseCssPixels(buttonStyle.columnGap) * buttonAccessorySelectors.length +
        buttonAccessoryWidth +
        horizontalSpacing(buttonStyle, true) +
        4;
    const optionWidth =
        optionStyle === null
            ? 0
            : maxLabelWidth +
              parseCssPixels(optionStyle.columnGap) * optionAccessorySelectors.length +
              optionAccessoryWidth +
              horizontalSpacing(optionStyle, false) +
              horizontalSpacing(popupStyle, true) +
              horizontalSpacing(listStyle, true) +
              scrollbarWidth +
              4;
    picker.style.setProperty("--theme-picker-width", `${Math.ceil(Math.max(buttonWidth, optionWidth) + PICKER_BREATHING_ROOM_PX)}px`);
    popup.hidden = wasPopupHidden;
}

function measureWidestPickerLabel(parent: HTMLElement, style: CSSStyleDeclaration, labels: readonly string[]): number {
    const probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.left = "-10000px";
    probe.style.top = "0";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "nowrap";
    probe.style.fontFamily = style.fontFamily;
    probe.style.fontSize = style.fontSize;
    probe.style.fontWeight = style.fontWeight;
    probe.style.fontStyle = style.fontStyle;
    probe.style.letterSpacing = style.letterSpacing;
    parent.appendChild(probe);
    let maxLabelWidth = 0;
    for (const label of labels) {
        probe.textContent = label;
        maxLabelWidth = Math.max(maxLabelWidth, probe.getBoundingClientRect().width);
    }
    probe.remove();
    return maxLabelWidth;
}

function getElementsOuterWidth(parent: HTMLElement, selectors: readonly string[]): number {
    return selectors.reduce((width, selector) => width + getElementOuterWidth(parent.querySelector<HTMLElement>(selector)), 0);
}

function getElementOuterWidth(element: HTMLElement | null): number {
    return element?.getBoundingClientRect().width ?? 0;
}

function getElementVerticalScrollbarWidth(element: HTMLElement, style: CSSStyleDeclaration): number {
    const borderWidth = parseCssPixels(style.borderLeftWidth) + parseCssPixels(style.borderRightWidth);
    return Math.max(0, element.offsetWidth - element.clientWidth - borderWidth);
}

function horizontalSpacing(style: CSSStyleDeclaration, includeBorder: boolean): number {
    const borderWidth = includeBorder ? parseCssPixels(style.borderLeftWidth) + parseCssPixels(style.borderRightWidth) : 0;
    return parseCssPixels(style.paddingLeft) + parseCssPixels(style.paddingRight) + borderWidth;
}

function parseCssPixels(value: string): number {
    const pixels = Number.parseFloat(value);
    return Number.isFinite(pixels) ? pixels : 0;
}

function isScalingPickerOpen(scalingPicker: HTMLElement): boolean {
    return scalingPicker.dataset.open === "true";
}

function setScalingPickerOpen(
    scalingPicker: HTMLElement,
    scalingButton: HTMLButtonElement,
    scalingPopup: HTMLElement,
    open: boolean,
    focusSelected = false
): void {
    scalingPicker.dataset.open = String(open);
    scalingButton.setAttribute("aria-expanded", String(open));
    scalingPopup.hidden = !open;
    if (!open || !focusSelected) {
        return;
    }

    const scalingList = scalingPopup.querySelector<HTMLElement>("#scaling-list");
    const selectedOption =
        scalingList?.querySelector<HTMLElement>("[data-scaling-mode][aria-selected='true']") ?? scalingList?.querySelector<HTMLElement>("[data-scaling-mode]");
    selectedOption?.focus();
}

function clampVolume(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(0, Math.min(1, value));
}

function isElementHovered(element: HTMLElement): boolean {
    try {
        return element.matches(":hover");
    } catch {
        return false;
    }
}

function escapeHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
