import { releaseGameAudio, unlockGameAudio } from "./AudioUnlock.js";
import type { AppGameContainer } from "slick2d-ts/slick/AppGameContainer";
import { SoundStore } from "slick2d-ts/slick/openal/SoundStore";
import { ResourceLoadException, ResourceLoader } from "slick2d-ts/slick/util/ResourceLoader";
import { MainConstants } from "../java/MainConstants.js";
import type { Main } from "../jackal/Main.js";
import { clearStoredGameState, hasCurrentStoredGameState } from "../jackal/persistence/GameStateStorage.js";
import type { JackalGameStateStore } from "../jackal/persistence/JackalGameStateStore.js";
import { DEFAULT_SCALING_PREFERENCE, DEFAULT_VOLUME, clampVolume, readScalingPreference, readVolume, type JackalScalingPreference } from "./AppPreferences.js";
import { GameViewportController } from "./GameViewportController.js";
import { JackalInputMappingStore } from "./JackalInputMappingStore.js";
import { JackalRuntimeLoader, isRuntimePreparationAbort, type PreparedRuntime } from "./JackalRuntimeLoader.js";
import { escapeHtml, renderLoadErrorScreen, renderLoadingScreen, volumeIconSvg } from "./JackalScreens.js";
import { PageLifecycleMonitor } from "./PageLifecycleMonitor.js";
import { clearPersistedPwaState, persistScalingPreference, persistVolumePreference } from "./PersistenceActions.js";
import { PersistenceWarningController } from "./PersistenceWarningController.js";
import { ScreenWakeLockManager } from "./ScreenWakeLockManager.js";
import { bindScalingPicker, bufferedScalingModeForPreference, scalingPickerHtml } from "./ScalingPicker.js";
import { registerServiceWorker } from "./ServiceWorkerRegistrar.js";
import { APP_VERSION, BUILD_STAMP } from "./BuildInfo.js";
const GAME_DISPLAY_WIDTH = MainConstants.DISPLAY_WIDTH;
const GAME_DISPLAY_HEIGHT = MainConstants.DISPLAY_HEIGHT;
const HIGH_DPI_ENABLED = true;
const MAX_DEVICE_PIXEL_RATIO = 4;
type PwaSessionState = "booting" | "menu" | "starting" | "running" | "stopping";

export class JackalWebApp {
    private readonly root: HTMLElement;
    private readonly inputMappingStore = new JackalInputMappingStore();
    private gameStateStore: JackalGameStateStore | null = null;
    private readonly runtimeLoader = new JackalRuntimeLoader(() => this.refreshVisibleLoadingProgress());
    private readonly pageLifecycle = new PageLifecycleMonitor(() => this.requestPwaMenu("page-lifecycle"));
    private readonly screenWakeLock = new ScreenWakeLockManager();
    private readonly viewport: GameViewportController;
    private readonly persistenceWarnings: PersistenceWarningController;
    private gameLaunchInProgress = false;
    private pwaSessionState: PwaSessionState = "booting";
    private container: AppGameContainer | null = null;
    private game: Main | null = null;
    private gameSessionGeneration = 0;
    private menuOverlay: HTMLElement | null = null;
    private liveMenuOpen = false;
    private volume = readVolume();
    private scalingPreference = readScalingPreference();

    public constructor(root: HTMLElement) {
        this.root = root;
        this.viewport = new GameViewportController(root, {
            getGame: () => this.game,
            isSessionCurrent: (session) => this.isCurrentGameSession(session),
            isLiveMenuOpen: () => this.liveMenuOpen,
            returnToMenu: () => this.returnToMenu(),
            applyLifecycleSuspension: () => this.pageLifecycle.sync(this.game !== null),
            reportResizeError: (error) => {
                console.error(error);
                this.showError("Unable to resize the game. Reload the page and try again.");
            }
        });
        this.persistenceWarnings = new PersistenceWarningController(
            root,
            () => this.viewport.gameShell,
            () => this.liveMenuOpen,
            () => this.pageLifecycle.suspended
        );
        registerServiceWorker(BUILD_STAMP);
    }

