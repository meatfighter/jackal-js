import { AppGameContainer, Display, ResourceLoader, ScalableGame, SoundStore } from "slick2d-ts";
import { Main } from "../jackal/Main.js";
import { RESOURCE_MANIFEST } from "./ResourceManifest.js";
import { registerServiceWorker } from "./ServiceWorkerRegistrar.js";

declare const __BUILD_STAMP__: string;

export class JackalWebApp {
    private readonly root: HTMLElement;
    private container: AppGameContainer | null = null;
    private volume = 0.8;

    public constructor(root: HTMLElement) {
        this.root = root;
        registerServiceWorker(__BUILD_STAMP__);
    }

    public showMenu(errorMessage: string | null = null): void {
        this.stopGame();
        this.root.innerHTML = `
            <main class="menu-screen">
                <section class="menu-panel">
                    <h1>Jackal</h1>
                    ${errorMessage ? `<p class="error-message">${escapeHtml(errorMessage)}</p>` : ""}
                    <label class="volume-row">
                        <span>Volume</span>
                        <input id="volume" type="range" min="0" max="100" value="${Math.round(this.volume * 100)}">
                    </label>
                    <button id="start-button" type="button">Start</button>
                </section>
            </main>
        `;

        const slider = this.root.querySelector<HTMLInputElement>("#volume");
        slider?.addEventListener("input", () => {
            this.volume = Number(slider.value) / 100;
            this.applyVolume();
        });

        this.root.querySelector<HTMLButtonElement>("#start-button")?.addEventListener("click", () => {
            void this.startGame();
        });
    }

    private async startGame(): Promise<void> {
        try {
            this.renderLoading("Loading resources");
            this.applyVolume();
            ResourceLoader.removeAllResourceLocations();
            ResourceLoader.addResourceLocation("/resources/");
            ResourceLoader.setCacheBust(__BUILD_STAMP__);
            ResourceLoader.setRetryOptions(5, 250);
            await ResourceLoader.preloadResources(RESOURCE_MANIFEST, (progress) => {
                this.renderLoading(`Loading ${progress.loaded}/${progress.total}`);
            });

            this.root.innerHTML = `
                <button id="hamburger" class="hamburger" type="button" aria-label="Return to menu">
                    <span></span><span></span><span></span>
                </button>
                <div id="game-host" class="game-host"></div>
            `;
            this.root.querySelector<HTMLButtonElement>("#hamburger")?.addEventListener("click", () => {
                this.showMenu();
            });

            const game = new Main();
            const scaled = new ScalableGame(game as any, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT, true);
            this.container = new AppGameContainer(scaled, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT, false);
            Display.setParent(this.root.querySelector("#game-host") as HTMLElement);
            this.applyVolume();
            await this.container.start();
        } catch (error) {
            this.showMenu(error instanceof Error ? error.message : String(error));
        }
    }

    private renderLoading(label: string): void {
        this.root.innerHTML = `
            <main class="boot-screen">
                <div class="boot-title">Jackal</div>
                <div class="boot-loading">${escapeHtml(label)}<span class="dot dot-1">.</span><span class="dot dot-2">.</span><span class="dot dot-3">.</span></div>
            </main>
        `;
    }

    private stopGame(): void {
        if (this.container !== null) {
            this.container.destroy();
            this.container = null;
        }
    }

    private applyVolume(): void {
        SoundStore.get().setMusicVolume(this.volume);
        SoundStore.get().setSoundVolume(this.volume);
    }
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;");
}
