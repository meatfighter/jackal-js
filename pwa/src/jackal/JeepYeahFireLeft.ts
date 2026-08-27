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
export class JeepYeahFireLeft {
    public constructor() {
        const argCount = arguments.length;
        this.__construct_JeepYeahFireLeft(argCount);
    }

    private __construct_JeepYeahFireLeft(argCount: number): void {
        if (argCount === 0) {
            for (let i = 0; i < 7; i++) {
                this.update();
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_GROWING: number = 0;
    public static readonly STATE_MOVING: number = 1;
    public static readonly STATE_SHRINKING: number = 2;
    public static readonly STATE_PAUSED: number = 3;

    public static readonly SPEED: number = 20;

    public static readonly ANGLE: number = -62;
    public static readonly RADIANS: number = (JeepYeahFireLeft.ANGLE * Math.PI) / 180;
    public static readonly rx: number = javaFloat(Math.cos(JeepYeahFireLeft.RADIANS));
    public static readonly ry: number = javaFloat(Math.sin(JeepYeahFireLeft.RADIANS));
    public static readonly vx: number = JeepYeahFireLeft.SPEED * JeepYeahFireLeft.rx;
    public static readonly vy: number = JeepYeahFireLeft.SPEED * JeepYeahFireLeft.ry;

    public static readonly MOVE_TIME: number = 1;
    public static readonly SHRINK_STEPS: number = javaInt(63 / JeepYeahFireLeft.SPEED);
    public static readonly PAUSE_TIME: number = 3;

    public static readonly I_SHRINK_STEPS: number = 1 / JeepYeahFireLeft.SHRINK_STEPS;

    public scale: number = 0;
    public state: number = 0;
    public x: number = 0;
    public y: number = 0;
    public delay: number = 0;

    public update(): void {
        switch (this.state) {
            case JeepYeahFireLeft.STATE_GROWING:
                this.x += JeepYeahFireLeft.SPEED;
                this.scale = this.x / 63;
                if (this.scale >= 1) {
                    this.state = JeepYeahFireLeft.STATE_MOVING;
                    this.delay = JeepYeahFireLeft.MOVE_TIME;
                    this.x = 382;
                    this.y = 276;
                }
                break;
            case JeepYeahFireLeft.STATE_MOVING:
                this.x += JeepYeahFireLeft.vx;
                this.y += JeepYeahFireLeft.vy;
                if (--this.delay == 0) {
                    this.state = JeepYeahFireLeft.STATE_SHRINKING;
                    this.delay = JeepYeahFireLeft.SHRINK_STEPS;
                }
                break;
            case JeepYeahFireLeft.STATE_SHRINKING:
                this.x += JeepYeahFireLeft.vx;
                this.y += JeepYeahFireLeft.vy;
                this.scale = JeepYeahFireLeft.I_SHRINK_STEPS * this.delay;
                if (--this.delay == 0) {
                    this.state = JeepYeahFireLeft.STATE_PAUSED;
                    this.delay = JeepYeahFireLeft.PAUSE_TIME;
                }
                break;
            case JeepYeahFireLeft.STATE_PAUSED:
                if (--this.delay == 0) {
                    this.state = JeepYeahFireLeft.STATE_GROWING;
                    this.x = 0;
                    this.scale = 0;
                }
                break;
        }
    }

    public render(main: any): void {
        switch (this.state) {
            case JeepYeahFireLeft.STATE_GROWING:
                main.drawRotatedScaled(main.gunFires[1], 382, 276, 0, -18, JeepYeahFireLeft.ANGLE, this.scale, 1);
                break;
            case JeepYeahFireLeft.STATE_MOVING:
                main.drawRotated(main.gunFires[1], this.x, this.y, 0, -18, JeepYeahFireLeft.ANGLE);
                break;
            case JeepYeahFireLeft.STATE_SHRINKING:
                main.drawRotatedScaled(main.gunFires[1], this.x, this.y, 0, -18, JeepYeahFireLeft.ANGLE, this.scale, 1);
                break;
        }
    }
}
