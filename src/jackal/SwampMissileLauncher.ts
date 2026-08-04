// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/SwampMissileLauncher.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { SwampMissile } from "./SwampMissile.js";
export class SwampMissileLauncher extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.splashIndex = 0;
    this.launchDelay = 0;
    this.splashing = 0;
    this.ready = false;
  }
  public constructor(arg0?: any, arg1?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_SwampMissileLauncher(argCount, arg0, arg1);
  }
  private __construct_SwampMissileLauncher(argCount: number, arg0?: any, arg1?: any): void {
    if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
        let xLocal = arg0;
        let yLocal = arg1;
            this.x = xLocal;
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }
  
  public static readonly LAUNCH_DELAY: number = 3 * 91;
  
  public static readonly splashIndices: any[] = [ true, true, false, true, false, false]; 




  
  

  public init(): void {
    super.init();  
    
    this.layer = 3;
    
    this.bulletHits = 4;
    
    this.hitX1 = 12;
    this.hitY1 = 4;
    this.hitX2 = 52;
    this.hitY2 = 28;
    
    this.mine = true;
    this.mineX1 = 16;
    this.mineY1 = 8;
    this.mineX2 = 48;
    this.mineY2 = 24;
    
    this.solid = true;
    this.solidX1 = 0;
    this.solidY1 = 0;
    this.solidX2 = 64;
    this.solidY2 = 32;
    
    this.points = 2000;
    
    this.explosionX = 32;
    this.explosionY = 16;
  }

  public update(): void {
    if (this.ready) {
      if (this.splashing > 0) {
        this.splashing--;
      }
      if (this.launchDelay > 0) {
        this.launchDelay--;
      } else if (!this.gameMode.isOutsideOfFrame(this.x + 32, this.y + 16)) {
        this.launchDelay = SwampMissileLauncher.LAUNCH_DELAY;
        new SwampMissile(this.x + 32, this.y + 16);
        this.splashing = 16;
      }
    } else {
      if (!this.gameMode.isOutsideOfFrame(this.x + 32, this.y)) {
        this.ready = true;
      }
    }
  } 
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if ((attackSource == AttackSource.PLAYER_WEAPON 
          || attackSource == AttackSource.TRAVELING_EXPLOSION)
        && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
      this.main.addPoints(this.points);
      return true;
    } else {
      return false;
    }
  }  
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    return false;
  }  

  public render(): void {
    if (this.splashing > 8) {
      this.main.draw(this.main.swampMissiles[4], this.x + 2, this.y);
    } else if (this.splashing > 0) {
      this.main.draw(this.main.swampMissiles[3], this.x + 16, this.y);
    } else {
      if (++this.splashIndex == 6) {
        this.splashIndex = 0;
      }    
      if (SwampMissileLauncher.splashIndices[this.splashIndex]) {
        this.main.draw(this.main.swampMissiles[2], this.x + 8, this.y);
      } else {
        this.main.draw(this.main.swampMissiles[1], this.x + 24, this.y);
      }
    }
  }
}
