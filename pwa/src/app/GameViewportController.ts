import type { AppGameContainer } from "slick2d-ts/slick/AppGameContainer";
import type { BufferedScalableGame, BufferedScalingMode } from "slick2d-ts";
import {
    exitBrowserFullscreen,
    getBrowserFullscreenCapability,
    getBrowserFullscreenElement,
    requestBrowserFullscreen,
    type BrowserFullscreenCapability
} from "slick2d-ts/slick/util/BrowserFullscreen";
import { MainConstants } from "../java/MainConstants.js";
import type { Main } from "../jackal/Main.js";

const GAME_CURSOR_HIDE_DELAY_MS = 3000;
const FULLSCREEN_CHANGE_EVENTS = ["fullscreenchange", "webkitfullscreenchange"] as const;

interface DisplayMode {
    readonly width: number;
    readonly height: number;
}

type PendingFullscreenRequest = Readonly<{
    shell: HTMLElement;
    presentation: number;
    promise: Promise<boolean>;
}>;

interface GameViewportCallbacks {
    readonly getGame: () => Main | null;
    readonly isSessionCurrent: (session: number) => boolean;
    readonly isLiveMenuOpen: () => boolean;
    readonly isGameplayActive: () => boolean;
    readonly returnToMenu: () => void;
    readonly fullscreenExited: () => void;
    readonly applyLifecycleSuspension: () => void;
    readonly reportResizeError: (error: unknown) => void;
}

/** Owns responsive sizing, shell fullscreen, hamburger visibility, and cursor idling for the active canvas. */
export class GameViewportController {
    private shell: HTMLElement | null = null;
    private host: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private resizeAnimationFrame = 0;
    private fullscreenResizeSettleAnimationFrame = 0;
    private hamburgerVisibilityAnimationFrame = 0;
    private cursorHost: HTMLElement | null = null;
    private cursorHideTimer = 0;
    private pointerOverHost = false;
    private container: AppGameContainer | null = null;
    private bufferedGame: BufferedScalableGame | null = null;
    private sessionGeneration = 0;
    private presentationGeneration = 0;
    private shellWasFullscreen = false;
    private fullscreenRequestSerial = 0;
    private visibilityTransitionSerial = 0;
    private readonly pendingFullscreenRequests = new Set<PendingFullscreenRequest>();

    public constructor(
        private readonly root: HTMLElement,
        private readonly callbacks: GameViewportCallbacks
    ) {}

    public attach(container: AppGameContainer, bufferedGame: BufferedScalableGame, sessionGeneration: number): void {
        this.container = container;
        this.bufferedGame = bufferedGame;
        this.sessionGeneration = sessionGeneration;
    }

    public setScalingMode(scalingMode: BufferedScalingMode): void {
        this.bufferedGame?.setScalingMode(scalingMode);
    }

    public get gameHost(): HTMLElement | null {
        return this.host;
    }

    public get gameShell(): HTMLElement | null {
        return this.shell;
    }

    public getFullscreenCapability(): BrowserFullscreenCapability {
        return getBrowserFullscreenCapability();
    }

    public createShell(sessionGeneration: number): HTMLElement {
        if (this.shell !== null) {
            throw new Error("The previous Jackal game shell must be cleared before creating another one.");
        }
        this.removeFullscreenChangeListener(this.handleFullscreenChange);
        this.presentationGeneration++;
        this.fullscreenRequestSerial = 0;
        this.root.innerHTML = `
            <div id="game-shell" class="game-shell">
                <div id="game-host" class="game-host"></div>
                <button id="hamburger-button" class="hamburger-button" type="button" aria-label="Return to menu" hidden>
                    <span></span>
                </button>
            </div>
        `;
        const shell = this.root.querySelector<HTMLElement>("#game-shell");
        const host = this.root.querySelector<HTMLElement>("#game-host");
        const hamburger = this.root.querySelector<HTMLButtonElement>("#hamburger-button");
        if (shell === null || host === null || hamburger === null) {
            throw new Error("Unable to create the Jackal game shell.");
        }
        this.shell = shell;
        this.host = host;
        this.sessionGeneration = sessionGeneration;
        this.shellWasFullscreen = false;
        hamburger.addEventListener("click", this.callbacks.returnToMenu);
        this.addFullscreenChangeListener(this.handleFullscreenChange);
        return host;
    }

