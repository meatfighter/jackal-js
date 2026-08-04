// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Parachute.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { EnemySoldier } from "./EnemySoldier.js";
import { EnemySoldierType } from "./EnemySoldierType.js";
import { Explosion } from "./Explosion.js";
import { GameElement } from "./GameElement.js";
export class Parachute extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.delay = 0;
    this.state = 0;
    this.vx = 0;
    this.inflate = 0;
    this.inflate2 = 0;
    this.bossHelicopter = null as any;
    this.left = false;
  }
  public constructor(arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_Parachute(argCount, arg0, arg1, arg2, arg3, arg4);
  }
  private __construct_Parachute(argCount: number, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): void {
    if (argCount === 5 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "boolean") {
        let xLocal = arg0;
        let yLocal = arg1;
        let distance = arg2;
        let leftLocal = arg3;
        let bossHelicopterLocal = arg4;
            this.x = xLocal;
                this.y = yLocal;
                this.bossHelicopter = bossHelicopterLocal;
    
                this.delay = javaInt((distance / Parachute.SPEED));
                this.vx = leftLocal ? -Parachute.SPEED : Parachute.SPEED;
                this.left = leftLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }
  
  public static readonly STATE_LAUNCH: number = 0;
  public static readonly STATE_DRIFT: number = 1;
  public static readonly STATE_DEAD: number = 2;
  
  public static readonly SPEED: number = 2;
  public static readonly DRIFT_SPEED: number = 1;
  public static readonly MAX_HORIZONTAL_DRIFT_SPEED: number = 0.5;
  public static readonly INFLATE_TIME: number = 32;

  public static readonly INFLATE_INDEX: any[] = [ 0, 1, 1, 2, 2, 3 ];
 
  public static readonly INFLATES: any[] = [
    [ 28 / 28, 38 / 28 - 28 / 28 ], //0: 28 -- 38 
    [ 38 / 48, 48 / 48 - 38 / 48 ], //1: 38 -- 48
    [ 48 / 48, 56 / 48 - 48 / 48 ], //1: 48 -- 56
    [ 56 / 64, 64 / 64 - 56 / 64 ], //2: 56 -- 64
    [ 64 / 64, 62 / 64 - 64 / 64 ], //2: 64 -- 62
    [ 62 / 60, 60 / 60 - 62 / 60 ], //3: 62 -- 60  
  ];

  public state: number = Parachute.STATE_LAUNCH;





  
  

  public init(): void {
    this.layer = 5;
  }

  public update(): void {
    
    if (this.bossHelicopter.removeFlag) {
      this.state = Parachute.STATE_DEAD;
      new Explosion(this.x, this.y);
      this.remove();
      return;
    }
    
    switch(this.state) {
      case Parachute.STATE_LAUNCH:
        this.x += this.vx;
        if (--this.delay == 0) {
          this.state = Parachute.STATE_DRIFT;
          this.delay = 0;
          this.vx = Parachute.MAX_HORIZONTAL_DRIFT_SPEED 
              + Parachute.MAX_HORIZONTAL_DRIFT_SPEED * this.main.random.nextFloat();
          if (this.left) {
            this.vx = -this.vx;
          }
        }
        break;
      case Parachute.STATE_DRIFT:
        this.y += Parachute.DRIFT_SPEED;
        this.x += this.vx; 
        this.inflate2++;
        if (++this.delay == Parachute.INFLATE_TIME) {
          this.delay = 0;
          this.inflate++;
          if (this.inflate > 5) {
            let enemySoldier = new EnemySoldier(
                this.x, this.y + 16, EnemySoldierType.WALKER);
            enemySoldier.setBossHelicopter(this.bossHelicopter);
            this.remove();
          }
        }
        break;
    }
  }

  public render(): void {
    switch(this.state) {
      default:
      case Parachute.STATE_LAUNCH:
        this.main.drawCentered(this.main.parachutes[4], this.x + 64, this.y + 64, 0.25, 0.5);
        this.main.drawCentered(this.main.parachutes[0], this.x, this.y);        
        break;
      case Parachute.STATE_DRIFT:
        let percent = this.inflate2 / (6 * Parachute.INFLATE_TIME);
        let offset = 64 - 64 * percent;
        this.main.drawCentered(this.main.parachutes[4], this.x + offset, this.y + offset, 
            0.25 + 0.6 * percent, 0.5);
        this.main.drawCentered(this.main.parachutes[Parachute.INFLATE_INDEX[this.inflate]], this.x, this.y,
            Parachute.INFLATES[this.inflate][0] + Parachute.INFLATES[this.inflate][1] 
                * (this.delay / javaFloat(Parachute.INFLATE_TIME)));        
        break;
      case Parachute.STATE_DEAD:
        break;
    }    
  }  
}
