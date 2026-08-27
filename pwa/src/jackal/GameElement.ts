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
import { MainRuntimeState } from "./MainRuntimeState.js";
export abstract class GameElement {
    protected __initializeJavaSubclassDefaults(): void {}
    public constructor() {
        const argCount = arguments.length;
        this.__construct_GameElement(argCount);
    }

    private __construct_GameElement(argCount: number): void {
        if (argCount === 0) {
            this.main = MainRuntimeState.mainInstance;
            this.gameMode = MainRuntimeState.gameMode;

            this.__initializeJavaSubclassDefaults();
            this.init();

            this.gameMode.add(this);
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public main: any = null as any;
    public gameMode: any = null as any;

    public removeFlag: boolean = false;
    public enemy: boolean = false;
    public enemyBullet: boolean = false;
    public x: number = 0;
    public y: number = 0;
    public layer: number = 0;
    public changeLayerValue: number = -1;

    public changeLayer(layer: any): void {
        this.changeLayerValue = layer;
    }

    public remove(): void {
        this.removeFlag = true;
    }

    public checkBounds(maxY: any): void {}

    public abstract init(): void;
    public abstract update(): void;
    public abstract render(): void;
}
