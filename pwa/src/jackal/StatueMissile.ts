// @ts-nocheck
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
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
export class StatueMissile extends Enemy {
    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vx = 0;
        this.angle = 0;
        this.sprite = null as any;
        this.statueX = 0;
        this.statueY = 0;
        this.right = false;
        this.clipX = 0;
        this.explodeDelay = 0;
    }

    public constructor(arg0?: any, arg1?: any, arg2?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_StatueMissile(argCount, arg0, arg1, arg2);
    }

    private __construct_StatueMissile(argCount: number, arg0?: any, arg1?: any, arg2?: any): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let statueXLocal = arg0;
            let statueYLocal = arg1;
            let rightLocal = arg2;
            this.statueX = statueXLocal;
            this.statueY = statueYLocal;
            this.right = rightLocal;

            this.x = statueXLocal + 48;
            this.y = statueYLocal + 86;

            if (rightLocal) {
                this.x -= 26;
                this.vx = StatueMissile.SPEED;
                this.angle = 45;
                this.sprite = this.main.statueMissiles[0];
                this.clipX = statueXLocal + 74;
            } else {
                this.x += 26;
                this.vx = -StatueMissile.SPEED;
                this.angle = 315;
                this.sprite = this.main.statueMissiles[1];
                this.clipX = statueXLocal - 22;
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly EXPLODE_DELAY: number = 91;
    public static readonly SPEED: number = 3.5;

    public init(): void {
        super.init();

        this.layer = 4;

        this.bulletHits = 1;

        this.hitX1 = -22;
        this.hitY1 = -22;
        this.hitX2 = 22;
        this.hitY2 = 22;

        this.mine = true;
        this.mineX1 = -8;
        this.mineY1 = -8;
        this.mineX2 = 8;
        this.mineY2 = 8;
    }

    public update(): void {
        this.x += this.vx;
        this.y += StatueMissile.SPEED;

        if (++this.explodeDelay == StatueMissile.EXPLODE_DELAY) {
            this.playSoundOnRemove = false;
            if (!this.gameMode.isOutsideOfFrame(this.x, this.y)) {
                this.main.playExplodeSound2();
            }
            this.remove();
            new Explosion(this.x + (this.right ? 18 : -18), this.y + 18).setTiny(true);
        }
    }

    public render(): void {
        if (this.right) {
            if (this.x > this.clipX) {
                this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
            } else {
                this.gameMode.g.setWorldClip(this.statueX + 46, this.statueY, 52, 192);
                this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
                this.gameMode.g.clearWorldClip();
            }
        } else {
            if (this.x < this.clipX) {
                this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
            } else {
                this.gameMode.g.setWorldClip(this.statueX - 30, this.statueY, 80, 192);
                this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
                this.gameMode.g.clearWorldClip();
            }
        }
    }
}
