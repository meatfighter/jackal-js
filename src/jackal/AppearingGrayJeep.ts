// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/AppearingGrayJeep.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
import { GrayJeep } from "./GrayJeep.js";
export class AppearingGrayJeep extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_AppearingGrayJeep(...args);
  }
  private __construct_AppearingGrayJeep(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            this.x = xLocal;
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  

  public init(): void {
    this.layer = 0;
  }

  public update(): void { 
    if (this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT < this.y - 48) {
      let grayJeep = new GrayJeep(this.x, this.y);
      grayJeep.targetAngle = 270;
      grayJeep.displayAngle = 270;
      this.remove();
    }
  }

  public render(): void {     
  }  
}
