// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/TrainManager.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
import { Main } from "./Main.js";
import { Train } from "./Train.js";
export class TrainManager extends GameElement {  public constructor(...args: any[]) {
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

  public static readonly CARS: number = 6;
  
  

  public init(): void {
  }

  public update(): void {
    if (this.y > this.gameMode.cameraY + Main.DISPLAY_HEIGHT) {
      this.remove();
      for(let i = 0; i < TrainManager.CARS; i++) {
        new Train(this.x + (i == 0 ? 0 : 4), this.y + (i << 7), i == 0);
      }
    }
  }

  public render(): void {
  }
}