    public showMenu(errorMessage: string | null = null): void {
        this.destroyGame();
        if (this.runtimeLoader.preparedRuntime === null) {
            this.pwaSessionState = "booting";
            this.renderLoading(this.runtimeLoader.progress);
            void this.runtimeLoader
                .ensurePrepared(this.runtimeLoader.error !== null)
                .then(() => {
                    if (this.pwaSessionState !== "booting") {
                        return;
                    }
                    this.pwaSessionState = "menu";
                    this.renderMenu(this.root, this.hasPotentialSavedGameState(), errorMessage, false);
                })
                .catch((error) => {
                    if (isRuntimePreparationAbort(error) || this.pwaSessionState !== "booting") {
                        return;
                    }
                    console.error(error);
                    this.pwaSessionState = "menu";
                    this.showLoadError("Unable to load the game.", "Check your connection and try again.", () => this.showMenu(errorMessage));
                });
            return;
        }
        this.pwaSessionState = "menu";
        this.renderMenu(this.root, this.hasPotentialSavedGameState(), errorMessage, false);
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
                <div class="setting-scaling-row" role="group" aria-label="Scaling">
                    <span>Scaling</span>
                    ${scalingPickerHtml(this.scalingPreference)}
                </div>
                <label class="volume-row">
                    <span id="volume-icon" class="volume-icon" aria-hidden="true">${volumeIconSvg(this.volume)}</span>
                    <input id="volume-input" type="range" min="0" max="100" step="1" value="${Math.round(this.volume * 100)}" aria-label="Volume">
                    <span id="volume-value" class="volume-value">${Math.round(this.volume * 100)}</span>
                </label>
                <div class="menu-buttons">
                    <button id="new-game-button" class="start-button" type="button">New Game</button>
                    <button id="continue-button" class="start-button" type="button"${canContinue ? "" : " disabled"}>Continue</button>
                </div>
                <button id="reset-button" class="reset-button" type="button">Reset</button>
                ${errorMessage ? `<p class="error-message">${escapeHtml(errorMessage)}</p>` : ""}
                ${this.persistenceWarnings.takePendingHtml()}
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
        const commitVolume = (): void => {
            this.setAudioVolume(Number(volumeInput.value) / 100);
            persistVolumePreference(this.volume, this.persistenceWarnings);
        };
        volumeInput.addEventListener("input", () => {
            this.setAudioVolume(Number(volumeInput.value) / 100);
            updateVolumeUi();
        });
        volumeInput.addEventListener("change", commitVolume);
        updateVolumeUi();
        bindScalingPicker(
            menu,
            () => this.scalingPreference,
            (value) => this.setScalingPreference(value)
        );

        menu.querySelector<HTMLButtonElement>("#new-game-button")?.addEventListener("click", () => {
            this.clearStoredGameState();
            commitVolume();
            void this.startGame(false);
        });
        menu.querySelector<HTMLButtonElement>("#continue-button")?.addEventListener("click", () => {
            commitVolume();
            if (this.hasLiveSuspendedGame()) {
                void this.resumeLiveGameFromMenu();
                return;
            }
            void this.startGame(true);
        });
        menu.querySelector<HTMLButtonElement>("#reset-button")?.addEventListener("click", () => this.resetPwaState());
    }

    private setScalingPreference(value: JackalScalingPreference): void {
        this.scalingPreference = value;
        persistScalingPreference(value, this.persistenceWarnings);
        if (this.runtimeLoader.preparedRuntime !== null) {
            this.viewport.setScalingMode(bufferedScalingModeForPreference(this.runtimeLoader.preparedRuntime.slick, this.scalingPreference));
        }
    }

    private resetPwaState(): void {
        this.destroyGame();
        this.clearPwaStorage();
        this.volume = DEFAULT_VOLUME;
        this.scalingPreference = DEFAULT_SCALING_PREFERENCE;
        this.applyAudioVolume(this.volume);
        this.pwaSessionState = "menu";
        this.renderMenu(this.root, false, null, false);
    }

    private clearPwaStorage(): void {
        clearPersistedPwaState(this.inputMappingStore, this.persistenceWarnings);
        this.gameStateStore = null;
    }

    private hasLiveSuspendedGame(): boolean {
        return this.pwaSessionState === "menu" && this.liveMenuOpen && this.menuOverlay !== null && this.game !== null && this.container !== null;
    }

