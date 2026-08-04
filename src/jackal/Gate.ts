// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Gate.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
export class Gate extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.groupIndex = 0;
    this.bossGarageManager = null as any;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_Gate(...args);
  }
  private __construct_Gate(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal2 = args[0];
        let yLocal2 = args[1];
        let bossGarageManagerLocal = args[2];
            this.__construct_Gate(xLocal2, yLocal2);
                this.bossGarageManager = bossGarageManagerLocal;
        return;
    } else     if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            this.x = xLocal;
                this.y = yLocal;
        
                this.groupIndex = this.gameMode.groupsMap[(javaInt(yLocal)) >> 5][((javaInt(xLocal)) >> 5) + 1];
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }


  
  
  
  

  public init(): void {
    super.init();
    
    this.layer = 0;
    
    this.hitX1 = 0;
    this.hitY1 = 0;
    this.hitX2 = 192;
    this.hitY2 = 128;   
  }

  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource == AttackSource.PLAYER_WEAPON && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + 96, this.y + 64);
      this.gameMode.triggerGroup(this.groupIndex);
      if (this.bossGarageManager != null) {
        this.bossGarageManager.gateOpen();
      }
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.hit(x1, y1, x2, y2)) {             
      return true;
    } else {
      return false;
    }
  } 

  public explode(): void {
  }  

  public update(): void {
  }

  public render(): void {
  }  
}
