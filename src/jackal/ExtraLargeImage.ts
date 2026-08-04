// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/ExtraLargeImage.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
export class ExtraLargeImage {  public constructor(...args: any[]) {
    this.__construct_ExtraLargeImage(...args);
  }
  private __construct_ExtraLargeImage(...args: any[]): void {
    if (args.length === 3) {
        let mainLocal = args[0];
        let tilesLocal = args[1];
        let mapLocal = args[2];
            this.main = mainLocal;
                this.tiles = tilesLocal;
                this.map = mapLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  private main: any = null as any;
  private tiles: any[] = null as any;
  private map: any[] = null as any;
  
  

  public draw(x: any, y: any): void {
    for(let i = this.map.length - 1; i >= 0; i--) {
      this.main.draw(this.tiles[this.map[i][0]], this.map[i][1] + x, this.map[i][2] + y);
    }
  }  
}
