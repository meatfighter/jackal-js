// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class BulletHit extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.timeToLive = 0;
  }
  public constructor(arg0?: any, arg1?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_BulletHit(argCount, arg0, arg1);
  }
  private __construct_BulletHit(argCount: number, arg0?: any, arg1?: any): void {
    if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
        let xLocal = arg0;
        let yLocal = arg1;
            this.x = xLocal;
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
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
