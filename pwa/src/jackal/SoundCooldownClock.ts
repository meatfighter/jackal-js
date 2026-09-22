/** Monotonic active time. Only PWA suspension freezes sound cooldowns. */
export class SoundCooldownClock {
    private elapsedMs = 0;
    private sampledAt: number;
    private paused = false;
    public constructor(private readonly readTime: () => number = () => performance.now()) {
        this.sampledAt = this.readTime();
    }

    public now(): number {
        const current = this.readTime();
        if (!this.paused) this.elapsedMs += Math.max(0, current - this.sampledAt);
        this.sampledAt = current;
        return this.elapsedMs;
    }

    public setPaused(paused: boolean): void {
        this.now();
        this.paused = paused;
    }
}