    public clear(): void {
        const targetShell = this.shell;
        const targetPresentation = this.presentationGeneration;
        const mustHideUntilFullscreenExit =
            getBrowserFullscreenElement() !== null || this.hasPendingFullscreenRequest(targetShell, targetPresentation);
        let visibilityTransition = 0;
        let fullscreenExit: Promise<boolean> | null = null;
        if (mustHideUntilFullscreenExit) {
            visibilityTransition = ++this.visibilityTransitionSerial;
            this.root.style.visibility = "hidden";
            fullscreenExit = this.exitFullscreenForPresentation(targetShell, targetPresentation);
        }

        this.stopHamburgerVisibilityMonitor();
        this.stopCursorAutoHide();
        this.stopResponsiveSizing();
        this.removeFullscreenChangeListener(this.handleFullscreenChange);
        this.shellWasFullscreen = false;
        this.shell = null;
        this.host = null;
        this.container = null;
        this.bufferedGame = null;

        if (fullscreenExit !== null) {
            void fullscreenExit.finally(() => {
                if (visibilityTransition === this.visibilityTransitionSerial) {
                    this.root.style.visibility = "";
                }
            });
        }
    }

    public focusCanvas(): void {
        this.host?.querySelector<HTMLCanvasElement>("canvas")?.focus();
    }

    public hideHamburger(): void {
        const hamburger = this.root.querySelector<HTMLButtonElement>("#hamburger-button");
        if (hamburger !== null) {
            hamburger.hidden = true;
        }
    }

    public startResponsiveSizing(host: HTMLElement): void {
        this.stopResponsiveSizing();
        this.host = host;
        if ("ResizeObserver" in window) {
            this.resizeObserver = new ResizeObserver(this.scheduleResize);
            this.resizeObserver.observe(host);
        }
        window.addEventListener("resize", this.scheduleResize);
        window.visualViewport?.addEventListener("resize", this.scheduleResize);
        this.reconcileDisplayModeNow();
    }

    public stopResponsiveSizing(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        window.removeEventListener("resize", this.scheduleResize);
        window.visualViewport?.removeEventListener("resize", this.scheduleResize);
        if (this.resizeAnimationFrame !== 0) {
            cancelAnimationFrame(this.resizeAnimationFrame);
            this.resizeAnimationFrame = 0;
        }
        if (this.fullscreenResizeSettleAnimationFrame !== 0) {
            cancelAnimationFrame(this.fullscreenResizeSettleAnimationFrame);
            this.fullscreenResizeSettleAnimationFrame = 0;
        }
    }

    public scheduleResize = (): void => {
        if (this.resizeAnimationFrame !== 0) {
            return;
        }
        this.resizeAnimationFrame = requestAnimationFrame(() => {
            this.resizeAnimationFrame = 0;
            this.applyDisplayMode();
        });
    };

    /** Apply the current host geometry before gameplay is allowed to render again. */
    public reconcileDisplayModeNow(): void {
        this.applyDisplayMode();
    }

    public getResponsiveDisplayMode(): DisplayMode {
        const host = this.host ?? this.root.querySelector<HTMLElement>("#game-host");
        const fallback = this.getAvailableDisplayMode();
        if (host === null) {
            return fallback;
        }
        const rect = host.getBoundingClientRect();
        return getAspectFitDisplayMode(host.clientWidth || rect.width || fallback.width, host.clientHeight || rect.height || fallback.height);
    }

    public isFullscreen(): boolean {
        return this.shell !== null && getBrowserFullscreenElement() === this.shell;
    }

