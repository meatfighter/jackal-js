/**
 * Reports loss of page control to the PWA shell.
 *
 * Focus/visibility return is intentionally not reported: only an explicit
 * New Game/Continue activation may return the application to gameplay.
 */
export class PageLifecycleMonitor {
    public constructor(private readonly changed: () => void) {
        window.addEventListener("pagehide", this.changed);
        window.addEventListener("blur", this.changed);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                this.changed();
            }
        });
    }

    public get suspended(): boolean {
        return document.visibilityState !== "visible" || !document.hasFocus();
    }

    /** Re-check the current page state after a game has finished starting. */
    public sync(active: boolean): void {
        if (active && this.suspended) {
            this.changed();
        }
    }
}
