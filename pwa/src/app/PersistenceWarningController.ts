import { escapeHtml } from "./JackalScreens.js";

export class PersistenceWarningController {
    private pendingMessage: string | null = null;
    private toastTimer = 0;

    public constructor(
        private readonly root: HTMLElement,
        private readonly getGameShell: () => HTMLElement | null,
        private readonly isLiveMenuOpen: () => boolean,
        private readonly isPageSuspended: () => boolean
    ) {}

    public report(message: string): void {
        this.pendingMessage = message;
        if (!this.isPageSuspended() && !this.isLiveMenuOpen()) {
            this.showPending();
        }
    }

    public takePendingHtml(): string {
        const warning = this.pendingMessage;
        this.pendingMessage = null;
        return warning === null ? "" : `<p class="warning-message" role="status">${escapeHtml(warning)}</p>`;
    }

    public showPending(): void {
        const warning = this.pendingMessage;
        const shell = this.getGameShell();
        if (warning === null || shell === null || this.isLiveMenuOpen()) {
            return;
        }
        this.pendingMessage = null;
        this.clearToast();
        const element = document.createElement("div");
        element.className = "persistence-warning";
        element.setAttribute("role", "status");
        element.textContent = warning;
        shell.appendChild(element);
        this.toastTimer = window.setTimeout(() => {
            this.toastTimer = 0;
            element.remove();
        }, 6000);
    }

    public clearToast(): void {
        if (this.toastTimer !== 0) {
            clearTimeout(this.toastTimer);
            this.toastTimer = 0;
        }
        this.root.querySelector(".persistence-warning")?.remove();
    }
}