    /**
     * Must be called directly from the New Game/Continue activation path. Fullscreen
     * is presentation-only: unsupported/rejected requests resolve false and gameplay
     * continues in the normal responsive viewport.
     */
    public requestFullscreen(): Promise<boolean> {
        const shell = this.shell;
        const session = this.sessionGeneration;
        const presentation = this.presentationGeneration;
        if (shell === null || this.isFullscreen()) {
            return Promise.resolve(this.isFullscreen());
        }

        const requestSerial = ++this.fullscreenRequestSerial;
        const promise = requestBrowserFullscreen(shell).then(
            (requested) => {
                const current =
                    requestSerial === this.fullscreenRequestSerial &&
                    presentation === this.presentationGeneration &&
                    this.shell === shell &&
                    this.callbacks.isSessionCurrent(session) &&
                    this.callbacks.isGameplayActive();
                if (!current) {
                    if (requested && getBrowserFullscreenElement() === shell) {
                        void this.exitStaleFullscreenShell(shell);
                    }
                    return false;
                }
                this.shellWasFullscreen = requested && getBrowserFullscreenElement() === shell;
                this.updateHamburgerVisibility();
                this.scheduleFullscreenResize();
                return this.shellWasFullscreen;
            },
            () => {
                if (
                    requestSerial === this.fullscreenRequestSerial &&
                    presentation === this.presentationGeneration &&
                    this.shell === shell &&
                    this.callbacks.isSessionCurrent(session) &&
                    this.callbacks.isGameplayActive()
                ) {
                    this.reconcileDisplayModeNow();
                }
                return false;
            }
        );
        const pending: PendingFullscreenRequest = { shell, presentation, promise };
        this.pendingFullscreenRequests.add(pending);
        void promise.finally(() => {
            this.pendingFullscreenRequests.delete(pending);
        });
        return promise;
    }

    /** Used before showing any PWA menu/error UI. */
    public exitFullscreenForMenu(): Promise<boolean> {
        return this.exitFullscreenForPresentation(this.shell, this.presentationGeneration);
    }

    public startHamburgerVisibilityMonitor(): void {
        this.stopHamburgerVisibilityMonitor();
        this.updateHamburgerVisibility();
    }

    public stopHamburgerVisibilityMonitor(): void {
        if (this.hamburgerVisibilityAnimationFrame !== 0) {
            cancelAnimationFrame(this.hamburgerVisibilityAnimationFrame);
            this.hamburgerVisibilityAnimationFrame = 0;
        }
    }

    public startCursorAutoHide(host: HTMLElement): void {
        this.stopCursorAutoHide();
        this.cursorHost = host;
        this.pointerOverHost = isElementHovered(host);
        host.addEventListener("pointerenter", this.handlePointerEnter);
        host.addEventListener("pointerleave", this.handlePointerLeave);
        host.addEventListener("pointermove", this.handlePointerInput);
        host.addEventListener("pointerdown", this.handlePointerInput);
        host.addEventListener("pointerup", this.handlePointerInput);
        host.addEventListener("wheel", this.handlePointerInput, { passive: true });
        this.showCursor();
        this.scheduleCursorHide();
    }

    public stopCursorAutoHide(): void {
        if (this.cursorHost !== null) {
            this.cursorHost.removeEventListener("pointerenter", this.handlePointerEnter);
            this.cursorHost.removeEventListener("pointerleave", this.handlePointerLeave);
            this.cursorHost.removeEventListener("pointermove", this.handlePointerInput);
            this.cursorHost.removeEventListener("pointerdown", this.handlePointerInput);
            this.cursorHost.removeEventListener("pointerup", this.handlePointerInput);
            this.cursorHost.removeEventListener("wheel", this.handlePointerInput);
            this.cursorHost.classList.remove("cursor-hidden");
        }
        this.clearCursorHideTimer();
        this.pointerOverHost = false;
        this.cursorHost = null;
    }

