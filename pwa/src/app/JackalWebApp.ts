import type { AppGameContainer } from "slick2d-ts/slick/AppGameContainer";
import type { BufferedScalingMode } from "slick2d-ts";
import { SoundStore } from "slick2d-ts/slick/openal/SoundStore";
import { ResourceLoader } from "slick2d-ts/slick/util/ResourceLoader";
import { MainConstants } from "../java/MainConstants.js";
import type { Main } from "../jackal/Main.js";
import { clearStoredGameState, hasCurrentStoredGameState } from "../jackal/persistence/GameStateStorage.js";
import type { JackalGameStateStore } from "../jackal/persistence/JackalGameStateStore.js";
import {
    DEFAULT_SCALING_PREFERENCE,
    DEFAULT_VOLUME,
    clampVolume,
    clearPreferences,
    readScalingPreference,
    readVolume,
    writeScalingPreference,
    writeVolume,
    type JackalScalingPreference
} from "./AppPreferences.js";
import { GameViewportController } from "./GameViewportController.js";
import { JackalInputMappingStore } from "./JackalInputMappingStore.js";
import { JackalRuntimeLoader, type PreparedRuntime } from "./JackalRuntimeLoader.js";
import { escapeHtml, renderLoadErrorScreen, renderLoadingScreen, volumeIconSvg } from "./JackalScreens.js";
import { PageLifecycleMonitor } from "./PageLifecycleMonitor.js";
import { bindScalingPicker, scalingPickerHtml } from "./ScalingPicker.js";
import { registerServiceWorker } from "./ServiceWorkerRegistrar.js";
import versionInfo from "../../../version.json";
const GAME_DISPLAY_WIDTH = MainConstants.DISPLAY_WIDTH;
const GAME_DISPLAY_HEIGHT = MainConstants.DISPLAY_HEIGHT;
const HIGH_DPI_ENABLED = true;
const MAX_DEVICE_PIXEL_RATIO = 2;