    private showLiveMenuOverlay(): void {
        const shell = this.viewport.gameShell;
        if (this.pwaSessionState !== "running" || this.game === null || this.container === null || shell === null) {
            return;
        }
        this.pwaSessionState = "stopping";
        this.removeMenuOverlay();
        this.liveMenuOpen = true;
        this.syncScreenWakeLock();
        this.saveCurrentInputMapping();
        if (!this.game.browserSuspended) {
            this.saveCurrentGameState();
        }
        this.game.setBrowserSuspended(true);
        this.container.stopSoundEffects();
        this.container.setLoopSuspended(true);
        this.container.getInput().pause();
        this.viewport.stopHamburgerVisibilityMonitor();
        this.viewport.hideHamburger();
        this.viewport.stopCursorAutoHide();
        releaseGameAudio();
        this.menuOverlay = this.renderMenu(shell, true, null, true);
        this.pwaSessionState = "menu";
        this.syncScreenWakeLock();
    }

    private async resumeLiveGameFromMenu(): Promise<void> {
        if (!this.hasLiveSuspendedGame() || this.game === null || this.container === null || this.menuOverlay === null) {
            return;
        }
        const liveGame = this.game;
        const liveContainer = this.container;
        const liveOverlay = this.menuOverlay;
        const liveHost = this.viewport.gameHost;
        this.pwaSessionState = "starting";
        const audioUnlockPromise = unlockGameAudio();
        await audioUnlockPromise;
        if (
            this.pwaSessionState !== "starting" ||
            this.game !== liveGame ||
            this.container !== liveContainer ||
            this.menuOverlay !== liveOverlay ||
            this.pageLifecycle.suspended
        ) {
            releaseGameAudio();
            if (this.game === liveGame && this.container === liveContainer && this.menuOverlay === liveOverlay) {
                this.pwaSessionState = "menu";
            }
            return;
        }
        this.removeMenuOverlay();
        liveContainer.getInput().resume();
        liveGame.clearInputPressedRecords();
        if (liveHost !== null) {
            this.viewport.startCursorAutoHide(liveHost);
        }
        this.viewport.startHamburgerVisibilityMonitor();
        this.setAudioVolume(this.volume);
        this.viewport.scheduleResize();
        this.viewport.focusCanvas();
        liveGame.setBrowserSuspended(false);
        liveContainer.setLoopSuspended(false);
        this.pwaSessionState = "running";
        this.persistenceWarnings.showPending();
        this.syncScreenWakeLock();
    }

    private removeMenuOverlay(): void {
        this.menuOverlay?.remove();
        this.menuOverlay = null;
        this.liveMenuOpen = false;
    }

    private async startGame(restoreSavedGame: boolean): Promise<void> {
        if (this.pwaSessionState !== "menu") {
            return;
        }
        this.destroyGameSession();
        this.pwaSessionState = "starting";
        this.gameLaunchInProgress = true;
        this.syncScreenWakeLock();
        const session = this.gameSessionGeneration;
        const audioUnlockPromise = unlockGameAudio().then(
            () => ({ ok: true as const }),
            (error: unknown) => ({ ok: false as const, error })
        );

        if (this.runtimeLoader.preparedRuntime === null) {
            this.renderLoading(this.runtimeLoader.progress);
        }

        let runtime: PreparedRuntime;
        try {
            runtime = await this.runtimeLoader.ensurePrepared(this.runtimeLoader.error !== null);
        } catch (error) {
            if (!this.isCurrentGameSession(session) || isRuntimePreparationAbort(error)) {
                return;
            }
            console.error(error);
            this.showResourceLoadError(error, restoreSavedGame);
            return;
        }

        try {
            if (!this.isCurrentGameSession(session) || this.pwaSessionState !== "starting") {
                return;
            }
            const audioUnlock = await audioUnlockPromise;
            if (!this.isCurrentGameSession(session) || this.pwaSessionState !== "starting") {
                return;
            }
            if (!audioUnlock.ok) {
                throw audioUnlock.error;
            }
            this.setAudioVolume(this.volume);
            await this.launchPreparedGame(runtime, restoreSavedGame, session);
        } catch (error) {
            if (!this.isCurrentGameSession(session)) {
                return;
            }
            console.error(error);
            if (error instanceof ResourceLoadException) {
                this.showResourceLoadError(error, restoreSavedGame);
                return;
            }
            if (restoreSavedGame) {
                this.showMenu("Unable to restore the saved game. Start a new game and try again.");
                return;
            }
            this.showLoadError("Unable to start.", "The game encountered an unexpected startup error. Reload the page and try again.", () => {
                void this.startGame(false);
            });
        }
    }

