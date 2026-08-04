// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Flame.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class Flame extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = x;
                this.y = y;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly TIME_TO_LIVE: number = 1 * 91;
  
  public static readonly ALPHAS: any[] = javaArray(Flame.TIME_TO_LIVE, 0);
  
  static {
    for(let i = 0; i < Flame.TIME_TO_LIVE; i++) {
      Flame.ALPHAS[i] = Math.sqrt(i / Flame.TIME_TO_LIVE);      
    }
  }
  
  public spriteCounter: number = 0;
  public spriteIndex: number = 0;
  public delay: number = Flame.TIME_TO_LIVE;  
  
  

  public init(): void {
    this.layer = 0;
  }

  public update(): void {
    if (--this.delay == 0) {
      this.remove();
    }
  }

  public render(): void {
    if (++this.spriteCounter == 8) {
      this.spriteCounter = 0;
      this.spriteIndex ^= 1;
    }
    this.main.drawCenteredAlpha(this.main.fires[this.spriteIndex][2], this.x, this.y, Flame.ALPHAS[this.delay]);
  }
}
