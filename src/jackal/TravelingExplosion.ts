// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/TravelingExplosion.java.
// Original Java imports: java.util.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { GameElement } from "./GameElement.js";
export class TravelingExplosion extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.vx = 0;
    this.vy = 0;
    this.notifier = false;
    this.t = 0;
    this.scale = 0;
    this.enemies = null as any;
  }
  public constructor(arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_TravelingExplosion(argCount, arg0, arg1, arg2, arg3, arg4);
  }
  private __construct_TravelingExplosion(argCount: number, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void {
    if (argCount === 5 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number" && typeof arg4 === "boolean") {
        let xLocal = arg0;
        let yLocal = arg1;
        let vxLocal = arg2;
        let vyLocal = arg3;
        let notifierLocal = arg4;
            this.x = xLocal;
                this.y = yLocal;
                this.notifier = notifierLocal;
                this.vx = TravelingExplosion.VELOCITY * vxLocal;
                this.vy = TravelingExplosion.VELOCITY * vyLocal;
    
                this.enemies = this.gameMode.enemies;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }
  
  public static readonly DISTANCE: number = 320;
  public static readonly TRAVEL_TIME: number = 64;
  public static readonly PERIOD0: number = javaIntDiv(TravelingExplosion.TRAVEL_TIME, 3);
  public static readonly PERIOD1: number = javaIntDiv(2 * TravelingExplosion.TRAVEL_TIME, 3);
  public static readonly VELOCITY: number = TravelingExplosion.DISTANCE / TravelingExplosion.TRAVEL_TIME;
  public static readonly ALPHA: number = 0.6;
  
  public static readonly K0: number = 1.25 / TravelingExplosion.PERIOD0;
  public static readonly K1: number = 0.75 / (TravelingExplosion.PERIOD1 - TravelingExplosion.PERIOD0);
  public static readonly K2: number = 0.333 / (TravelingExplosion.TRAVEL_TIME - TravelingExplosion.PERIOD1);






  
    
  
  public init(): void {
    this.layer = 4;
  }

  public update(): void {

    this.x += this.vx;
    this.y += this.vy;
    
    if (++this.t > TravelingExplosion.TRAVEL_TIME) {
      this.removeFlag = true;
      if (this.notifier) {
        this.gameMode.player.setWeaponArmed(true);
      }
    } else {
      let margin = 0;
      if (this.t < TravelingExplosion.PERIOD0) {      
        this.scale = 2.25 - this.t * TravelingExplosion.K0;
        margin = 28 * this.scale;
      } else if (this.t < TravelingExplosion.PERIOD1) {
        this.scale = 1.75 - (this.t - TravelingExplosion.PERIOD0) * TravelingExplosion.K1;
        margin = 18 * this.scale;
      } else {
        this.scale = 1.333 - (this.t - TravelingExplosion.PERIOD1) * TravelingExplosion.K2;
        margin = 16 * this.scale;
      }
       
      let x1 = this.x - margin;
      let y1 = this.y - margin;
      let x2 = this.x + margin;
      let y2 = this.y + margin;
      if (!this.gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
        for(let i = this.enemies.size() - 1; i >= 0; i--) {
          let enemyLocal = this.enemies.get(i);
          if (!enemyLocal.removeFlag) {
            enemyLocal.attack(x1, y1, x2, y2, 
                AttackSource.TRAVELING_EXPLOSION);
          }
        }
      }
    }
  }

  public render(): void {
    if (this.t < TravelingExplosion.PERIOD0) {      
      this.main.drawScaled(this.main.explosions[1], this.x, this.y, this.scale, TravelingExplosion.ALPHA);
    } else if (this.t < TravelingExplosion.PERIOD1) {
      this.main.drawScaled(this.main.explosions[0], this.x, this.y, this.scale, TravelingExplosion.ALPHA);
    } else {
      this.main.drawScaled(this.main.explosions[3], this.x, this.y, this.scale, TravelingExplosion.ALPHA);
    }
  }
}