    private async launchPreparedGame(runtime: PreparedRuntime, restoreSavedGame: boolean, session: number): Promise<void> {
        if (!this.isCurrentGameSession(session) || this.pwaSessionState !== "starting") {
            return;
        }
        if (restoreSavedGame && !this.getGameStateStore(runtime).hasValidSave()) {
            this.showMenu();
            return;
        }

        const host = this.viewport.createShell();
        runtime.slick.Display.setParent(host);

        const mainGame = new runtime.Main();
        mainGame.reserveBrowserRuntime();
        this.inputMappingStore.restore(mainGame.buttonMapping);

        const bufferedGame = new runtime.slick.BufferedScalableGame(mainGame, GAME_DISPLAY_WIDTH, GAME_DISPLAY_HEIGHT, {
            maintainAspect: true,
            scalingMode: bufferedScalingModeForPreference(runtime.slick, this.scalingPreference)
        });
        const displayMode = this.viewport.getWindowedDisplayMode();
        const appContainer = new runtime.slick.AppGameContainer(bufferedGame, displayMode.width, displayMode.height, false);
        appContainer.setPreserveAudioCacheOnDestroy(true);
        appContainer.setLoopSuspended(true);
        appContainer.setHighDpiEnabled(HIGH_DPI_ENABLED);
        appContainer.setMaxDevicePixelRatio(MAX_DEVICE_PIXEL_RATIO);
        this.container = appContainer;
        this.game = mainGame;
        this.viewport.attach(appContainer, bufferedGame, session);
        mainGame.inputMappingChangedHandler = () => {
            if (this.isCurrentGameSession(session)) {
                this.saveCurrentInputMapping();
            }
        };
        mainGame.windowedDisplayModeProvider = () => this.viewport.getWindowedDisplayMode();
        mainGame.browserFullscreenController = {
            isFullscreen: () => this.isCurrentGameSession(session) && this.viewport.isFullscreen(),
            enterFullscreen: () => {
                if (this.isCurrentGameSession(session)) {
                    this.viewport.enterFullscreen();
                }
            },
            exitFullscreen: () => {
                if (this.isCurrentGameSession(session)) {
                    this.viewport.exitFullscreen();
                }
            }
        };
        if (restoreSavedGame) {
            mainGame.loadingCompleteHandler = (gc) => {
                if (!this.isCurrentGameSession(session)) {
                    return false;
                }
                if (!this.getGameStateStore(runtime).restore(mainGame, gc)) {
                    throw new Error("Saved game could not be restored.");
                }
                return true;
            };
        }
        await Promise.resolve(appContainer.setDisplayMode(displayMode.width, displayMode.height, false));
        if (!this.isCurrentGameSession(session) || this.pwaSessionState !== "starting") {
            this.disposeStaleLaunch(mainGame, appContainer);
            return;
        }
        await appContainer.start();
        if (!this.isCurrentGameSession(session) || this.pwaSessionState !== "starting") {
            this.disposeStaleLaunch(mainGame, appContainer);
            return;
        }
        await ResourceLoader.waitForAll();
        if (!this.isCurrentGameSession(session) || this.pwaSessionState !== "starting") {
            this.disposeStaleLaunch(mainGame, appContainer);
            return;
        }

        appContainer.setErrorHandler((error: unknown) => {
            if (!this.isCurrentGameSession(session)) {
                return;
            }
            console.error(error);
            this.showLoadError("Game error.", "The game encountered an unexpected error. Reload the page and try again.", () => {
                this.showMenu();
            });
        });
        this.viewport.startResponsiveSizing(host);
        this.viewport.startCursorAutoHide(host);
        this.viewport.startHamburgerVisibilityMonitor();
        this.setAudioVolume(this.volume);
        this.viewport.focusCanvas();
        mainGame.clearInputPressedRecords();
        this.gameLaunchInProgress = false;
        this.pwaSessionState = "running";
        mainGame.setBrowserSuspended(false);
        appContainer.setLoopSuspended(false);
        this.persistenceWarnings.showPending();
        this.syncScreenWakeLock();
        this.pageLifecycle.sync(true);
    }

    private returnToMenu(): void {
        this.requestPwaMenu("hamburger");
    }

    private requestPwaMenu(_reason: string): void {
        if (this.pwaSessionState === "booting" || this.pwaSessionState === "menu" || this.pwaSessionState === "stopping") {
            return;
        }
        if (this.pwaSessionState === "starting" && this.liveMenuOpen) {
            releaseGameAudio();
            this.pwaSessionState = "menu";
            this.syncScreenWakeLock();
            return;
        }
        if (this.game !== null && this.container !== null && !this.game.isLoadingScreenActive()) {
            this.showLiveMenuOverlay();
            return;
        }
        this.saveCurrentGameState();
        this.showMenu();
    }

