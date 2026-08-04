// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/SubmarineMissile.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
export class SubmarineMissile extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.vy = 0;
    this.vx = 0;
    this.tx = 0;
    this.ty = 0;
    this.angle = 0;
    this.explodeDelay = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_SubmarineMissile(...args);
  }
  private __construct_SubmarineMissile(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            yLocal -= 20;
    
                let player = this.gameMode.player;
                let ang = 180 
                    + SubmarineMissile.TO_DEGREES * javaFloat(Math.atan2(yLocal - player.y, xLocal - player.x));
                this.angle = 45 * javaRoundFloat(ang / 45);
                let v = this.main.createUnitVector(this.angle);
                this.vx = SubmarineMissile.SPEED * v[0];
                this.vy = SubmarineMissile.SPEED * v[1];
                this.tx = 18 * v[0];
                this.ty = 18 * v[1];
    
                this.x = xLocal + v[0] * 24;
                this.y = yLocal + v[1] * 24;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPEED: number = 8;
  
  public static readonly TO_DEGREES: number = javaFloat((180.0 / Math.PI));







  

  public init(): void {
    super.init();
    
    this.layer = 4;
    
    this.bulletHits = 1;
    
    this.hitX1 = -22;
    this.hitY1 = -22;
    this.hitX2 = 22;
    this.hitY2 = 22;
    
    this.mine = true;
    this.mineX1 = -8;
    this.mineY1 = -8;
    this.mineX2 = 8;
    this.mineY2 = 8;  
  }

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
    
    if (this.gameMode.isOutsideOfFrame(this.x - 32, this.y - 32, this.x + 32, this.y + 32)) {
      this.playSoundOnRemove = false;
      this.remove();      
    }
  }

  public render(): void {
    this.main.drawRotated(this.main.statueMissiles[0], this.x, this.y, this.angle);
  }  
}
