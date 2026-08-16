// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { EnemyHelicopter } from "./EnemyHelicopter.js";
import { GameElement } from "./GameElement.js";
export class AppearingEnemyHelicopter extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
  }
  public constructor(arg0?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_AppearingEnemyHelicopter(argCount, arg0);
  }
  private __construct_AppearingEnemyHelicopter(argCount: number, arg0?: any): void {
    if (argCount === 1 && typeof arg0 === "number") {
        let yLocal = arg0;
            this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }

  public init(): void {
    this.layer = 0;
  }

  public update(): void {
    if (this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT < this.y - 60) {
      new EnemyHelicopter(false);
      this.remove();
    }
  }

  public render(): void {
  }
}
