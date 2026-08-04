// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/JeepYeahBullet.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
export class JeepYeahBullet {
  
  public static readonly VX0: number = -2;
  public static readonly VY0: number = -5;
  public static readonly G: number = 0.25;
  public static readonly ANGLE_SPEED: number = -5;
  public static readonly SCALE_SPEED: number = 0.015;
  
  public x: number = 308;
  public y: number = 408;
  public vx: number = JeepYeahBullet.VX0;
  public vy: number = JeepYeahBullet.VY0;
  public angle: number = -50;
  public remove: boolean = false;
  public scale: number = 1;

  public update(): void {
    this.angle += JeepYeahBullet.ANGLE_SPEED;
    this.vy += JeepYeahBullet.G;
    this.x += this.vx;
    this.y += this.vy;
    
    this.scale -= JeepYeahBullet.SCALE_SPEED;
    if (this.scale <= 0) {
      this.removeFlag = true;
    }
  }
  
  public render(main: any): void {
    main.drawRotated(main.jeepYeahBullet, this.x, this.y, -10, -2, this.angle, this.scale);
  }
}
