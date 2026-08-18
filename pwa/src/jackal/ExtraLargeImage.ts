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
export class ExtraLargeImage {
    public constructor(arg0?: any, arg1?: any, arg2?: any) {
        const argCount = arguments.length;
        this.__construct_ExtraLargeImage(argCount, arg0, arg1, arg2);
    }

    private __construct_ExtraLargeImage(argCount: number, arg0?: any, arg1?: any, arg2?: any): void {
        if (argCount === 3) {
            let mainLocal = arg0;
            let tilesLocal = arg1;
            let mapLocal = arg2;
            this.main = mainLocal;
            this.tiles = tilesLocal;
            this.map = mapLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    private main: any = null as any;
    private tiles: any[] = null as any;
    private map: any[] = null as any;

    public draw(x: any, y: any): void {
        let main = this.main;
        let tiles = this.tiles;
        let map = this.map;
        for (let i = this.map.length - 1; i >= 0; i--) {
            main.draw__overload0(tiles[map[i][0]], map[i][1] + x, map[i][2] + y);
        }
    }
}
