// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
export class JeepYeahPlane {  public constructor(arg0?: any) {
    const argCount = arguments.length;
    this.__construct_JeepYeahPlane(argCount, arg0);
  }
  private __construct_JeepYeahPlane(argCount: number, arg0?: any): void {
    if (argCount === 1 && typeof arg0 === "boolean") {
        let leftLocal = arg0;
            this.left = leftLocal;

                if (leftLocal) {
                  this.z = -8;
                  this.x = -650;
                  this.y = -300;
                } else {
                  this.z = -15;
                  this.x = -950;
                  this.y = -400;
                  this.angle = -30;
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }

  public static readonly CENTER_X: number = MainConstants.DISPLAY_WIDTH / 2;
  public static readonly CENTER_Y: number = MainConstants.DISPLAY_HEIGHT / 2;

  public static readonly Z1: number = 2;
  public static readonly K1: number = 2;
  public static readonly Z0: number = (JeepYeahPlane.K1 * JeepYeahPlane.Z1) / (JeepYeahPlane.K1 - 1);

  public x: number = 0;
  public y: number = 0;
  public z: number = 0;
  public left: boolean = false;
  public angle: number = 0;

  public update(): void {
    this.z += 0.02;
    if (this.left) {
      this.angle -= 0.1;
    } else {
      this.angle += 0.1;
    }
  }

  public render(main: any, g: any): void {

    let k = JeepYeahPlane.Z0 / (JeepYeahPlane.Z0 - this.z);

    g.setWorldClip(0, 288, MainConstants.DISPLAY_WIDTH, 416);
    if (this.left) {
      if (this.z < -7) {
        main.drawRotated(main.blackPlane, JeepYeahPlane.CENTER_X + k * this.x, JeepYeahPlane.CENTER_Y + k * this.y,
            -64, -20, this.angle, k, 8 + this.z);
      } else {
        main.drawRotated(main.blackPlane, JeepYeahPlane.CENTER_X + k * this.x, JeepYeahPlane.CENTER_Y + k * this.y,
            -64, -20, this.angle, k);
      }
    } else {
      if (this.z < -14) {
        main.drawRotated(main.blackPlane, JeepYeahPlane.CENTER_X + k * this.x, JeepYeahPlane.CENTER_Y + k * this.y,
            -64, -20, this.angle, k, 15 + this.z);
      } else {
        main.drawRotated(main.blackPlane, JeepYeahPlane.CENTER_X + k * this.x, JeepYeahPlane.CENTER_Y + k * this.y,
            -64, -20, this.angle, k);
      }
    }
    g.clearWorldClip();
  }
}
