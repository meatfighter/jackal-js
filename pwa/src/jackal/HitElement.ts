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
        const argCount = arguments.length;
        this.__construct_HitElement(argCount);
    }

    private __construct_HitElement(argCount: number): void {
        if (argCount === 0) {
            for (let i = 0; i < 8; i++) {
                this.trail[i] = -i;
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
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
        return this.hit(h.x, h.y);
    }

    public hit(arg0?: HitElement | number, arg1?: number, arg2?: number, arg3?: number): boolean {
        const argCount = arguments.length;
        if (argCount === 1 && (arg0 === null || arg0 instanceof HitElement)) {
            return this.hit__overload0(arg0 as HitElement);
        }
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            return this.hit__overload1(javaFloat(arg0), javaFloat(arg1));
        }
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
            return this.hit__overload2(javaFloat(arg0), javaFloat(arg1), javaFloat(arg2), javaFloat(arg3));
        }
        throw new Error(`No Java method overload matched hit: ${argCount}`);
    }

    public hit__overload0(h: HitElement): boolean {
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

    public hit__overload1(px: number, py: number): boolean {
        px = javaFloat(px - this.x);
        py = javaFloat(py - this.y);

        return py >= this.hitY1 && py <= this.hitY2 && px >= this.hitX1 && px <= this.hitX2;
    }

    public hit__overload2(x1: number, y1: number, x2: number, y2: number): boolean {
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
        if (cell != this.trail[this.trailIndex]) {
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

        if (this.trail[i0] == this.trail[i2] && this.trail[i1] == this.trail[i3]) {
            return true;
        }

        let i4 = (this.trailIndex + 4) & 7;
        let i5 = (this.trailIndex + 5) & 7;

        if (this.trail[i0] == this.trail[i3] && this.trail[i1] == this.trail[i4] && this.trail[i2] == this.trail[i5]) {
            return true;
        }

        let i6 = (this.trailIndex + 6) & 7;
        let i7 = (this.trailIndex + 7) & 7;

        if (this.trail[i0] == this.trail[i4] && this.trail[i1] == this.trail[i5] && this.trail[i2] == this.trail[i6] && this.trail[i3] == this.trail[i7]) {
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
