import { AL, AppGameContainer, Display, ResourceLoader, ScalableGame, SoundStore } from "slick2d-ts";
import { Main } from "../jackal/Main.js";
import { JackalInputMappingStore } from "./JackalInputMappingStore.js";
import { JackalGameStateStore } from "../jackal/persistence/JackalGameStateStore.js";
import { RESOURCE_MANIFEST } from "./ResourceManifest.js";
import { registerServiceWorker } from "./ServiceWorkerRegistrar.js";
import versionInfo from "../../version.json";

const GAME_CURSOR_HIDE_DELAY_MS = 3000;
const VOLUME_STORAGE_KEY = "jackal-volume";
const DEFAULT_VOLUME = 0.1;
const HIGH_DPI_ENABLED = true;
const MAX_DEVICE_PIXEL_RATIO = 2;

export class JackalWebApp {
    private readonly root: HTMLElement;
    private readonly gameStateStore = new JackalGameStateStore(versionInfo.version);
    private readonly inputMappingStore = new JackalInputMappingStore();
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
    private runtimeResourcesLoaded = false;
    private suspendedByFocusLoss = false;
    private suspendedByVisibilityLoss = false;
    private volume = safeReadVolume();

    public constructor(root: HTMLElement) {
        this.root = root;
        registerServiceWorker(versionInfo.buildStamp);
        this.setupPageLifecycleHandlers();
    }

    public showMenu(errorMessage: string | null = null): void {
        this.destroyGame();
        const canContinue = this.gameStateStore.hasValidSave();
        this.root.innerHTML = `
            <main class="menu-screen">
                <section class="menu-panel" aria-label="Jackal menu">
                    <label class="volume-row">
                        <span id="volume-icon" class="volume-icon" aria-hidden="true">${volumeIconSvg(this.volume)}</span>
                        <input id="volume-input" type="range" min="0" max="100" step="1" value="${Math.round(this.volume * 100)}" aria-label="Volume">
                        <span id="volume-value" class="volume-value">${Math.round(this.volume * 100)}</span>
                    </label>
                    <div class="menu-buttons">
                        <button id="new-game-button" class="start-button" type="button">New Game</button>
                        <button id="continue-button" class="start-button" type="button"${canContinue ? "" : " disabled"}>Continue</button>
                    </div>
                    ${errorMessage ? `<p class="error-message">${escapeHtml(errorMessage)}</p>` : ""}
                </section>
            </main>
        `;

        const volumeInput = this.root.querySelector<HTMLInputElement>("#volume-input") as HTMLInputElement;
        const volumeValue = this.root.querySelector<HTMLElement>("#volume-value") as HTMLElement;
        const volumeIcon = this.root.querySelector<HTMLElement>("#volume-icon") as HTMLElement;
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

        this.root.querySelector<HTMLButtonElement>("#new-game-button")?.addEventListener("click", () => {
            this.gameStateStore.clear();
            this.setAudioVolume(Number(volumeInput.value) / 100);
            void this.startGame(false);
        });
        this.root.querySelector<HTMLButtonElement>("#continue-button")?.addEventListener("click", () => {
            this.setAudioVolume(Number(volumeInput.value) / 100);
            void this.startGame(true);
        });
    }