type SlickRuntimeModule = typeof import("slick2d-ts");
export class JackalWebApp {
    private readonly root: HTMLElement;
    private readonly inputMappingStore = new JackalInputMappingStore();
    private gameStateStore: JackalGameStateStore | null = null;
    private readonly runtimeLoader = new JackalRuntimeLoader(() => this.refreshVisibleLoadingProgress());
    private readonly pageLifecycle = new PageLifecycleMonitor(() => this.applyCurrentGameLifecycleSuspension());
    private readonly viewport: GameViewportController;
    private backgroundPreparationScheduled = false;
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
            applyLifecycleSuspension: () => this.applyCurrentGameLifecycleSuspension(),
            reportResizeError: (error) => {
                console.error(error);
                this.showError("Unable to resize the game. Reload the page and try again.");
            }
        });
        registerServiceWorker(versionInfo.buildStamp);
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
        bindScalingPicker(
            menu,
            () => this.scalingPreference,
            (value) => this.setScalingPreference(value)
        );

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

    private setScalingPreference(value: JackalScalingPreference): void {
        this.scalingPreference = value;
        writeScalingPreference(value);
        if (this.runtimeLoader.preparedRuntime !== null) {
            this.viewport.setScalingMode(this.getBufferedScalingMode(this.runtimeLoader.preparedRuntime.slick));
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
        clearPreferences();
        clearStoredGameState();
        this.inputMappingStore.clear();
        this.gameStateStore = null;
    }

    private hasLiveSuspendedGame(): boolean {
        return this.liveMenuOpen && this.menuOverlay !== null && this.game !== null && this.container !== null;
    }

    private showLiveMenuOverlay(): void {
        const shell = this.viewport.gameShell;
        if (this.game === null || this.container === null || shell === null) {
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
        this.viewport.stopHamburgerVisibilityMonitor();
        this.viewport.hideHamburger();
        this.viewport.stopCursorAutoHide();
        this.menuOverlay = this.renderMenu(shell, true, null, true);
    }

    private resumeLiveGameFromMenu(): void {
        if (this.game === null || this.container === null) {
            void this.startGame(true);
            return;
        }
        this.removeMenuOverlay();
        this.container.getInput().resume();
        this.game.clearInputPressedRecords();
        if (this.viewport.gameHost !== null) {
            this.viewport.startCursorAutoHide(this.viewport.gameHost);
        }
        this.viewport.startHamburgerVisibilityMonitor();
        this.setAudioVolume(this.volume);
        this.viewport.scheduleResize();
        this.viewport.focusCanvas();
        this.applyCurrentGameLifecycleSuspension();
    }

    private removeMenuOverlay(): void {
        this.menuOverlay?.remove();
        this.menuOverlay = null;
        this.liveMenuOpen = false;
    }

    private async startGame(restoreSavedGame: boolean): Promise<void> {
        this.destroyGame();
        const session = this.gameSessionGeneration;
        // Audio unlocking still begins synchronously in the user-gesture call stack,
        // but settles into a value so an abandoned session cannot leak a rejection.
        const audioUnlockPromise = this.unlockAudio().then(
            () => ({ ok: true as const }),
            (error: unknown) => ({ ok: false as const, error })
        );

        try {
            if (this.runtimeLoader.preparedRuntime === null) {
                this.renderLoading(this.runtimeLoader.progress);
            }

            const runtime = await this.runtimeLoader.ensurePrepared(this.runtimeLoader.error !== null);
            if (!this.isCurrentGameSession(session)) {
                return;
            }
            const audioUnlock = await audioUnlockPromise;
            if (!this.isCurrentGameSession(session)) {
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
            if (restoreSavedGame) {
                this.showMenu("Unable to restore the saved game. Start a new game and try again.");
                return;
            }
            this.showLoadError("Unable to start.", "Check your connection and try again.", () => {
                void this.startGame(false);
            });
        }
    }

    private async launchPreparedGame(runtime: PreparedRuntime, restoreSavedGame: boolean, session: number): Promise<void> {
        if (!this.isCurrentGameSession(session)) {
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
            scalingMode: this.getBufferedScalingMode(runtime.slick)
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
        appContainer.setAlwaysRender(true);
        appContainer.setVSync(true);
        appContainer.setSmoothDeltas(false);
        appContainer.setShowFPS(false);
        appContainer.setClearEachFrame(true);
        await Promise.resolve(appContainer.setDisplayMode(displayMode.width, displayMode.height, false));
        if (!this.isCurrentGameSession(session)) {
            this.disposeStaleLaunch(mainGame, appContainer);
            return;
        }
        await appContainer.start();
        if (!this.isCurrentGameSession(session)) {
            this.disposeStaleLaunch(mainGame, appContainer);
            return;
        }
        await ResourceLoader.waitForAll();
        if (!this.isCurrentGameSession(session)) {
            this.disposeStaleLaunch(mainGame, appContainer);
            return;
        }

        appContainer.setErrorHandler((error: unknown) => {
            if (!this.isCurrentGameSession(session)) {
                return;
            }
            console.error(error);
            this.showLoadError("Unable to start.", "Check your connection and try again.", () => {
                void this.startGame(restoreSavedGame);
            });
        });
        this.viewport.startResponsiveSizing(host);
        this.viewport.startCursorAutoHide(host);
        this.viewport.startHamburgerVisibilityMonitor();
        this.setAudioVolume(this.volume);
        this.viewport.focusCanvas();
        mainGame.clearInputPressedRecords();
        this.syncCurrentGameLifecycleSuspension();
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
        if (this.game === null || this.runtimeLoader.preparedRuntime === null) {
            return false;
        }
        if (!this.game.isStateSaveReady()) {
            return false;
        }
        return this.getGameStateStore(this.runtimeLoader.preparedRuntime).save(this.game);
    }

    private clearStoredGameState(): void {
        clearStoredGameState();
        this.gameStateStore = null;
    }

    private saveCurrentInputMapping(): boolean {
        if (this.game === null) {
            return false;
        }
        return this.inputMappingStore.save(this.game.buttonMapping);
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

    private showLoadError(title: string, message: string, retryHandler: () => void): void {
        this.destroyGame();
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

    private destroyGame(): void {
        this.gameSessionGeneration++;
        this.removeMenuOverlay();
        this.saveCurrentInputMapping();
        this.resetLifecycleSuspension();
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
        this.viewport.clear();
        this.runtimeLoader.preparedRuntime?.slick.Display.setParent(null);
    }

    private scheduleBackgroundPreparation(): void {
        if (
            this.runtimeLoader.preparedRuntime !== null ||
            this.runtimeLoader.isPreparing ||
            this.runtimeLoader.error !== null ||
            this.backgroundPreparationScheduled
        ) {
            return;
        }
        this.backgroundPreparationScheduled = true;
        window.setTimeout(() => {
            this.backgroundPreparationScheduled = false;
            void this.runtimeLoader.ensurePrepared(false).catch((error) => {
                console.warn("Unable to prepare Jackal resources in the background.", error);
            });
        }, 0);
    }

    private getGameStateStore(runtime: PreparedRuntime): JackalGameStateStore {
        if (this.gameStateStore === null) {
            this.gameStateStore = new runtime.JackalGameStateStore(versionInfo.version);
        }
        return this.gameStateStore;
    }

    private hasPotentialSavedGameState(): boolean {
        return hasCurrentStoredGameState();
    }

    private syncCurrentGameLifecycleSuspension(): void {
        this.pageLifecycle.sync(this.game !== null);
    }

    private applyCurrentGameLifecycleSuspension(): void {
        if (this.game === null) {
            this.resetLifecycleSuspension();
            return;
        }
        if (this.game.isLoadingScreenActive()) {
            return;
        }
        if (this.liveMenuOpen || this.pageLifecycle.suspended) {
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
        this.pageLifecycle.reset();
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
