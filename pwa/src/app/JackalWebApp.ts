import { focusOwnedPanel } from "./FocusOwnership.js";
import { initializeWithDeadline, ReloadRequiredError } from "./PreparationDeadline.js";
import { PersistenceSession, RestoreAttempt } from "./PersistenceSession.js";
import { ButtonMapping } from "../jackal/ButtonMapping.js";
import {
    DEFAULT_HARD_MODE,
    readDifficultyPreference,
    writeVolume,
    writeScalingPreference,
    writeFullscreenPreference,
    writeDifficultyPreference
} from "./AppPreferences.js";
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
import type { MappingWriteResult } from "../jackal/ButtonMapping.js";
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
import { clearPersistedPwaState } from "./PersistenceActions.js";

import { ScreenWakeLockManager } from "./ScreenWakeLockManager.js";
import { bindScalingPicker, bufferedScalingModeForPreference, scalingPickerHtml } from "./ScalingPicker.js";
import { registerServiceWorker } from "./ServiceWorkerRegistrar.js";
import { APP_VERSION } from "./BuildInfo.js";
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

    private gameLaunchInProgress = false;
    private pwaSessionState: PwaSessionState = "booting";
    private container: AppGameContainer | null = null;
    private game: Main | null = null;
    private gameSessionGeneration = 0;
    private gameOwnershipEpoch = -1;
    private menuRequestSerial = 0;
    private menuOverlay: HTMLElement | null = null;
    private liveMenuOpen = false;
    private volume = DEFAULT_VOLUME;
    private scalingPreference = DEFAULT_SCALING_PREFERENCE;
    private fullscreenPreference = DEFAULT_FULLSCREEN_PREFERENCE;

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
        setGameAudioInterruptionHandler((reason) => this.requestPwaMenu(reason));
        document.addEventListener("keydown", this.handleBrowserReservedKey, true);
        registerServiceWorker();
    }

    public showMenu(errorMessage: string | null = null): void {
        const owner = this.getOwnership();
        const epoch = owner.epoch;
        if (!owner.isCurrent(epoch)) {
            return;
        }
        this.refreshOwnedSettings();
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
                    this.publishRootMenu(() => this.hasPotentialSavedGameState(), errorMessage);
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
                    this.showLoadError(
                        "Unable to load the game.",
                        error instanceof ReloadRequiredError ? error.message : "Check your connection and try again.",
                        error instanceof ReloadRequiredError ? () => window.location.reload() : () => this.showMenu(errorMessage),
                        error instanceof ReloadRequiredError ? "Reload" : "Retry"
                    );
                });
            return;
        }
        this.publishRootMenu(() => this.hasPotentialSavedGameState(), errorMessage);
    }

    private publishRootMenu(readCanContinue: () => boolean, errorMessage: string | null = null): void {
        const owner = this.getOwnership();
        const epoch = owner.epoch;
        const request = this.menuRequestSerial;
        const isCurrent = (): boolean => this.sessionCleanup.safe && owner.isCurrent(epoch) && request === this.menuRequestSerial;
        if (!isCurrent()) return;

        try {
            this.pwaSessionState = "menu";
            const canContinue = readCanContinue();
            if (!isCurrent() || this.pwaSessionState !== "menu") return;
            this.renderMenu(this.root, canContinue, errorMessage, false);
        } catch (error) {
            if (!isCurrent()) return;
            // A partially bound normal menu must not retain action authority.
            this.activeMenu = null;
            console.error("Unable to display the game menu.", error);
            try {
                this.showLoadError("Unable to start.", "The menu could not be displayed. Reload this tab.", () => window.location.reload(), "Reload");
            } catch (recoveryError) {
                // Do not recursively render, save, or tear down a replacement here.
                console.error("Unable to display menu recovery.", recoveryError);
            }
        }
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
            </section>
        `;
        if (!overlay) {
            parent.innerHTML = "";
        }
        parent.appendChild(menu);
        this.guardMenuEvents(menu);
        this.bindMenuControls(menu);
        menu.style.visibility = "";
        if (!overlay) this.viewport.focusMenuPanel(menu);
        return menu;
    }

    private bindMenuControls(menu: HTMLElement): void {
        const volumeInput = menu.querySelector<HTMLInputElement>("#volume-input");
        const volumeValue = menu.querySelector<HTMLElement>("#volume-value");
        const volumeIcon = menu.querySelector<HTMLElement>("#volume-icon");
        const fullscreenSwitch = menu.querySelector<HTMLButtonElement>("#fullscreen-switch-button");
        const newGameButton = menu.querySelector<HTMLButtonElement>("#new-game-button");
        const continueButton = menu.querySelector<HTMLButtonElement>("#continue-button");
        const resetButton = menu.querySelector<HTMLButtonElement>("#reset-button");
        if (
            volumeInput === null ||
            volumeValue === null ||
            volumeIcon === null ||
            fullscreenSwitch === null ||
            newGameButton === null ||
            continueButton === null ||
            resetButton === null
        ) {
            throw new Error("Jackal menu is missing required controls.");
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
            writeVolume(this.volume, () => this.getOwnership().isCurrent(this.getOwnership().epoch));
        };
        volumeInput.addEventListener("input", () => {
            this.setAudioVolume(Number(volumeInput.value) / 100);
            updateVolumeUi();
        });
        volumeInput.addEventListener("change", commitVolume);
        fullscreenSwitch.addEventListener("click", () => {
            this.fullscreenPreference = !this.fullscreenPreference;
            writeFullscreenPreference(this.fullscreenPreference, () => this.getOwnership().isCurrent(this.getOwnership().epoch));
            updateFullscreenUi();
        });
        updateVolumeUi();
        updateFullscreenUi();
        bindScalingPicker(
            menu,
            () => this.scalingPreference,
            (value) => this.setScalingPreference(value)
        );

        newGameButton.addEventListener("click", () => {
            if (!this.canActivateFromMenu()) {
                return;
            }
            this.clearStoredGameState();
            void this.startGame(false);
        });
        continueButton.addEventListener("click", () => {
            if (!this.canActivateFromMenu()) {
                return;
            }
            if (this.hasLiveSuspendedGame()) {
                void this.resumeLiveGameFromMenu();
                return;
            }
            void this.startGame(true);
        });
        resetButton.addEventListener("click", () => this.resetPwaState());
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
        writeScalingPreference(value, () => this.getOwnership().isCurrent(this.getOwnership().epoch));
        if (this.runtimeLoader.preparedRuntime !== null) {
            this.viewport.setScalingMode(bufferedScalingModeForPreference(this.runtimeLoader.preparedRuntime.slick, this.scalingPreference));
        }
    }

    private resetPwaState(): void {
        if (!this.canActivateFromMenu()) return;
        const owner = this.getOwnership();
        const epoch = owner.epoch;
        this.persistence.abandonStored();
        if (!this.destroyGame()) return;
        const cleared = this.clearPwaStorage();
        if (!owner.isCurrent(epoch)) return;
        this.volume = DEFAULT_VOLUME;
        this.scalingPreference = DEFAULT_SCALING_PREFERENCE;
        this.fullscreenPreference = DEFAULT_FULLSCREEN_PREFERENCE;
        this.preferredHardMode = DEFAULT_HARD_MODE;
        this.sessionMapping.resetToDefaults();
        this.applyApplicationAudioPreferences();
        this.publishRootMenu(() => false, cleared ? null : "Some settings could not be reset.");
    }

    private clearPwaStorage(): boolean {
        const owner = this.getOwnership();
        const epoch = owner.epoch;
        const cleared = clearPersistedPwaState(this.inputMappingStore, () => owner.isCurrent(epoch));
        this.gameStateStore = null;
        return cleared;
    }

    private hasLiveSuspendedGame(): boolean {
        return this.pwaSessionState === "menu" && this.liveMenuOpen && this.menuOverlay !== null && this.game !== null && this.container !== null;
    }

    private async showLiveMenuOverlay(): Promise<void> {
        const shell = this.viewport.gameShell;
        if (this.pwaSessionState !== "running" || this.game === null || this.container === null || shell === null) return;
        const session = this.gameSessionGeneration;
        this.pwaSessionState = "stopping";
        this.liveMenuOpen = true;
        this.sessionCleanup.run(() => this.syncScreenWakeLock());
        if (this.suspendGameForMenu()) this.sessionCleanup.trySave(() => this.saveCurrentGameState());
        this.sessionCleanup.run(
            () => this.viewport.stopHamburgerVisibilityMonitor(),
            () => this.viewport.hideHamburger(),
            () => this.viewport.stopCursorAutoHide()
        );
        if (!this.sessionCleanup.safe) {
            this.destroyGameSession();
            return;
        }
        await this.finishLiveMenuPresentation(session, null);
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
        let audio: GameAudioAttempt | null = null;
        const ownsRetainedRuntime = (): boolean => this.isCurrentGameSession(session) && this.game === liveGame && this.container === liveContainer;
        try {
            this.applyApplicationAudioPreferences();
            if (!ownsRetainedRuntime() || this.pwaSessionState !== "starting") return;
            audio = beginGameAudio();
            this.requestPreferredFullscreen();
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
            this.syncScreenWakeLock();
        } catch (error) {
            if (ownsRetainedRuntime() && (audio === null || isGameAudioLatest(audio))) {
                console.error("Unable to continue the playback session.", error);
                this.requestPwaMenu("continue-failed");
            }
        } finally {
            if (
                ownsRetainedRuntime() &&
                (audio === null || isGameAudioLatest(audio)) &&
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
        if (!this.canActivateFromMenu()) return;
        const runtime = this.runtimeLoader.preparedRuntime;
        if (runtime === null) {
            this.showMenu();
            return;
        }
        if (!this.destroyGameSession()) return;
        this.gameOwnershipEpoch = this.getOwnership().epoch;
        this.pwaSessionState = "starting";
        this.gameLaunchInProgress = true;
        const session = this.gameSessionGeneration;
        const restoreAttempt = new RestoreAttempt();
        let audio: GameAudioAttempt | null = null;
        try {
            this.applyApplicationAudioPreferences();
            this.syncScreenWakeLock();
            if (!this.isCurrentGameSession(session)) return;
            const host = this.viewport.createShell(session);
            runtime.slick.Display.setParent(host);
            audio = beginGameAudio();
            this.requestPreferredFullscreen();
            if (!(await audio.ready) || !this.isStartingGameSession(session, audio)) return;
            this.setAudioVolume(this.volume);
            await this.launchPreparedGame(runtime, restoreSavedGame, session, audio, restoreAttempt);
        } catch (error) {
            if (!this.isCurrentGameSession(session)) return;
            if (restoreAttempt.rejected) {
                this.persistence.rejectStored();
                this.showMenu();
            } else {
                console.error(error);
                if (error instanceof ReloadRequiredError) this.showLoadError("Unable to start.", error.message, () => window.location.reload(), "Reload");
                else if (error instanceof ResourceLoadException) this.showResourceLoadError(error);
                else this.showLoadError("Unable to start.", "The game could not be started. Try again.", () => this.showMenu());
            }
        } finally {
            if (this.isCurrentGameSession(session) && this.pwaSessionState === "starting" && (audio === null || isGameAudioLatest(audio)))
                this.requestPwaMenu("start-not-accepted");
        }
    }

    private async launchPreparedGame(
        runtime: PreparedRuntime,
        restoreSavedGame: boolean,
        session: number,
        audio: GameAudioAttempt,
        restoreAttempt: RestoreAttempt
    ): Promise<void> {
        if (!this.isStartingGameSession(session, audio)) {
            return;
        }
        if (restoreSavedGame && !this.hasPotentialSavedGameState()) {
            this.showMenu();
            return;
        }

        const host = this.viewport.gameHost;
        if (host === null) {
            throw new Error("Jackal game host is unavailable during startup.");
        }

        let candidateGame: Main | null = null;
        let candidateContainer: AppGameContainer | null = null;
        let publishedToShell = false;
        try {
            const mainGame = (candidateGame = new runtime.Main());
            mainGame.reserveBrowserRuntime();
            mainGame.buttonMapping.copyFrom(this.sessionMapping);
            mainGame.hardMode = this.preferredHardMode;

            const bufferedGame = new runtime.slick.BufferedScalableGame(mainGame, GAME_DISPLAY_WIDTH, GAME_DISPLAY_HEIGHT, {
                maintainAspect: true,
                scalingMode: bufferedScalingModeForPreference(runtime.slick, this.scalingPreference)
            });
            const displayMode = this.viewport.getResponsiveDisplayMode();
            const appContainer = (candidateContainer = new runtime.slick.AppGameContainer(bufferedGame, displayMode.width, displayMode.height, false));
            appContainer.setPreserveAudioCacheOnDestroy(true);
            appContainer.setLoopSuspended(true);
            appContainer.getInput().pause();
            appContainer.setHighDpiEnabled(HIGH_DPI_ENABLED);
            appContainer.setMaxDevicePixelRatio(MAX_DEVICE_PIXEL_RATIO);
            if (!this.isStartingGameSession(session, audio)) return;
            this.container = appContainer;
            this.game = mainGame;
            publishedToShell = true;
            const initializationOwner = {
                signal: appContainer.getBrowserLifetimeSignal(),
                isCurrent: () => this.isStartingGameSession(session, audio) && this.game === mainGame && this.container === appContainer
            };
            this.viewport.attach(appContainer, bufferedGame, session);
            appContainer.setGraphicsLifecycleHandler((state) => {
                if (state === "lost" && this.isCurrentGameSession(session)) {
                    this.requestPwaMenu("graphics-context-lost");
                }
            });
            mainGame.inputMappingChangedHandler = () => {
                if (!this.isCurrentGameSession(session)) {
                    return { saved: false, reason: "stale-session" };
                }
                return this.saveCurrentInputMapping();
            };
            mainGame.difficultyChangedHandler = (hardMode) => {
                if (!this.isCurrentGameSession(session)) {
                    return false;
                }
                this.preferredHardMode = hardMode;
                return writeDifficultyPreference(hardMode, () => this.isCurrentGameSession(session) && this.game === mainGame);
            };
            if (restoreSavedGame) {
                mainGame.loadingCompleteHandler = (gc) => {
                    if (!this.isStartingGameSession(session, audio)) {
                        return false;
                    }
                    if (!this.getGameStateStore(runtime).restore(mainGame, gc)) {
                        restoreAttempt.reject();
                    }
                    return true;
                };
            }
            await initializeWithDeadline(
                Promise.resolve(appContainer.setDisplayMode(displayMode.width, displayMode.height, false)),
                this.sessionCleanup,
                initializationOwner
            );
            if (!this.isStartingGameSession(session, audio)) {
                this.disposeStaleLaunch(mainGame, appContainer);
                return;
            }
            await initializeWithDeadline(appContainer.start(), this.sessionCleanup, initializationOwner);
            if (!this.isStartingGameSession(session, audio)) {
                this.disposeStaleLaunch(mainGame, appContainer);
                return;
            }
            await initializeWithDeadline(ResourceLoader.waitForAll(), this.sessionCleanup, initializationOwner);
            if (!this.isStartingGameSession(session, audio)) {
                this.disposeStaleLaunch(mainGame, appContainer);
                return;
            }

            appContainer.setErrorHandler((error: unknown) => {
                if (!this.isCurrentGameSession(session)) {
                    return;
                }
                console.error(error);
                this.showLoadError("Game error.", "The game encountered an unexpected error. Try again.", () => {
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
            appContainer.getInput().resume();
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
            this.persistence.accept(mainGame);
            appContainer.setLoopSuspended(false);

            this.syncScreenWakeLock();
            this.pageLifecycle.sync(true);
        } finally {
            if (!publishedToShell) {
                this.sessionCleanup.run(
                    () => candidateContainer?.destroy(),
                    () => candidateGame?.disposeBrowserRuntime()
                );
                if (!this.sessionCleanup.safe) this.showCleanupFailure();
            } else if (!this.sessionCleanup.safe) {
                if (this.container === candidateContainer) {
                    this.destroyGame();
                } else {
                    this.sessionCleanup.run(() => candidateContainer?.destroy());
                    this.showCleanupFailure();
                }
            }
        }
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
        const suspended = this.suspendGameForMenu();
        if (suspended && !retainExistingOverlay) this.sessionCleanup.trySave(() => this.saveCurrentGameState());
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
        const overlay = this.menuOverlay;
        if (overlay === null) return;
        await this.finishLiveMenuPresentation(session, overlay);
    }

    private async finishLiveMenuPresentation(session: number, existingOverlay: HTMLElement | null): Promise<void> {
        const owner = this.getOwnership();
        const epoch = owner.epoch;
        const request = this.menuRequestSerial;
        const liveGame = this.game;
        const liveContainer = this.container;
        let expectedOverlay = existingOverlay;
        const isCurrent = (): boolean =>
            this.isCurrentGameSession(session) &&
            owner.isCurrent(epoch) &&
            request === this.menuRequestSerial &&
            this.game === liveGame &&
            this.container === liveContainer &&
            this.liveMenuOpen &&
            this.menuOverlay === expectedOverlay;
        if (liveGame === null || liveContainer === null || !isCurrent() || this.pwaSessionState !== "stopping" || this.menuOverlay !== existingOverlay) return;

        try {
            if (!(await this.viewport.exitFullscreenForMenu()) || !isCurrent() || this.pwaSessionState !== "stopping") return;
            const overlay = existingOverlay ?? this.renderMenu(this.root, true, null, true);
            if (!isCurrent() || this.pwaSessionState !== "stopping" || this.menuOverlay !== existingOverlay) {
                // Only remove this attempt's unadopted new node, never a retained/replacement menu.
                if (existingOverlay === null && this.menuOverlay !== overlay && this.activeMenu !== overlay) {
                    try {
                        overlay.remove();
                    } catch (error) {
                        console.warn("Unable to remove an obsolete menu node.", error);
                    }
                }
                return;
            }
            if (!overlay.isConnected || !this.root.contains(overlay)) throw new Error("The live menu is no longer attached to its application.");
            expectedOverlay = overlay;
            this.menuOverlay = overlay;
            this.pwaSessionState = "menu";
            this.viewport.focusMenuPanel(overlay);
            if (!isCurrent() || this.pwaSessionState !== "menu" || this.menuOverlay !== overlay) return;
            this.syncScreenWakeLock();
        } catch (error) {
            if (!isCurrent() || (this.pwaSessionState !== "stopping" && this.pwaSessionState !== "menu")) return;
            this.activeMenu = null;
            console.error("Unable to display the live game menu.", error);

            let stopped: boolean;
            try {
                stopped = this.destroyGame();
            } catch (teardownError) {
                if (!this.sessionCleanup.safe) {
                    // Teardown already latched its real failure; do not retry a failed severe screen.
                    console.error("Unable to display live-menu cleanup recovery.", teardownError);
                    return;
                }
                // This is an actual essential teardown failure, not the UI error above.
                this.sessionCleanup.run(() => {
                    throw teardownError;
                });
                try {
                    this.showCleanupFailure();
                } catch (recoveryError) {
                    console.error("Unable to display live-menu cleanup recovery.", recoveryError);
                }
                return;
            }
            if (!stopped) return; // The actual destructor already owns severe recovery.
            if (!owner.isCurrent(epoch) || this.game !== null || this.container !== null || this.pwaSessionState !== "stopping") return;
            const recoveryRequest = this.menuRequestSerial;
            this.pwaSessionState = "menu";
            const recoveryIsCurrent = (): boolean =>
                this.sessionCleanup.safe &&
                owner.isCurrent(epoch) &&
                this.menuRequestSerial === recoveryRequest &&
                this.pwaSessionState === "menu" &&
                this.game === null &&
                this.container === null;
            try {
                // Do not call showLoadError here: it would destroy the game a second time.
                const button = renderLoadErrorScreen(this.root, "Unable to display the menu.", "The menu could not be displayed. Reload this tab.", "Reload");
                button?.addEventListener("click", () => {
                    if (button.isConnected && recoveryIsCurrent()) window.location.reload();
                });
                if (button !== null) focusOwnedPanel(button, recoveryIsCurrent);
            } catch (recoveryError) {
                console.error("Unable to display live-menu recovery.", recoveryError);
            }
        }
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
        const mainGame = this.game;
        const runtime = this.runtimeLoader.preparedRuntime;
        if (
            !this.sessionCleanup.safe ||
            !this.getOwnership().owned ||
            mainGame === null ||
            runtime === null ||
            !this.persistence.canSave(mainGame) ||
            this.container?.isLoopSuspended() !== true ||
            !mainGame.isStateSaveReady()
        )
            return false;
        const result = this.getGameStateStore(runtime).save(
            mainGame,
            () => this.getOwnership().owned && this.game === mainGame && this.persistence.canSave(mainGame)
        );
        if (result.saved) this.persistence.didSave();
        return result.saved;
    }

    private clearStoredGameState(): void {
        const owner = this.getOwnership();
        const epoch = owner.epoch;
        if (!owner.isCurrent(epoch)) return;
        this.persistence.abandonStored();
        clearStoredGameState(() => owner.isCurrent(epoch));
        this.gameStateStore = null;
    }

    private saveCurrentInputMapping(): MappingWriteResult {
        const mainGame = this.game;
        const session = this.gameSessionGeneration;
        if (mainGame === null || !this.isCurrentGameSession(session)) return { saved: false, reason: "stale-session" };
        this.sessionMapping.copyFrom(mainGame.buttonMapping);
        return this.inputMappingStore.save(this.sessionMapping, () => this.isCurrentGameSession(session) && this.game === mainGame);
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
        this.showLoadError("Game error.", message, () => window.location.reload(), "Reload");
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

    private showLoadError(title: string, message: string, retryHandler: () => void, action: "Retry" | "Reload" = "Retry"): void {
        if (!this.destroyGame()) {
            return;
        }
        this.pwaSessionState = "menu";
        if (this.getOwnership().owned) {
            const button = renderLoadErrorScreen(this.root, title, message, action);
            const epoch = this.getOwnership().epoch;
            button?.addEventListener("click", () => {
                if (button.isConnected && this.getOwnership().isCurrent(epoch)) retryHandler();
            });
            if (button !== null) focusOwnedPanel(button, () => this.getOwnership().isCurrent(epoch));
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
        if (this.suspendGameForMenu()) this.sessionCleanup.trySave(() => this.saveCurrentGameState());
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
        this.persistence.retire(oldGame);
        this.activeMenu = null;

        const oldContainer = this.container;
        this.sessionCleanup.run(
            () => this.syncScreenWakeLock(),
            () => oldContainer?.setLoopSuspended(true),
            () => oldGame?.setBrowserSuspended(true),
            () => oldContainer?.getInput().pause(),
            () => releaseGameAudio(),

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
        return this.persistence.canReadStored() && hasCurrentStoredGameState();
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
            const button = this.root.querySelector<HTMLButtonElement>("#session-reload");
            button?.addEventListener("click", () => {
                if (button.isConnected) window.location.reload();
            });
            if (button !== null) focusOwnedPanel(button, () => this.pwaSessionState === "error");
        } catch (error) {
            console.error("Unable to display the reload message.", error);
        }
    }

    private readonly persistence = new PersistenceSession<Main>();
    private readonly sessionMapping = new ButtonMapping();
    private preferredHardMode = DEFAULT_HARD_MODE;
    private activeMenu: HTMLElement | null = null;

    private refreshOwnedSettings(): void {
        const owner = this.getOwnership();
        if (!owner.isCurrent(owner.epoch) || !this.persistence.beginOwnership(owner.epoch)) return;
        this.volume = readVolume();
        this.scalingPreference = readScalingPreference();
        this.fullscreenPreference = readFullscreenPreference();
        this.preferredHardMode = readDifficultyPreference();
        this.sessionMapping.resetToDefaults();
        this.inputMappingStore.restore(this.sessionMapping);
    }

    private guardMenuEvents(menu: HTMLElement): void {
        const owner = this.getOwnership();
        const epoch = owner.epoch;
        this.activeMenu = menu;
        const guard = (event: Event): void => {
            if (this.activeMenu === menu && menu.isConnected && owner.isCurrent(epoch) && this.pwaSessionState === "menu") return;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        for (const name of ["click", "input", "change", "keydown", "pointerdown"]) menu.addEventListener(name, guard, true);
    }
}
