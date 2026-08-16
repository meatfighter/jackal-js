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
import { BossHelicopter } from "./BossHelicopter.js";
import { GameElement } from "./GameElement.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
export class BossHelicopterManager extends GameElement implements ICameraPanListener {
    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.ready = false;
        this.spawnDelay = 0;
        this.spawned = 0;
        this.destroyed = 0;
    }

    public constructor() {
        super();
        const argCount = arguments.length;
        this.__construct_BossHelicopterManager(argCount);
    }

    private __construct_BossHelicopterManager(argCount: number): void {
        if (argCount === 0) {
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public spawnDelay: number = 91;

    public init(): void {
        this.gameMode.startBossCameraPan(this);
    }

    public panComplete(): void {
        this.ready = true;
        new BossHelicopter();
    }

    public update(): void {
        if (!this.ready) {
            return;
        }
    }

    public render(): void {}
}
