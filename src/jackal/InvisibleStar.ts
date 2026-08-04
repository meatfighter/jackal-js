// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/InvisibleStar.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { Star } from "./Star.js";
export class InvisibleStar extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.type = 0;
  }
  public constructor(arg0?: any, arg1?: any, arg2?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_InvisibleStar(argCount, arg0, arg1, arg2);
  }
  private __construct_InvisibleStar(argCount: number, arg0?: any, arg1?: any, arg2?: any): void {
    if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
        let xLocal = arg0;
        let yLocal = arg1;
        let typeLocal = arg2;
            this.x = xLocal;
                this.y = yLocal;
                this.type = typeLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }

  
  

  public init(): void {
    super.init();
    
    this.layer = 0;
    
    this.hitX1 = -32;
    this.hitY1 = -32;
    this.hitX2 = 32;
    this.hitY2 = 32;
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x, this.y);
      this.main.addPoints(5000);
      new Star(this.x, this.y, this.type);
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    return false;
  }  

  public update(): void {
  }

  public render(): void {
  }  
}
