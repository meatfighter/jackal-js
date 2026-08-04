// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/AppearingEnemyHelicopter.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { EnemyHelicopter } from "./EnemyHelicopter.js";
import { GameElement } from "./GameElement.js";
import { Main } from "./Main.js";
export class AppearingEnemyHelicopter extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 1 && typeof args[0] === "number") {
        let y = args[0];
            this.y = y;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  

  public init(): void {
    this.layer = 0;
  }

  public update(): void { 
    if (this.gameMode.cameraY + Main.DISPLAY_HEIGHT < this.y - 60) {
      new EnemyHelicopter(false);      
      this.remove();
    }
  }

  public render(): void {     
  }  
}
