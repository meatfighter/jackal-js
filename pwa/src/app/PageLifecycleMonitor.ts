/** Tracks browser focus/visibility independently of the active Jackal game object. */
export class PageLifecycleMonitor {
    private focusLost = false;
    private visibilityLost = false;

    public constructor(private readonly changed: () => void) {
        window.addEventListener("pagehide", () => this.handlePageHide());
        window.addEventListener("pageshow", () => this.sync(true));
        window.addEventListener("blur", () => this.handleBlur());
        window.addEventListener("focus", () => this.handleFocus());
        document.addEventListener("visibilitychange", () => this.handleVisibilityChange());
    }

    public get suspended(): boolean {
        return this.focusLost || this.visibilityLost;
    }

    public sync(active: boolean): void {
        if (!active) {
            this.reset();
            return;
        }
        this.visibilityLost = document.visibilityState !== "visible";
        this.focusLost = !document.hasFocus();
        this.changed();
    }

    public reset(): void {
        this.focusLost = false;
        this.visibilityLost = false;
    }

    private handlePageHide(): void {
        this.visibilityLost = true;
        this.changed();
    }

    private handleBlur(): void {
        this.focusLost = true;
        this.changed();
    }

    private handleFocus(): void {
        this.focusLost = false;
        this.changed();
    }

    private handleVisibilityChange(): void {
        this.visibilityLost = document.visibilityState !== "visible";
        if (!this.visibilityLost) {
            this.focusLost = !document.hasFocus();
        }
        this.changed();
    }
}