    private async exitFullscreenForPresentation(targetShell: HTMLElement | null, targetPresentation: number): Promise<boolean> {
        if (targetPresentation === this.presentationGeneration) {
            this.fullscreenRequestSerial++;
        }
        while (true) {
            const pending = Array.from(this.pendingFullscreenRequests)
                .filter((request) => request.presentation === targetPresentation && request.shell === targetShell)
                .map((request) => request.promise);
            if (pending.length === 0) {
                break;
            }
            await Promise.all(pending);
        }

        const hasExitedTarget = (): boolean => {
            const fullscreenElement = getBrowserFullscreenElement();
            if (targetPresentation !== this.presentationGeneration) {
                return targetShell === null || fullscreenElement !== targetShell;
            }
            return fullscreenElement === null;
        };

        if (hasExitedTarget()) {
            return true;
        }
        const fullscreenElement = getBrowserFullscreenElement();
        if (targetPresentation !== this.presentationGeneration && fullscreenElement !== targetShell) {
            return true;
        }
        try {
            await exitBrowserFullscreen();
        } catch {
            // If fullscreen remains active, stay frozen and wait for browser/user exit.
        }
        if (hasExitedTarget()) {
            return true;
        }
        return await new Promise<boolean>((resolve) => {
            const handleExit = (): void => {
                if (!hasExitedTarget()) {
                    return;
                }
                this.removeFullscreenChangeListener(handleExit);
                resolve(true);
            };
            this.addFullscreenChangeListener(handleExit);
        });
    }

    private hasPendingFullscreenRequest(targetShell: HTMLElement | null, targetPresentation: number): boolean {
        return Array.from(this.pendingFullscreenRequests).some(
            (request) => request.presentation === targetPresentation && request.shell === targetShell
        );
    }

    private async exitStaleFullscreenShell(shell: HTMLElement): Promise<void> {
        if (getBrowserFullscreenElement() !== shell) {
            return;
        }
        try {
            await exitBrowserFullscreen();
        } catch {
            // A stale shell cannot regain application authority; browser/user exit remains sufficient.
        }
    }

    private applyDisplayMode(): void {
        const container = this.container;
        if (container === null || this.host === null) {
            return;
        }
        const fullscreenElement = getBrowserFullscreenElement();
        if (fullscreenElement !== null && fullscreenElement !== this.shell) {
            return;
        }
        const displayMode = this.getResponsiveDisplayMode();
        const session = this.sessionGeneration;
        try {
            void Promise.resolve(container.setDisplayMode(displayMode.width, displayMode.height, false)).catch((error) => {
                if (this.callbacks.isSessionCurrent(session)) {
                    this.callbacks.reportResizeError(error);
                }
            });
        } catch (error) {
            if (this.callbacks.isSessionCurrent(session)) {
                this.callbacks.reportResizeError(error);
            }
        }
    }

    private getAvailableDisplayMode(): DisplayMode {
        const viewport = window.visualViewport;
        return normalizeDisplayMode(
            viewport?.width || window.innerWidth || document.documentElement.clientWidth || MainConstants.DISPLAY_WIDTH,
            viewport?.height || window.innerHeight || document.documentElement.clientHeight || MainConstants.DISPLAY_HEIGHT
        );
    }

    private scheduleFullscreenResize(): void {
        this.scheduleResize();
        if (this.fullscreenResizeSettleAnimationFrame !== 0) {
            cancelAnimationFrame(this.fullscreenResizeSettleAnimationFrame);
        }
        this.fullscreenResizeSettleAnimationFrame = requestAnimationFrame(() => {
            this.fullscreenResizeSettleAnimationFrame = 0;
            this.scheduleResize();
        });
    }

    private readonly handleFullscreenChange = (): void => {
        const shell = this.shell;
        const presentation = this.presentationGeneration;
        const current = shell !== null && getBrowserFullscreenElement() === shell;
        const exitedGameplayFullscreen = this.shellWasFullscreen && !current;
        this.shellWasFullscreen = current;
        this.updateHamburgerVisibility();
        this.scheduleFullscreenResize();
        if (shell !== null) {
            queueMicrotask(() => {
                if (this.shell === shell && this.presentationGeneration === presentation) {
                    this.reconcileDisplayModeNow();
                }
            });
        }
        if (current && !this.callbacks.isGameplayActive()) {
            void this.exitFullscreenForMenu();
            return;
        }
        if (exitedGameplayFullscreen && this.callbacks.isGameplayActive()) {
            this.callbacks.fullscreenExited();
        }
    };

