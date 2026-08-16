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
import { GameElement } from "./GameElement.js";
import { IntroPlayer } from "./IntroPlayer.js";
export class Chinook extends GameElement {
    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.angle = 0;
        this.rotorAngle = 0;
        this.z = 0;
        this.state = 0;
        this.vt = 0;
        this.t = 0;
        this.diagonalSteps = 0;
        this.introPlayer = null as any;
        this.X = 0;
        this.Y = 0;
    }

    public constructor() {
        super();
        const argCount = arguments.length;
        this.__construct_Chinook(argCount);
    }

    private __construct_Chinook(argCount: number): void {
        if (argCount === 0) {
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_FOWARDS: number = 0;
    public static readonly STATE_UNLOADING: number = 1;
    public static readonly STATE_AWAY: number = 2;

    public static readonly TO_DEGREES: number = javaFloat(180 / Math.PI);
    public static readonly PI: number = javaFloat(Math.PI);
    public static readonly IPI2: number = javaFloat(2 / Math.PI);

    public static readonly FOWARD_TIME: number = 4 * 91;
    public static readonly DIAGONAL_TIME: number = 91;

    public static readonly DT: number = javaFloat(Math.PI / 2);
    public static readonly AT: number = (2 * Chinook.DT) / (Chinook.FOWARD_TIME * Chinook.FOWARD_TIME);
    public static readonly VT0: number = Chinook.AT * Chinook.FOWARD_TIME;

    public static readonly Z1: number = 1;
    public static readonly SCALE_1: number = 10;
    public static readonly Z0: number = (Chinook.SCALE_1 * Chinook.Z1) / (Chinook.SCALE_1 - 1);

    public rotorAngle: number = 90 + Chinook.TO_DEGREES * Chinook.DT;
    public z: number = 1;
    public state: number = Chinook.STATE_FOWARDS;
    public vt: number = Chinook.VT0;
    public t: number = Chinook.DT;

    public init(): void {
        this.layer = 7;

        this.gameMode.playing = false;

        if (this.main.continued) {
            this.remove();
            this.createPlayer();
        }
    }

    public update(): void {
        switch (this.state) {
            case Chinook.STATE_FOWARDS:
                this.vt -= Chinook.AT;
                if (this.vt >= 0) {
                    this.angle = 90 + Chinook.TO_DEGREES * this.t;
                    this.z = (Chinook.PI - this.t) * Chinook.IPI2;
                    this.t += this.vt;
                    this.x = 1540 + 1024 * javaFloat(Math.cos(this.t));
                    this.y = 10780 + 1024 * javaFloat(Math.sin(this.t));
                } else {
                    this.state = Chinook.STATE_UNLOADING;
                    this.introPlayer = new IntroPlayer(this.x, this.y + 102, this);
                }
                this.main.playSoundIfNotPlaying(this.main.helicopterSound, 0.5);
                break;
            case Chinook.STATE_UNLOADING:
                this.main.playSoundIfNotPlaying(this.main.helicopterSound, 0.5);
                break;
            case Chinook.STATE_AWAY:
                this.vt += Chinook.AT;
                this.angle = Chinook.TO_DEGREES * this.t - 90;
                this.z = -this.t * Chinook.IPI2;
                this.t -= this.vt;
                this.x = this.X + 1024 * javaFloat(Math.cos(this.t));
                this.y = this.Y + 1024 * javaFloat(Math.sin(this.t));
                if (this.angle < -128) {
                    this.remove();
                    this.createPlayer();
                } else {
                    this.main.playSoundIfNotPlaying(this.main.helicopterSound, 0.5 + (this.angle + 90) / 76);
                }
                break;
        }
    }

    private createPlayer(): void {
        this.gameMode.player.x = IntroPlayer.FINAL_X;
        this.gameMode.player.y = IntroPlayer.FINAL_Y;
        this.gameMode.player.makeInvincible();
        if (this.introPlayer != null) {
            this.introPlayer.remove();
        }
        this.gameMode.playing = true;
    }

    public unloadCompleted(): void {
        this.state = Chinook.STATE_AWAY;
        this.X = this.x - 1024;
        this.Y = this.y;
        this.vt = 0;
        this.t = 0;
    }

    public render(): void {
        this.rotorAngle -= 30;
        if (this.rotorAngle == -90) {
            this.rotorAngle = 0;
        }

        let scale = Chinook.Z0 / (Chinook.Z0 - this.z);
        let shadowScale = 3.25 / scale;

        this.main.drawRotatedScaled(
            this.main.chinooks[3],
            this.x + 384 * this.z + 24,
            this.y + 256 * this.z + 16,
            -43.5,
            -22.5,
            this.angle,
            shadowScale,
            shadowScale
        );
        this.main.rotateGraphics(this.x, this.y, this.angle, scale);
        this.main.drawOffset(this.main.chinooks[0], -154, 0);
        this.main.drawOffset(this.main.chinooks[1], -154, -80);
        for (let i = 0; i < 4; i++) {
            let ang = 90 * i + this.rotorAngle;
            this.main.drawRotated(this.main.chinooks[2], -102, 0, 0, -38, ang);
            this.main.drawRotated(this.main.chinooks[2], 96, 0, 0, -38, 315 - ang);
        }
        this.main.popGraphics();
    }
}
