// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/LargeImage.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
export class LargeImage {  public constructor(...args: any[]) {
    this.__construct_LargeImage(...args);
  }
  private __construct_LargeImage(...args: any[]): void {
    if (args.length === 5 && typeof args[3] === "number" && typeof args[4] === "number") {
        let mainLocal = args[0];
        let tilesLocal = args[1];
        let mapLocal = args[2];
        let widthLocal = args[3];
        let heightLocal = args[4];
            this.main = mainLocal;
                this.tiles = tilesLocal;
                this.map = mapLocal;
                this.width = widthLocal;
                this.height = heightLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  private main: any = null as any;
  private tiles: any[] = null as any;
  private map: any[] = null as any;
  private width: number = 0;
  private height: number = 0;
  
  

  public draw(x: any, y: any): void {
    for(let i = this.height - 1; i >= 0; i--) {
      let Y = y + (i << 5);
      for(let j = this.width - 1; j >= 0; j--) {
        this.main.draw(this.tiles[this.map[i][j]], x + (j << 5), Y);
      }
    }
  }
}
