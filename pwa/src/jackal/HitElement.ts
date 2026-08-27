import {
    AppGameContainer,
    ApplicationGameContainer,
    BasicGame,
    Color,
    Cursor,
    Display,
    GameContainer,
    GL11,
    Graphics,
    Image,
    Input,
    Log,
    Music,
    Mouse,
    ResourceLoader,
    ScalableGame,
    SlickException,
    Sound,
    SoundStore,
    Sys,
    XMLPackedSheet
} from "slick2d-ts";
import {
    ArrayList,
    Arrays,
    BufferedInputStream,
    Character,
    Class,
    Collections,
    DataInputStream,
    HashMap,
    Integer,
    JAVA_LONG_LOW_3_BITS,
    JAVA_LONG_PACKED_3BIT_SHIFTS,
    JavaString,
    Point2D,
    Random,
    System,
    java2DArray,
    java3DArray,
    java4DArray,
    javaArray,
    javaByte,
    javaChar,
    javaDouble,
    javaFloat,
    javaInt,
    javaIntDiv,
    javaLong,
    javaRoundFloat,
    javaShort,
    rotatePoint
} from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export abstract class HitElement extends GameElement {
    // Java field `hit`; renamed because JavaScript cannot also expose hit(...) under the same key.
    declare public hitField: boolean;
    declare public hitX1: number;
    declare public hitY1: number;
    declare public hitX2: number;
    declare public hitY2: number;

    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.hitField = false;
        this.hitX1 = 0;
        this.hitY1 = 0;
        this.hitX2 = 0;
        this.hitY2 = 0;
        this.trail = null;
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

    public overlap(ax1: any, ay1: any, ax2: any, ay2: any, bx1: any, by1: any, bx2: any, by2: any): boolean {
        return ax1 <= bx2 && ax2 >= bx1 && ay1 <= by2 && ay2 >= by1;
    }

    public hitPoint(h: any): boolean {
        return this.hit(h.x, h.y);
    }

    public hit(arg0?: any, arg1?: any, arg2?: any, arg3?: any): any {
        const argCount = arguments.length;
        if (argCount === 1 && (arg0 === null || arg0 instanceof HitElement)) {
            return this.hit__overload0(arg0);
        }
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            return this.hit__overload1(arg0, arg1);
        }
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
            return this.hit__overload2(arg0, arg1, arg2, arg3);
        }
        throw new Error(`No Java method overload matched hit: ${argCount}`);
    }

    public hit__overload0(h: any): boolean {
        return this.overlap(
            h.x + h.hitX1,
            h.y + h.hitY1,
            h.x + h.hitX2,
            h.y + h.hitY2,
            this.x + this.hitX1,
            this.y + this.hitY1,
            this.x + this.hitX2,
            this.y + this.hitY2
        );
    }

    public hit__overload1(px: any, py: any): boolean {
        px -= this.x;
        py -= this.y;

        return py >= this.hitY1 && py <= this.hitY2 && px >= this.hitX1 && px <= this.hitX2;
    }

    public hit__overload2(x1: any, y1: any, x2: any, y2: any): boolean {
        return this.overlap(x1, y1, x2, y2, this.x + this.hitX1, this.y + this.hitY1, this.x + this.hitX2, this.y + this.hitY2);
    }

    public isHit(): boolean {
        return this.hitField;
    }

    public setHit(hit: any): void {
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

    public checkBounds(maxY: any): void {
        if (this.y + this.hitY1 > maxY) {
            this.remove();
        }
    }
}
