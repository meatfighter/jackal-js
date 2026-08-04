// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/DeadEnemySoldier.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class DeadEnemySoldier extends GameElement {  public constructor(...args: any[]) {
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
  
  public static readonly PRE_FADE_DELAY: number = 91 * 2;
  public static readonly FADE_DELAY: number = 91;
          
  public fading: boolean = false;
  public delay: number = DeadEnemySoldier.PRE_FADE_DELAY;
  
  

  public init(): void {
    this.layer = 1;
    this.main.addPoints(100);
  }

  public update(): void {
    if (this.fading) {
      if (--this.delay == 0) {
        this.remove();
      }
    } else {
      if (--this.delay == 0) {
        this.fading = true;
        this.delay = DeadEnemySoldier.PRE_FADE_DELAY;
      }
    } 
  }

  public render(): void {
    if (this.fading) {
      this.main.draw(this.main.deadEnemySoldier, this.x - 20, this.y - 54, 
          this.delay / DeadEnemySoldier.FADE_DELAY);
    } else {
      this.main.draw(this.main.deadEnemySoldier, this.x - 20, this.y - 54);
    }
  }  
}
