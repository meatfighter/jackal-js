// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BulletHit.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class BulletHit extends GameElement {  public constructor(...args: any[]) {
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
  
  public static readonly TIME_TO_LIVE: number = 10;
  
  public timeToLive: number = BulletHit.TIME_TO_LIVE;
  
    

  public init(): void {
    this.layer = 1;
  }

  public update(): void {    
    if (--this.timeToLive <= 0) {
      this.removeFlag = true;
    }
  }

  public render(): void {
    this.main.drawCentered(this.main.bulletHit, this.x, this.y);
  }  
}
