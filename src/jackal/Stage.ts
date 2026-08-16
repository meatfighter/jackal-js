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
export class Stage {
    public tileMap: any[] = null as any; // mutable during gameplay
    public typesMap: any[] = null as any; // mutable during gameplay

    public tiles: any[] = null as any;
    public groups: any[] = null as any;
    public triggerMap: any[] = javaArray(2, null);
    public groupsMap: any[] = null as any;
    public mapWidth: number = 0;
    public mapHeight: number = 0;
    public directions: any[] = null as any;
    public directionsDecoded: Uint8Array = null as any;
    public directionsWidth: number = 0;
    public directionsHeight: number = 0;
}
