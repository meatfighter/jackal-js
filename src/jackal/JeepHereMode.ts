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
import { MainConstants } from "../java/MainConstants.js";
import { IFadeListener } from "./IFadeListener.js";
import { IMode } from "./IMode.js";
import { Modes } from "./Modes.js";
export class JeepHereMode implements IMode, IFadeListener {
    public static readonly STATE_FADE_IN: number = 0;
    public static readonly STATE_SLIDE: number = 1;
    public static readonly STATE_HERE: number = 2;
    public static readonly STATE_FADE_OUT: number = 3;
    public static readonly STATE_DONE: number = 4;

    public static readonly COLOR_CYAN: any = new Color(0xff007c8d);

    public static readonly SLIDE_TIME: number = 91;
    public static readonly HERE_DELAY: number = 3 * 91;

    public static readonly SLIDE_SPEED: number = (MainConstants.DISPLAY_WIDTH - 224) / javaFloat(JeepHereMode.SLIDE_TIME);

    public main: any = null as any;
    public gc: any = null as any;
    public state: number = JeepHereMode.STATE_FADE_IN;
    public jeepHereX: number = MainConstants.DISPLAY_WIDTH;
    public delay: number = JeepHereMode.HERE_DELAY;

    public init(main: any, gc: any): void {
        this.main = main;
        this.gc = gc;

        main.startFade(false, this);
        main.requestSong(main.cutsceneSong);
    }

    public fadeCompleted(): void {
        if (this.state == JeepHereMode.STATE_FADE_IN) {
            this.state = JeepHereMode.STATE_SLIDE;
        } else if (this.state == JeepHereMode.STATE_FADE_OUT) {
            this.state = JeepHereMode.STATE_DONE;
            this.main.requestMode(Modes.MAP, this.gc);
        }
    }

    public update(gc: any): void {
        switch (this.state) {
            case JeepHereMode.STATE_SLIDE:
                this.jeepHereX -= JeepHereMode.SLIDE_SPEED;
                if (this.jeepHereX <= 224) {
                    this.jeepHereX = 224;
                    this.state = JeepHereMode.STATE_HERE;
                }
                break;
            case JeepHereMode.STATE_HERE:
                if (--this.delay == 0) {
                    this.state = JeepHereMode.STATE_FADE_OUT;
                    this.main.startFade(true, this);
                }
                break;
        }
    }

    public render(gc: any, g: any): void {
        g.setColor(Color.black);
        g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);

        if (this.state == JeepHereMode.STATE_DONE) {
            return;
        }

        g.setColor(JeepHereMode.COLOR_CYAN);
        g.fillRect(0, 288, MainConstants.DISPLAY_WIDTH, 416);
        g.setColor(Color.white);
        g.fillRect(0, 264, MainConstants.DISPLAY_WIDTH, 16);
        g.setColor(Color.white);
        g.fillRect(0, 712, MainConstants.DISPLAY_WIDTH, 16);

        this.main.jeepHere.draw(this.jeepHereX, 320);

        if (this.state >= JeepHereMode.STATE_HERE) {
            this.main.draw(this.main.heres[0], 160, 320);
            this.main.draw(this.main.heres[1], 287, 416);
        }
    }
}