    private saveCurrentGameState(): boolean {
        if (this.game === null || this.runtimeLoader.preparedRuntime === null || !this.game.isStateSaveReady()) {
            return false;
        }
        const saved = this.getGameStateStore(this.runtimeLoader.preparedRuntime).save(this.game);
        if (!saved) {
            this.persistenceWarnings.report("Progress could not be saved. Your last successful save is unchanged.");
        }
        return saved;
    }

    private clearStoredGameState(): void {
        if (!clearStoredGameState()) {
            this.persistenceWarnings.report("The previous saved game could not be cleared.");
        }
        this.gameStateStore = null;
    }

    private saveCurrentInputMapping(): boolean {
        if (this.game === null) {
            return false;
        }
        const saved = this.inputMappingStore.save(this.game.buttonMapping);
        if (!saved) {
            this.persistenceWarnings.report("Control changes could not be saved.");
        }
        return saved;
    }

    private renderLoading(progress: number): void {
        renderLoadingScreen(this.root, progress);
    }

    private refreshVisibleLoadingProgress(): void {
        if (this.root.querySelector("[data-loading-progress='true']") !== null) {
            this.renderLoading(this.runtimeLoader.progress);
        }
    }

    private showError(message: string): void {
        this.showLoadError("Unable to start.", message, () => this.showMenu());
    }

    private showResourceLoadError(error: unknown, restoreSavedGame: boolean): void {
        let message = "A required game resource could not be loaded. Try again.";
        if (error instanceof ResourceLoadException) {
            if (error.kind === "network" || (error.kind === "http" && error.status !== null && error.status >= 500)) {
                message = "Check your connection and try again.";
            } else if (error.kind === "http") {
                message = "A required game resource is unavailable on the server.";
            } else if (error.kind === "decode") {
                message = "A game resource could not be decoded by this browser.";
            }
        }
        this.showLoadError("Unable to load the game.", message, () => {
            this.pwaSessionState = "menu";
            void this.startGame(restoreSavedGame);
        });
    }

    private showLoadError(title: string, message: string, retryHandler: () => void): void {
        this.destroyGame();
        this.pwaSessionState = "menu";
        renderLoadErrorScreen(this.root, title, message)?.addEventListener("click", retryHandler);
    }

    private isCurrentGameSession(session: number): boolean {
        return session === this.gameSessionGeneration;
    }

    private disposeStaleLaunch(mainGame: Main, appContainer: AppGameContainer): void {
        mainGame.disposeBrowserRuntime();
        if (this.container === appContainer) {
            this.container = null;
            this.game = null;
        }
        appContainer.destroy();
    }

    public releaseSession(): void {
        this.saveCurrentGameState();
        this.destroyGame();
        this.pwaSessionState = "menu";
    }

    private destroyGame(): void {
        this.runtimeLoader.cancelPreparation();
        this.destroyGameSession();
    }

    private destroyGameSession(): void {
        this.gameSessionGeneration++;
        this.gameLaunchInProgress = false;
        releaseGameAudio();
        this.removeMenuOverlay();
        this.saveCurrentInputMapping();
        this.viewport.stopHamburgerVisibilityMonitor();
        this.viewport.stopCursorAutoHide();
        this.viewport.stopResponsiveSizing();
        this.game?.stopAllSounds();
        this.game?.disposeBrowserRuntime();
        if (this.container !== null) {
            this.container.destroy();
            this.container = null;
        } else {
            SoundStore.get().stopAllPlayback();
        }
        this.game = null;
        this.persistenceWarnings.clearToast();
        this.viewport.clear();
        this.runtimeLoader.preparedRuntime?.slick.Display.setParent(null);
        this.syncScreenWakeLock();
    }

    private getGameStateStore(runtime: PreparedRuntime): JackalGameStateStore {
        if (this.gameStateStore === null) {
            this.gameStateStore = new runtime.JackalGameStateStore(APP_VERSION);
        }
        return this.gameStateStore;
    }

    private hasPotentialSavedGameState(): boolean {
        return hasCurrentStoredGameState();
    }

    private syncScreenWakeLock(): void {
        this.screenWakeLock.setDesired(this.pwaSessionState === "running" || (this.pwaSessionState === "starting" && !this.liveMenuOpen && this.gameLaunchInProgress));
    }

    private setAudioVolume(value: number): void {
        this.volume = clampVolume(value, this.volume);
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