    private async startGame(restoreSavedGame: boolean): Promise<void> {
        this.destroyGame();
        const showVisibleLoading = !this.runtimeResourcesLoaded;
        try {
            if (showVisibleLoading) {
                this.renderLoading(0);
            }

            await this.unlockAudio();
            this.configureResourceLoader();
            this.setAudioVolume(this.volume);
            if (showVisibleLoading) {
                await ResourceLoader.preloadResources(RESOURCE_MANIFEST, (progress) => {
                    this.renderLoading(progress.total === 0 ? 0 : progress.loaded / progress.total);
                });
                this.runtimeResourcesLoaded = true;
            }

            const host = this.showGameShell();
            this.activeGameHost = host;
            Display.setParent(host);

            const mainGame = new Main();
            this.inputMappingStore.restore(mainGame.buttonMapping);
            const scalableGame = new ScalableGame(mainGame as any, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT, true);
            const displayMode = this.getResponsiveWindowedDisplayMode();
            const appContainer = new AppGameContainer(scalableGame, displayMode.width, displayMode.height, false);
            appContainer.setHighDpiEnabled(HIGH_DPI_ENABLED);
            appContainer.setMaxDevicePixelRatio(MAX_DEVICE_PIXEL_RATIO);
            this.container = appContainer;
            this.game = mainGame;
            mainGame.appGameContainer = appContainer;
            mainGame.scalableGame = scalableGame;
            mainGame.stateSaveInvalidatedHandler = () => this.clearStoredGameState();
            mainGame.inputMappingChangedHandler = () => this.saveCurrentInputMapping();
            mainGame.windowedDisplayModeProvider = () => this.getResponsiveWindowedDisplayMode();
            mainGame.browserFullscreenController = {
                isFullscreen: () => this.isGameShellFullscreen(),
                enterFullscreen: () => this.enterGameShellFullscreen(),
                exitFullscreen: () => this.exitGameShellFullscreen()
            };
            if (restoreSavedGame) {
                mainGame.loadingCompleteHandler = (gc: unknown) => {
                    if (!this.gameStateStore.restore(mainGame, gc as any)) {
                        throw new Error("Saved game could not be restored.");
                    }
                    return true;
                };
            }
            mainGame.loadingFinishedHandler = () => {
                this.runtimeResourcesLoaded = true;
            };

            appContainer.setErrorHandler((error) => {
                console.error(error);
                this.showLoadError("Unable to start.", "Check your connection and try again.", () => {
                    void this.startGame(restoreSavedGame);
                });
            });
            appContainer.setAlwaysRender(true);
            appContainer.setVSync(true);
            appContainer.setSmoothDeltas(false);
            appContainer.setShowFPS(false);
            appContainer.setClearEachFrame(true);
            await Promise.resolve(appContainer.setDisplayMode(displayMode.width, displayMode.height, false));
            await appContainer.start();
            if (!showVisibleLoading) {
                mainGame.completeLoadingImmediately(appContainer);
                await ResourceLoader.waitForAll();
                this.runtimeResourcesLoaded = true;
            }
            this.startResponsiveGameSizing(host);
            this.startGameCursorAutoHide(host);
            this.startHamburgerVisibilityMonitor();
            this.setAudioVolume(this.volume);
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

    private showGameShell(): HTMLElement {
        this.root.innerHTML = `
            <div id="game-shell" class="game-shell">
                <div id="game-host" class="game-host"></div>
                <button id="hamburger-button" class="hamburger-button" type="button" aria-label="Return to menu" title="Return to menu" hidden>
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
        this.game?.setBrowserSuspended(true);
        this.saveCurrentInputMapping();
        this.saveCurrentGameState();
        this.showMenu();
    }

    private saveCurrentGameState(): boolean {
        if (this.game === null) {
            return false;
        }
        if (this.game.isStateSaveInvalidatingMenuActive()) {
            this.clearStoredGameState();
            return false;
        }
        if (!this.game.isStateSaveReady()) {
            return false;
        }
        return this.gameStateStore.save(this.game);
    }

    private clearStoredGameState(): void {
        this.gameStateStore.clear();
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
            AL.destroy();
        }
        this.game = null;
        this.activeGameShell = null;
        this.activeGameHost = null;
        Display.setParent(null);
    }

    private configureResourceLoader(): void {
        ResourceLoader.removeAllResourceLocations();
        ResourceLoader.addResourceLocation("/resources/");
        ResourceLoader.setCacheBust(versionInfo.buildStamp);
        ResourceLoader.setRetryOptions(5, 250);
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
            void Promise.resolve(this.container.setDisplayMode(displayMode.width, displayMode.height, false))
                .catch((error) => {
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
        const width = viewport?.width || window.innerWidth || document.documentElement.clientWidth || Main.DISPLAY_WIDTH;
        const height = viewport?.height || window.innerHeight || document.documentElement.clientHeight || Main.DISPLAY_HEIGHT;
        return normalizeDisplayMode(width, height);
    }

    private isGameShellFullscreen(): boolean {
        return this.activeGameShell !== null && document.fullscreenElement === this.activeGameShell;
    }

    private enterGameShellFullscreen(): void {
        if (this.activeGameShell === null || this.isGameShellFullscreen() || !this.activeGameShell.requestFullscreen) {
            return;
        }
        void this.activeGameShell.requestFullscreen()
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
        void document.exitFullscreen()
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
        const hidden = this.game === null || this.game.isLoadingScreenActive() || this.isGameShellFullscreen();
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
        if (this.suspendedByVisibilityLoss || this.suspendedByFocusLoss) {
            this.suspendCurrentGameForLifecycle();
            return;
        }

        this.resumeCurrentGameForLifecycle();
    }

    private suspendCurrentGameForLifecycle(): void {
        if (this.game === null || this.game.isLoadingScreenActive()) {
            return;
        }
        this.game.setBrowserSuspended(true);
        this.container?.setLoopSuspended(true);
        this.saveCurrentGameState();
    }

    private resumeCurrentGameForLifecycle(): void {
        if (this.game === null || this.game.isLoadingScreenActive()) {
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
        const soundVolume = Math.sqrt(this.volume);
        SoundStore.get().setSoundVolume(soundVolume);
        SoundStore.get().setMusicVolume(this.volume);
        this.container?.setSoundVolume(soundVolume);
        this.container?.setMusicVolume(this.volume);
    }
}

function getAspectFitDisplayMode(width: number, height: number): { width: number; height: number } {
    const displayMode = normalizeDisplayMode(width, height);
    const gameAspectRatio = Main.DISPLAY_WIDTH / Main.DISPLAY_HEIGHT;
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

function volumeIconSvg(value: number): string {
    const waves = Math.round(value * 100) === 0
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
        const value = Number.parseInt(localStorage.getItem(VOLUME_STORAGE_KEY) ?? String(Math.round(DEFAULT_VOLUME * 100)), 10);
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
        localStorage.setItem(VOLUME_STORAGE_KEY, String(Math.round(value * 100)));
    } catch {
        // Storage can be disabled in hardened/private browser contexts.
    }
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
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}
