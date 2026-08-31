import { javaFloat, javaArray, javaInt } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export abstract class HitElement extends GameElement {
    // Java field `hit`; renamed because JavaScript cannot also expose hit(...) under the same key.
    declare public hitField: boolean;
    declare public hitX1: number;
    declare public hitY1: number;
    declare public hitX2: number;
    declare public hitY2: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.hitField = false;
        this.hitX1 = 0;
        this.hitY1 = 0;
        this.hitX2 = 0;
        this.hitY2 = 0;
        this.trail = null!;
        this.trailIndex = 0;
    }

    public constructor() {
        super();
        for (let i = 0; i < 8; i++) {
            this.trail[i] = -i;
        }
    }

    public trail: number[] = javaArray(8, 0);
    public trailIndex: number = 7;

    public init(): void {
        this.enemy = true;
    }

    public overlap(ax1: number, ay1: number, ax2: number, ay2: number, bx1: number, by1: number, bx2: number, by2: number): boolean {
        return ax1 <= bx2 && ax2 >= bx1 && ay1 <= by2 && ay2 >= by1;
    }

    public hitPoint(h: HitElement): boolean {
        return this.hitAt(h.x, h.y);
    }

    public hitElement(h: HitElement): boolean {
        return this.overlap(
            javaFloat(h.x + h.hitX1),
            javaFloat(h.y + h.hitY1),
            javaFloat(h.x + h.hitX2),
            javaFloat(h.y + h.hitY2),
            javaFloat(this.x + this.hitX1),
            javaFloat(this.y + this.hitY1),
            javaFloat(this.x + this.hitX2),
            javaFloat(this.y + this.hitY2)
        );
    }

    public hitAt(px: number, py: number): boolean {
        px = javaFloat(px);
        py = javaFloat(py);

        px = javaFloat(px - this.x);
        py = javaFloat(py - this.y);

        return py >= this.hitY1 && py <= this.hitY2 && px >= this.hitX1 && px <= this.hitX2;
    }

    public hitBounds(x1: number, y1: number, x2: number, y2: number): boolean {
        x1 = javaFloat(x1);
        y1 = javaFloat(y1);
        x2 = javaFloat(x2);
        y2 = javaFloat(y2);

        return this.overlap(
            x1,
            y1,
            x2,
            y2,
            javaFloat(this.x + this.hitX1),
            javaFloat(this.y + this.hitY1),
            javaFloat(this.x + this.hitX2),
            javaFloat(this.y + this.hitY2)
        );
    }

    public isHit(): boolean {
        return this.hitField;
    }

    public setHit(hit: boolean): void {
        this.hitField = hit;
    }

    public updateTrail(): void {
        let cell = ((javaInt(this.y) >> 7) << 4) | (javaInt(this.x) >> 7);
        if (cell !== this.trail[this.trailIndex]) {
            if (--this.trailIndex < 0) {
                this.trailIndex = 7;
            }
            this.trail[this.trailIndex] = cell;
        }
    }

    public trailContainsLoop(): boolean {
        let i0 = this.trailIndex;
        let i1 = (this.trailIndex + 1) & 7;
        let i2 = (this.trailIndex + 2) & 7;
        let i3 = (this.trailIndex + 3) & 7;

        if (this.trail[i0] === this.trail[i2] && this.trail[i1] === this.trail[i3]) {
            return true;
        }

        let i4 = (this.trailIndex + 4) & 7;
        let i5 = (this.trailIndex + 5) & 7;

        if (this.trail[i0] === this.trail[i3] && this.trail[i1] === this.trail[i4] && this.trail[i2] === this.trail[i5]) {
            return true;
        }

        let i6 = (this.trailIndex + 6) & 7;
        let i7 = (this.trailIndex + 7) & 7;

        if (this.trail[i0] === this.trail[i4] && this.trail[i1] === this.trail[i5] && this.trail[i2] === this.trail[i6] && this.trail[i3] === this.trail[i7]) {
            return true;
        }

        return false;
    }

    public override checkBounds(maxY: number): void {
        if (javaFloat(this.y + this.hitY1) > maxY) {
            this.remove();
        }
    }
}