    private readonly updateHamburgerVisibility = (): void => {
        const game = this.callbacks.getGame();
        const hamburger = this.root.querySelector<HTMLButtonElement>("#hamburger-button");
        const fullscreenWithoutTouchExit = this.isFullscreen() && !hasTouchCapability();
        const hidden = this.callbacks.isLiveMenuOpen() || game === null || game.isLoadingScreenActive() || fullscreenWithoutTouchExit;
        if (!hidden) {
            this.callbacks.applyLifecycleSuspension();
        }
        if (hamburger !== null) {
            hamburger.hidden = hidden;
        }
        if (game !== null && game.isLoadingScreenActive()) {
            this.hamburgerVisibilityAnimationFrame = requestAnimationFrame(() => {
                this.hamburgerVisibilityAnimationFrame = 0;
                this.updateHamburgerVisibility();
            });
        }
    };

    private addFullscreenChangeListener(listener: EventListener): void {
        for (const eventName of FULLSCREEN_CHANGE_EVENTS) {
            document.addEventListener(eventName, listener);
        }
    }

    private removeFullscreenChangeListener(listener: EventListener): void {
        for (const eventName of FULLSCREEN_CHANGE_EVENTS) {
            document.removeEventListener(eventName, listener);
        }
    }

    private readonly handlePointerEnter = (): void => {
        this.pointerOverHost = true;
        this.handlePointerInput();
    };

    private readonly handlePointerLeave = (): void => {
        this.pointerOverHost = false;
        this.showCursor();
        this.clearCursorHideTimer();
    };

    private readonly handlePointerInput = (): void => {
        this.showCursor();
        this.scheduleCursorHide();
    };

    private scheduleCursorHide(): void {
        this.clearCursorHideTimer();
        if (this.cursorHost === null || !this.pointerOverHost) {
            return;
        }
        this.cursorHideTimer = window.setTimeout(() => {
            this.cursorHideTimer = 0;
            if (this.cursorHost === null || !this.pointerOverHost) {
                this.showCursor();
                return;
            }
            this.cursorHost.classList.add("cursor-hidden");
        }, GAME_CURSOR_HIDE_DELAY_MS);
    }

    private showCursor(): void {
        this.cursorHost?.classList.remove("cursor-hidden");
    }

    private clearCursorHideTimer(): void {
        if (this.cursorHideTimer !== 0) {
            clearTimeout(this.cursorHideTimer);
            this.cursorHideTimer = 0;
        }
    }
}

function getAspectFitDisplayMode(width: number, height: number): DisplayMode {
    const displayMode = normalizeDisplayMode(width, height);
    const gameAspectRatio = MainConstants.DISPLAY_WIDTH / MainConstants.DISPLAY_HEIGHT;
    const displayAspectRatio = displayMode.width / displayMode.height;
    if (displayAspectRatio > gameAspectRatio) {
        return normalizeDisplayMode(displayMode.height * gameAspectRatio, displayMode.height);
    }
    return normalizeDisplayMode(displayMode.width, displayMode.width / gameAspectRatio);
}

function normalizeDisplayMode(width: number, height: number): DisplayMode {
    return {
        width: Math.max(1, Math.trunc(width)),
        height: Math.max(1, Math.trunc(height))
    };
}

function hasTouchCapability(): boolean {
    if (navigator.maxTouchPoints > 0) {
        return true;
    }
    try {
        return window.matchMedia?.("(any-pointer: coarse)").matches === true;
    } catch {
        return false;
    }
}

function isElementHovered(element: HTMLElement): boolean {
    try {
        return element.matches(":hover");
    } catch {
        return false;
    }
}
