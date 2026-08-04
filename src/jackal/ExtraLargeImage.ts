// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/ExtraLargeImage.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
export class ExtraLargeImage {  public constructor(...args: any[]) {
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3) {
        let main = args[0];
        let tiles = args[1];
        let map = args[2];
            this.main = main;
                this.tiles = tiles;
                this.map = map;
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
