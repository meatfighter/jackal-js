// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Flame.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class Flame extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.spriteCounter = 0;
    this.spriteIndex = 0;
    this.delay = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_Flame(...args);
  }
  private __construct_Flame(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            this.x = xLocal;
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly TIME_TO_LIVE: number = 1 * 91;
  
  public static readonly ALPHAS: any[] = javaArray(Flame.TIME_TO_LIVE, 0);
  
  static {
    for(let i = 0; i < Flame.TIME_TO_LIVE; i++) {
      Flame.ALPHAS[i] = javaFloat(Math.sqrt(i / javaFloat(Flame.TIME_TO_LIVE)));      
    }
  }


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
