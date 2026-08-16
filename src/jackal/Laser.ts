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
export class Laser extends Enemy {
    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(arg0?: any, arg1?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_Laser(argCount, arg0, arg1);
    }

    private __construct_Laser(argCount: number, arg0?: any, arg1?: any): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            this.x = xLocal;
            this.y = yLocal;
            this.playSoundOnRemove = false;

            if (this.gameMode.cameraY <= yLocal + 896) {
                this.main.playSound(this.main.laserSound);
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public init(): void {
        super.init();

        this.mine = true;
        this.mineX1 = -1;
        this.mineY1 = 0;
        this.mineX2 = 1;
        this.mineY2 = 832;

        this.solid = true;
        this.solidX1 = -16;
        this.solidY1 = 0;
        this.solidX2 = 16;
        this.solidY2 = 832;
    }

    public explode(): void {}

    // returns true if player bumped into the enemy

    public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {
        if (invincible) {
            return false;
        }
        if (this.isMine(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    // returns true if attack successful

    public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
        return false;
    }

    // returns true if player bullet was absorbed by enemy

    public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
        return false;
    }

    public update(): void {}

    public render(): void {}
}
