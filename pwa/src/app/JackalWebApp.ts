import { SessionCleanup } from "./SessionCleanup.js";
import {
    beginGameAudio,
    commitGameAudio,
    isGameAudioCurrent,
    isGameAudioLatest,
    releaseGameAudio,
    setGameAudioInterruptionHandler,
    type GameAudioAttempt
} from "./PlaybackSession.js";
import type { AppGameContainer } from "slick2d-ts/slick/AppGameContainer";
import { SoundStore } from "slick2d-ts/slick/openal/SoundStore";
import { ResourceLoadException, ResourceLoader } from "slick2d-ts/slick/util/ResourceLoader";
import { MainConstants } from "../java/MainConstants.js";
import type { Main } from "../jackal/Main.js";
import { clearStoredGameState, hasCurrentStoredGameState } from "../jackal/persistence/GameStateStorage.js";
import type { JackalGameStateStore } from "../jackal/persistence/JackalGameStateStore.js";
import {
    DEFAULT_FULLSCREEN_PREFERENCE,
    DEFAULT_SCALING_PREFERENCE,
    DEFAULT_VOLUME,
    clampVolume,
    readFullscreenPreference,
    readScalingPreference,
    readVolume,
    type JackalScalingPreference
} from "./AppPreferences.js";
import type { GameSessionOwnership } from "./GameSessionOwnership.js";
import { GameViewportController } from "./GameViewportController.js";
import { JackalInputMappingStore } from "./JackalInputMappingStore.js";
import { JackalRuntimeLoader, isRuntimePreparationAbort, type PreparedRuntime } from "./JackalRuntimeLoader.js";
import { escapeHtml, renderLoadErrorScreen, renderLoadingScreen, volumeIconSvg } from "./JackalScreens.js";
import { PageLifecycleMonitor } from "./PageLifecycleMonitor.js";
import { clearPersistedPwaState, persistFullscreenPreference, persistScalingPreference, persistVolumePreference } from "./PersistenceActions.js";
import { PersistenceWarningController } from "./PersistenceWarningController.js";
import { ScreenWakeLockManager } from "./ScreenWakeLockManager.js";
import { bindScalingPicker, bufferedScalingModeForPreference, scalingPickerHtml } from "./ScalingPicker.js";
import { registerServiceWorker } from "./ServiceWorkerRegistrar.js";
import { APP_VERSION, BUILD_STAMP } from "./BuildInfo.js";
const GAME_DISPLAY_WIDTH = MainConstants.DISPLAY_WIDTH;
const GAME_DISPLAY_HEIGHT = MainConstants.DISPLAY_HEIGHT;
const HIGH_DPI_ENABLED = true;
const MAX_DEVICE_PIXEL_RATIO = 4;
type PwaSessionState = "booting" | "menu" | "starting" | "running" | "stopping" | "error";

export class JackalWebApp {
    private readonly root: HTMLElement;
    private readonly sessionCleanup = new SessionCleanup();
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
    private gameOwnershipEpoch = -1;
    private menuRequestSerial = 0;
    private menuOverlay: HTMLElement | null = null;
    private liveMenuOpen = false;
    private volume = readVolume();
    private scalingPreference = readScalingPreference();
    private fullscreenPreference = readFullscreenPreference();

