// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/LargeImage.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
export class LargeImage {  public constructor(...args: any[]) {
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 5 && typeof args[3] === "number" && typeof args[4] === "number") {
        let main = args[0];
        let tiles = args[1];
        let map = args[2];
        let width = args[3];
        let height = args[4];
            this.main = main;
                this.tiles = tiles;
                this.map = map;
                this.width = width;
                this.height = height;
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
