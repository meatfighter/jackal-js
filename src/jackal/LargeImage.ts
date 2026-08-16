// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
export class LargeImage {  public constructor(arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any) {
    const argCount = arguments.length;
    this.__construct_LargeImage(argCount, arg0, arg1, arg2, arg3, arg4);
  }
  private __construct_LargeImage(argCount: number, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void {
    if (argCount === 5 && typeof arg3 === "number" && typeof arg4 === "number") {
        let mainLocal = arg0;
        let tilesLocal = arg1;
        let mapLocal = arg2;
        let widthLocal = arg3;
        let heightLocal = arg4;
            this.main = mainLocal;
                this.tiles = tilesLocal;
                this.map = mapLocal;
                this.width = widthLocal;
                this.height = heightLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }

  private main: any = null as any;
  private tiles: any[] = null as any;
  private map: any[] = null as any;
  private width: number = 0;
  private height: number = 0;

  public draw(x: any, y: any): void {
    let main = this.main;
    let tiles = this.tiles;
    let map = this.map;
    for(let i = this.height - 1; i >= 0; i--) {
      let Y = y + (i << 5);
      for(let j = this.width - 1; j >= 0; j--) {
        main.draw__overload0(tiles[map[i][j]], x + (j << 5), Y);
      }
    }
  }
}