    public constructor(
        root: HTMLElement,
        private readonly getOwnership: () => GameSessionOwnership
    ) {
        this.root = root;
        this.viewport = new GameViewportController(root, {
            getGame: () => this.game,
            isSessionCurrent: (session) => this.isCurrentGameSession(session),
            isLiveMenuOpen: () => this.liveMenuOpen,
            isGameplayActive: () => this.pwaSessionState === "starting" || this.pwaSessionState === "running",
            returnToMenu: () => this.returnToMenu(),
            fullscreenExited: () => this.requestPwaMenu("fullscreen-exit"),
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
        setGameAudioInterruptionHandler((reason) => this.requestPwaMenu(reason));
        document.addEventListener("keydown", this.handleBrowserReservedKey, true);
        registerServiceWorker(BUILD_STAMP);
    }

    public showMenu(errorMessage: string | null = null): void {
        const owner = this.getOwnership();
        const epoch = owner.epoch;
        if (!owner.isCurrent(epoch)) {
            return;
        }
        if (!this.destroyGame()) {
            return;
        }
        const request = this.menuRequestSerial;
        if (this.runtimeLoader.preparedRuntime === null) {
            this.pwaSessionState = "booting";
            this.renderLoading(this.runtimeLoader.progress);
            void this.runtimeLoader
                .ensurePrepared(this.runtimeLoader.error !== null)
                .then(() => {
                    if (request !== this.menuRequestSerial || !owner.isCurrent(epoch) || this.pwaSessionState !== "booting") {
                        return;
                    }
                    this.pwaSessionState = "menu";
                    this.renderMenu(this.root, this.hasPotentialSavedGameState(), errorMessage, false);
                })
                .catch((error) => {
                    if (
                        isRuntimePreparationAbort(error) ||
                        request !== this.menuRequestSerial ||
                        !owner.isCurrent(epoch) ||
                        this.pwaSessionState !== "booting"
                    ) {
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
        const fullscreenUnavailable = this.viewport.getFullscreenCapability() === "unavailable";
        const fullscreenPresented = !fullscreenUnavailable && this.fullscreenPreference;
        menu.innerHTML = `
            <section class="menu-panel" aria-label="Jackal menu">
                <div class="display-settings-row">
                    <div class="setting-fullscreen-row" role="group" aria-label="Fullscreen">
                        <span>Fullscreen</span>
                        <button id="fullscreen-switch-button" class="menu-switch" type="button" aria-label="Toggle fullscreen" aria-pressed="${fullscreenPresented}" data-enabled="${fullscreenPresented}"${fullscreenUnavailable ? ' disabled title="Fullscreen is unavailable in this browser"' : ""}><span></span></button>
                    </div>
                    <div class="setting-scaling-row" role="group" aria-label="Scaling">
                        <span>Scaling</span>
                        ${scalingPickerHtml(this.scalingPreference)}
                    </div>
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
        const fullscreenSwitch = menu.querySelector<HTMLButtonElement>("#fullscreen-switch-button");
        if (volumeInput === null || volumeValue === null || volumeIcon === null || fullscreenSwitch === null) {
            return;
        }
        const updateVolumeUi = (): void => {
            const percent = Math.round(this.volume * 100);
            volumeInput.style.setProperty("--thumb-position", `${percent}%`);
            volumeValue.textContent = String(percent);
            volumeIcon.innerHTML = volumeIconSvg(this.volume);
        };
        const updateFullscreenUi = (): void => {
            const fullscreenPresented = !fullscreenSwitch.disabled && this.fullscreenPreference;
            fullscreenSwitch.setAttribute("aria-pressed", String(fullscreenPresented));
            fullscreenSwitch.setAttribute("data-enabled", String(fullscreenPresented));
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
        fullscreenSwitch.addEventListener("click", () => {
            this.fullscreenPreference = !this.fullscreenPreference;
            persistFullscreenPreference(this.fullscreenPreference, this.persistenceWarnings);
            updateFullscreenUi();
        });
        updateVolumeUi();
        updateFullscreenUi();
        bindScalingPicker(
            menu,
            () => this.scalingPreference,
            (value) => this.setScalingPreference(value)
        );

        menu.querySelector<HTMLButtonElement>("#new-game-button")?.addEventListener("click", () => {
            if (!this.canActivateFromMenu()) {
                return;
            }
            this.clearStoredGameState();
            commitVolume();
            void this.startGame(false);
        });
        menu.querySelector<HTMLButtonElement>("#continue-button")?.addEventListener("click", () => {
            if (!this.canActivateFromMenu()) {
                return;
            }
            commitVolume();
            if (this.hasLiveSuspendedGame()) {
                void this.resumeLiveGameFromMenu();
                return;
            }
            void this.startGame(true);
        });
        menu.querySelector<HTMLButtonElement>("#reset-button")?.addEventListener("click", () => this.resetPwaState());
    }

    private canActivateFromMenu(): boolean {
        const owner = this.getOwnership();
        return (
            this.sessionCleanup.safe &&
            this.pwaSessionState === "menu" &&
            owner.isCurrent(owner.epoch) &&
            document.visibilityState === "visible" &&
            document.hasFocus()
        );
    }

    private setScalingPreference(value: JackalScalingPreference): void {
        this.scalingPreference = value;
        persistScalingPreference(value, this.persistenceWarnings);
        if (this.runtimeLoader.preparedRuntime !== null) {
            this.viewport.setScalingMode(bufferedScalingModeForPreference(this.runtimeLoader.preparedRuntime.slick, this.scalingPreference));
        }
    }

    private resetPwaState(): void {
        if (!this.canActivateFromMenu()) {
            return;
        }
        if (!this.destroyGame()) {
            return;
        }
        this.clearPwaStorage();
        this.volume = DEFAULT_VOLUME;
        this.scalingPreference = DEFAULT_SCALING_PREFERENCE;
        this.fullscreenPreference = DEFAULT_FULLSCREEN_PREFERENCE;
        this.applyApplicationAudioPreferences();
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

    private async showLiveMenuOverlay(): Promise<void> {
        const shell = this.viewport.gameShell;
        if (this.pwaSessionState !== "running" || this.game === null || this.container === null || shell === null) {
            return;
        }
        const session = this.gameSessionGeneration;
        this.pwaSessionState = "stopping";
        this.liveMenuOpen = true;
        this.sessionCleanup.run(() => this.syncScreenWakeLock());
        this.suspendGameForMenu();
        this.sessionCleanup.trySave(() => this.saveCurrentInputMapping());
        const saved = this.sessionCleanup.trySave(() => this.saveCurrentGameState());
        this.sessionCleanup.run(
            () => this.viewport.stopHamburgerVisibilityMonitor(),
            () => this.viewport.hideHamburger(),
            () => this.viewport.stopCursorAutoHide()
        );
        if (!this.sessionCleanup.safe) {
            this.destroyGameSession();
            return;
        }
        if (!(await this.viewport.exitFullscreenForMenu())) {
            return;
        }
        if (!this.isCurrentGameSession(session) || this.pwaSessionState !== "stopping" || this.game === null || this.container === null) {
            return;
        }
        if (
            !this.sessionCleanup.run(() => {
                this.menuOverlay = this.renderMenu(
                    this.root,
                    true,
                    saved ? null : "Progress could not be saved. Continue still preserves this live game.",
                    true
                );
            })
        ) {
            this.destroyGameSession();
            return;
        }
        this.pwaSessionState = "menu";
        this.syncScreenWakeLock();
    }

    private async resumeLiveGameFromMenu(): Promise<void> {
        if (
            !this.canActivateFromMenu() ||
            !this.hasLiveSuspendedGame() ||
            this.game === null ||
            this.container === null ||
            this.menuOverlay === null ||
            this.container.isGraphicsContextLost()
        ) {
            return;
        }
        const liveGame = this.game;
        const liveContainer = this.container;
        const liveOverlay = this.menuOverlay;
        const liveHost = this.viewport.gameHost;
        const session = this.gameSessionGeneration;
        this.pwaSessionState = "starting";
        this.applyApplicationAudioPreferences();
        const audio = beginGameAudio();
        this.requestPreferredFullscreen();
        try {
            if (
                !(await audio.ready) ||
                !this.isStartingGameSession(session, audio) ||
                this.game !== liveGame ||
                this.container !== liveContainer ||
                this.menuOverlay !== liveOverlay
            ) {
                return;
            }
            this.setAudioVolume(this.volume);
            if (
                !(await commitGameAudio(audio)) ||
                !this.isStartingGameSession(session, audio) ||
                this.game !== liveGame ||
                this.container !== liveContainer ||
                this.menuOverlay !== liveOverlay
            ) {
                return;
            }
            this.viewport.reconcileDisplayModeNow();
            this.viewport.scheduleResize();
            this.viewport.focusCanvas();
            if (!this.isStartingGameSession(session, audio)) {
                return;
            }
            liveContainer.getInput().resume();
            liveGame.clearInputPressedRecords();
            if (!this.isStartingGameSession(session, audio)) {
                return;
            }
            this.pwaSessionState = "running";
            this.removeMenuOverlay();
            if (
                !this.isCurrentGameSession(session) ||
                !isGameAudioCurrent(audio) ||
                this.pwaSessionState !== "running" ||
                this.game !== liveGame ||
                this.container !== liveContainer
            ) {
                return;
            }
            if (liveHost !== null) {
                this.viewport.startCursorAutoHide(liveHost);
            }
            this.viewport.startHamburgerVisibilityMonitor();
            if (!this.isCurrentGameSession(session) || !isGameAudioCurrent(audio) || this.pwaSessionState !== "running") {
                return;
            }
            liveGame.setBrowserSuspended(false);
            liveContainer.setLoopSuspended(false);
            this.pageLifecycle.sync(true);
            if (!this.isCurrentGameSession(session) || !isGameAudioCurrent(audio) || this.pwaSessionState !== "running") {
                return;
            }
            this.persistenceWarnings.showPending();
            this.syncScreenWakeLock();
        } catch (error) {
            if (isGameAudioLatest(audio) && this.isCurrentGameSession(session)) {
                console.error("Unable to continue the playback session.", error);
                this.requestPwaMenu("continue-failed");
            }
        } finally {
            if (
                isGameAudioLatest(audio) &&
                this.isCurrentGameSession(session) &&
                this.pwaSessionState === "starting" &&
                this.game === liveGame &&
                this.container === liveContainer &&
                this.menuOverlay === liveOverlay
            ) {
                this.requestPwaMenu("continue-not-accepted");
            }
        }
    }

    private removeMenuOverlay(): void {
        const overlay = this.menuOverlay;
        this.menuOverlay = null;
        this.liveMenuOpen = false;
        overlay?.remove();
    }

    private async startGame(restoreSavedGame: boolean): Promise<void> {
        if (!this.canActivateFromMenu()) {
            return;
        }
        const runtime = this.runtimeLoader.preparedRuntime;
        if (runtime === null) {
            this.showMenu();
            return;
        }
        if (!this.destroyGameSession()) {
            return;
        }
        this.applyApplicationAudioPreferences();
        this.gameOwnershipEpoch = this.getOwnership().epoch;
        this.pwaSessionState = "starting";
        this.gameLaunchInProgress = true;
        const session = this.gameSessionGeneration;
        this.syncScreenWakeLock();
        if (!this.isCurrentGameSession(session) || this.pwaSessionState !== "starting") {
            return;
        }
        const host = this.viewport.createShell(session);
        runtime.slick.Display.setParent(host);
        const audio = beginGameAudio();
        this.requestPreferredFullscreen();

        try {
            if (!(await audio.ready) || !this.isStartingGameSession(session, audio)) {
                return;
            }
            this.setAudioVolume(this.volume);
            await this.launchPreparedGame(runtime, restoreSavedGame, session, audio);
        } catch (error) {
            if (!this.isCurrentGameSession(session)) {
                return;
            }
            console.error(error);
            if (error instanceof ResourceLoadException) {
                this.showResourceLoadError(error);
                return;
            }
            if (restoreSavedGame) {
                this.showMenu("Unable to restore the saved game. Start a new game and try again.");
                return;
            }
            this.showLoadError("Unable to start.", "The game encountered an unexpected startup error. Reload the page and try again.", () => this.showMenu());
        } finally {
            if (isGameAudioLatest(audio) && this.isCurrentGameSession(session) && this.pwaSessionState === "starting") {
                this.requestPwaMenu("start-failed");
            }
        }
    }

    private async launchPreparedGame(runtime: PreparedRuntime, restoreSavedGame: boolean, session: number, audio: GameAudioAttempt): Promise<void> {
        if (!this.isStartingGameSession(session, audio)) {
            return;
        }
        if (restoreSavedGame && !this.getGameStateStore(runtime).hasValidSave()) {
            this.showMenu();
            return;
        }

        const host = this.viewport.gameHost;
        if (host === null) {
            throw new Error("Jackal game host is unavailable during startup.");
        }

        const mainGame = new runtime.Main();
        mainGame.reserveBrowserRuntime();
        this.inputMappingStore.restore(mainGame.buttonMapping);

        const bufferedGame = new runtime.slick.BufferedScalableGame(mainGame, GAME_DISPLAY_WIDTH, GAME_DISPLAY_HEIGHT, {
            maintainAspect: true,
            scalingMode: bufferedScalingModeForPreference(runtime.slick, this.scalingPreference)
        });
        const displayMode = this.viewport.getResponsiveDisplayMode();
        const appContainer = new runtime.slick.AppGameContainer(bufferedGame, displayMode.width, displayMode.height, false);
        appContainer.setPreserveAudioCacheOnDestroy(true);
        appContainer.setLoopSuspended(true);
        appContainer.setHighDpiEnabled(HIGH_DPI_ENABLED);
        appContainer.setMaxDevicePixelRatio(MAX_DEVICE_PIXEL_RATIO);
        this.container = appContainer;
        this.game = mainGame;
        this.viewport.attach(appContainer, bufferedGame, session);
        appContainer.setGraphicsLifecycleHandler((state) => {
            if (state === "lost" && this.isCurrentGameSession(session)) {
                this.requestPwaMenu("graphics-context-lost");
            }
        });
        mainGame.inputMappingChangedHandler = () => {
            if (this.isCurrentGameSession(session)) {
                this.saveCurrentInputMapping();
            }
        };
        if (restoreSavedGame) {
            mainGame.loadingCompleteHandler = (gc) => {
                if (!this.isStartingGameSession(session, audio)) {
                    return false;
                }
                if (!this.getGameStateStore(runtime).restore(mainGame, gc)) {
                    throw new Error("Saved game could not be restored.");
                }
                return true;
            };
        }
        await Promise.resolve(appContainer.setDisplayMode(displayMode.width, displayMode.height, false));
        if (!this.isStartingGameSession(session, audio)) {
            this.disposeStaleLaunch(mainGame, appContainer);
            return;
        }
        await appContainer.start();
        if (!this.isStartingGameSession(session, audio)) {
            this.disposeStaleLaunch(mainGame, appContainer);
            return;
        }
        await ResourceLoader.waitForAll();
        if (!this.isStartingGameSession(session, audio)) {
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
        this.setAudioVolume(this.volume);
        if (!(await commitGameAudio(audio)) || !this.isStartingGameSession(session, audio)) {
            this.disposeStaleLaunch(mainGame, appContainer);
            return;
        }
        this.viewport.startResponsiveSizing(host);
        this.viewport.startCursorAutoHide(host);
        this.viewport.focusCanvas();
        if (!this.isStartingGameSession(session, audio) || this.game !== mainGame || this.container !== appContainer) {
            return;
        }
        mainGame.clearInputPressedRecords();
        if (!this.isStartingGameSession(session, audio)) {
            return;
        }
        this.gameLaunchInProgress = false;
        this.pwaSessionState = "running";
        this.viewport.startHamburgerVisibilityMonitor();
        mainGame.setBrowserSuspended(false);
        if (
            !this.isCurrentGameSession(session) ||
            !isGameAudioCurrent(audio) ||
            this.pwaSessionState !== "running" ||
            this.game !== mainGame ||
            this.container !== appContainer
        ) {
            return;
        }
        appContainer.setLoopSuspended(false);
        this.persistenceWarnings.showPending();
        this.syncScreenWakeLock();
        this.pageLifecycle.sync(true);
    }

    private requestPreferredFullscreen(): void {
        if (!this.fullscreenPreference || this.viewport.getFullscreenCapability() === "unavailable") {
            return;
        }
        void this.viewport.requestFullscreen();
    }

    private returnToMenu(): void {
        this.requestPwaMenu("hamburger");
    }

    private requestPwaMenu(_reason: string): void {
        if (this.pwaSessionState === "booting" || this.pwaSessionState === "menu" || this.pwaSessionState === "stopping" || this.pwaSessionState === "error") {
            return;
        }
        if (
            this.pwaSessionState === "running" &&
            this.game !== null &&
            this.container !== null &&
            !this.container.isDestroyed() &&
            !this.game.isLoadingScreenActive()
        ) {
            void this.showLiveMenuOverlay();
            return;
        }
        const retainExistingOverlay = this.liveMenuOpen && this.menuOverlay !== null && this.game !== null && this.container !== null;
        const session = this.gameSessionGeneration;
        this.pwaSessionState = "stopping";
        this.sessionCleanup.run(() => this.syncScreenWakeLock());
        this.suspendGameForMenu();
        this.sessionCleanup.trySave(() => this.saveCurrentGameState());
        if (!this.sessionCleanup.safe) {
            this.destroyGameSession();
            return;
        }
        if (retainExistingOverlay) {
            void this.restoreExistingLiveMenuAfterInterruptedResume(session);
        } else {
            this.showMenu();
        }
    }

    private async restoreExistingLiveMenuAfterInterruptedResume(session: number): Promise<void> {
        if (!(await this.viewport.exitFullscreenForMenu())) {
            return;
        }
        if (
            !this.isCurrentGameSession(session) ||
            this.pwaSessionState !== "stopping" ||
            !this.liveMenuOpen ||
            this.menuOverlay === null ||
            this.game === null ||
            this.container === null
        ) {
            return;
        }
        this.pwaSessionState = "menu";
        this.syncScreenWakeLock();
    }

    private readonly handleBrowserReservedKey = (event: KeyboardEvent): void => {
        if (this.pwaSessionState !== "starting" && this.pwaSessionState !== "running") {
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.requestPwaMenu("escape");
        }
    };

    private saveCurrentGameState(): boolean {
        if (!this.getOwnership().owned || this.game === null || this.runtimeLoader.preparedRuntime === null || !this.game.isStateSaveReady()) {
            return false;
        }
        const saved = this.getGameStateStore(this.runtimeLoader.preparedRuntime).save(this.game);
        if (!saved) {
            this.persistenceWarnings.report("Progress could not be saved. Your last successful save is unchanged.");
        }
        return saved;
    }

    private clearStoredGameState(): void {
        if (!this.getOwnership().owned) {
            return;
        }
        if (!clearStoredGameState()) {
            this.persistenceWarnings.report("The previous saved game could not be cleared.");
        }
        this.gameStateStore = null;
    }

    private saveCurrentInputMapping(): boolean {
        if (!this.getOwnership().owned || this.game === null) {
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
        if (this.getOwnership()?.owned && this.pwaSessionState === "booting" && this.root.querySelector("[data-loading-progress='true']") !== null) {
            this.renderLoading(this.runtimeLoader.progress);
        }
    }

    private showError(message: string): void {
        this.showLoadError("Unable to start.", message, () => this.showMenu());
    }

    private showResourceLoadError(error: unknown): void {
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
        this.showLoadError("Unable to load the game.", message, () => this.showMenu());
    }

    private showLoadError(title: string, message: string, retryHandler: () => void): void {
        if (!this.destroyGame()) {
            return;
        }
        this.pwaSessionState = "menu";
        if (this.getOwnership().owned) {
            renderLoadErrorScreen(this.root, title, message)?.addEventListener("click", retryHandler);
        }
    }

    private isCurrentGameSession(session: number): boolean {
        return this.sessionCleanup.safe && session === this.gameSessionGeneration && this.getOwnership().isCurrent(this.gameOwnershipEpoch);
    }

    private isStartingGameSession(session: number, audio: GameAudioAttempt): boolean {
        return (
            this.isCurrentGameSession(session) &&
            this.pwaSessionState === "starting" &&
            isGameAudioCurrent(audio) &&
            document.visibilityState === "visible" &&
            document.hasFocus() &&
            this.container?.isGraphicsContextLost() !== true
        );
    }

    private disposeStaleLaunch(mainGame: Main, appContainer: AppGameContainer): void {
        if (this.container === appContainer) {
            this.container = null;
        }
        if (this.game === mainGame) {
            this.game = null;
        }
        this.sessionCleanup.run(
            () => mainGame.disposeBrowserRuntime(),
            () => appContainer.destroy()
        );
        if (!this.sessionCleanup.safe) {
            this.destroyGameSession();
        }
    }

    public releaseSession(): void {
        this.pwaSessionState = "stopping";
        this.gameSessionGeneration++;
        this.menuRequestSerial++;
        this.sessionCleanup.run(() => this.syncScreenWakeLock());
        this.suspendGameForMenu();
        this.sessionCleanup.trySave(() => this.saveCurrentGameState());
        this.destroyGame();
        if (this.sessionCleanup.safe) {
            this.pwaSessionState = "menu";
        }
        this.sessionCleanup.assertSafe();
    }

    private destroyGame(): boolean {
        this.menuRequestSerial++;
        this.sessionCleanup.run(() => this.runtimeLoader.cancelPreparation());
        return this.destroyGameSession();
    }

    private destroyGameSession(): boolean {
        this.pwaSessionState = "stopping";
        this.gameSessionGeneration++;
        this.gameLaunchInProgress = false;
        const oldGame = this.game;
        const oldContainer = this.container;
        this.sessionCleanup.run(
            () => this.syncScreenWakeLock(),
            () => oldContainer?.setLoopSuspended(true),
            () => oldGame?.setBrowserSuspended(true),
            () => oldContainer?.getInput().pause(),
            () => releaseGameAudio(),
            () => {
                this.sessionCleanup.trySave(() => this.saveCurrentInputMapping());
            },
            () => this.removeMenuOverlay(),
            () => this.viewport.stopHamburgerVisibilityMonitor(),
            () => this.viewport.stopCursorAutoHide(),
            () => this.viewport.stopResponsiveSizing(),
            () => oldGame?.stopAllSounds(),
            () => oldGame?.disposeBrowserRuntime(),
            () => {
                if (oldContainer !== null) {
                    oldContainer.destroy();
                } else {
                    SoundStore.get().stopAllPlayback();
                }
            },
            () => this.persistenceWarnings.clearToast(),
            () => this.viewport.clear(),
            () => this.runtimeLoader.preparedRuntime?.slick.Display.setParent(null)
        );
        this.container = null;
        this.game = null;
        this.menuOverlay = null;
        this.liveMenuOpen = false;
        if (!this.sessionCleanup.safe) {
            this.showCleanupFailure();
        }
        return this.sessionCleanup.safe;
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
        this.screenWakeLock.setDesired(
            this.getOwnership()?.isCurrent(this.gameOwnershipEpoch) === true &&
                (this.pwaSessionState === "running" || (this.pwaSessionState === "starting" && !this.liveMenuOpen && this.gameLaunchInProgress))
        );
    }

    private setAudioVolume(value: number): void {
        this.volume = clampVolume(value, this.volume);
        this.applyAudioVolume(this.volume);
    }

    private applyApplicationAudioPreferences(): void {
        const store = SoundStore.get();
        store.setMusicOn(true);
        store.setSoundsOn(true);
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

    private suspendGameForMenu(): boolean {
        return this.sessionCleanup.run(
            () => this.container?.setLoopSuspended(true),
            () => this.game?.setBrowserSuspended(true),
            () => this.container?.getInput().pause(),
            () => releaseGameAudio()
        );
    }

    private showCleanupFailure(): void {
        this.pwaSessionState = "error";
        try {
            this.screenWakeLock.setDesired(false);
        } catch (error) {
            console.error("Unable to release screen wake intent.", error);
        }
        console.error("Session cleanup requires a reload.", this.sessionCleanup.failure);
        try {
            this.root.innerHTML =
                '<main class="menu-screen" role="alert"><section class="menu-panel"><p>This session could not be stopped safely. Reload this tab before continuing.</p><button type="button" id="session-reload">Reload</button></section></main>';
            this.root.querySelector<HTMLButtonElement>("#session-reload")?.addEventListener("click", () => window.location.reload());
        } catch (error) {
            console.error("Unable to display the reload message.", error);
        }
    }
}
