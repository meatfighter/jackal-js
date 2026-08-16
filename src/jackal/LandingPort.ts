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
import { FriendlyHelicopter } from "./FriendlyHelicopter.js";
import { GameElement } from "./GameElement.js";
export class LandingPort extends GameElement {
    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.type = 0;
        this.redIndex = 0;
        this.blueIndex = 0;
    }

    public constructor(arg0?: any, arg1?: any, arg2?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_LandingPort(argCount, arg0, arg1, arg2);
    }

    private __construct_LandingPort(argCount: number, arg0?: any, arg1?: any, arg2?: any): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let typeLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.type = typeLocal;

            switch (typeLocal) {
                case LandingPort.TYPE_LEFT:
                    new FriendlyHelicopter(xLocal + 320, yLocal + 192, false, true);
                    break;
                case LandingPort.TYPE_RIGHT:
                    new FriendlyHelicopter(xLocal + 192, yLocal + 192, false, false);
                    break;
                case LandingPort.TYPE_CIRCLE:
                    new FriendlyHelicopter(xLocal + 224, yLocal + 256, false, false);
                    break;
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly TYPE_LEFT: number = 0;
    public static readonly TYPE_RIGHT: number = 1;
    public static readonly TYPE_CIRCLE: number = 2;

    public static readonly CIRCLE_LIGHTS: any[] = [
        [392, 112],
        [328, 48],
        [264, 16],
        [168, 16],
        [104, 48],
        [40, 112],
        [8, 208],
        [8, 272],
        [40, 368],
        [104, 432],
        [168, 464],
        [264, 464],
        [328, 432],
        [392, 368]
    ];

    private static ALPHAS: any[] = javaArray(182, 0);

    static {
        for (let i = 0; i < 182; i++) {
            LandingPort.ALPHAS[i] = 0.5 + javaFloat(Math.sin((Math.PI * i) / 91)) / 2;
        }
    }

    public redIndex: number = 0;
    public blueIndex: number = 91;

    public init(): void {
        this.layer = 0;
    }

    public update(): void {
        if (++this.redIndex == 182) {
            this.redIndex = 0;
        }
        if (++this.blueIndex == 182) {
            this.blueIndex = 0;
        }
    }

    public render(): void {
        switch (this.type) {
            case LandingPort.TYPE_LEFT:
                for (let i = 0; i < 6; i++) {
                    let X = this.x + 136 + (i << 6);
                    let Y = this.y + 16;
                    if ((i & 1) == 0) {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                        this.main.draw(this.main.lamps[3], X, Y + 320);
                        this.main.draw(this.main.lamps[2], X, Y + 320, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                        this.main.draw(this.main.lamps[1], X, Y + 320);
                        this.main.draw(this.main.lamps[0], X, Y + 320, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                for (let i = 0; i < 3; i++) {
                    let X = this.x + 488;
                    let Y = this.y + 80 + i * 96;
                    if ((i & 1) == 0) {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                break;
            case LandingPort.TYPE_RIGHT:
                for (let i = 0; i < 6; i++) {
                    let X = this.x + 40 + (i << 6);
                    let Y = this.y + 16;
                    if ((i & 1) == 0) {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                        this.main.draw(this.main.lamps[3], X, Y + 320);
                        this.main.draw(this.main.lamps[2], X, Y + 320, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                        this.main.draw(this.main.lamps[1], X, Y + 320);
                        this.main.draw(this.main.lamps[0], X, Y + 320, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                for (let i = 0; i < 3; i++) {
                    let X = this.x + 8;
                    let Y = this.y + 80 + i * 96;
                    if ((i & 1) == 1) {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                break;
            case LandingPort.TYPE_CIRCLE:
                let blue = true;
                for (let i = LandingPort.CIRCLE_LIGHTS.length - 1; i >= 0; i--, blue ^= true) {
                    let X = this.x + LandingPort.CIRCLE_LIGHTS[i][0];
                    let Y = this.y + LandingPort.CIRCLE_LIGHTS[i][1];
                    if (blue) {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                    } else {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                    }
                }
                break;
        }
    }
}
