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
import { Main } from "./Main.js";
import { Modes } from "./Modes.js";
export class CutsceneSequence {
    public constructor() {
        const argCount = arguments.length;
        this.__construct_CutsceneSequence(argCount);
    }

    private __construct_CutsceneSequence(argCount: number): void {
        if (argCount === 0) {
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    private static modes: any = new ArrayList<Modes>();

    private static fillList(): void {
        CutsceneSequence.modes.add(Modes.YEAH);
        CutsceneSequence.modes.add(Modes.WE_MADE_IT);
        CutsceneSequence.modes.add(Modes.HERE);
    }

    public static requestCutscene(gc: any): void {
        if (CutsceneSequence.modes.isEmpty()) {
            CutsceneSequence.fillList();
        }
        Main.mainInstance.requestMode(CutsceneSequence.modes.remove(Main.mainInstance.random.nextInt(CutsceneSequence.modes.size())), gc);
    }
}
