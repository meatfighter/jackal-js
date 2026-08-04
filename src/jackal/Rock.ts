// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Rock.java.
// Original Java imports: java.util.ArrayList.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
export class Rock extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.player = null as any;
    this.angle = 0;
    this.scale = 0;
    this.vScale = 0;
    this.state = 0;
    this.vx = 0;
    this.delay = 0;
    this.rollsRight = false;
    this.acceleration = 0;
    this.mines = null as any;
  }
  public constructor(arg0?: any, arg1?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_Rock(argCount, arg0, arg1);
  }
  private __construct_Rock(argCount: number, arg0?: any, arg1?: any): void {
    if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
        let xLocal = arg0;
        let yLocal = arg1;
            this.x = xLocal;
                this.y = yLocal;
                this.rollsRight = xLocal > 32 * 35;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }
  
  public static readonly STATE_RESTING_HIGH: number = 0;
  public static readonly STATE_ROLLING_FOWARD_HIGH: number = 1;  
  public static readonly STATE_ROLLING_DOWN: number = 2;
  public static readonly STATE_ROLLING_FOWARD_LOW: number = 3;
  public static readonly STATE_RESTING_LOW: number = 4;
  
  public static readonly TRIGGER_DISTANCE: number = 224;
  public static readonly HIGH_DISTANCE: number = 2 * 32;
  public static readonly FALL_DISTANCE: number = 5 * 32;
  public static readonly LOW_DISTANCE: number = 6 * 32;
  
  public static readonly HIGH_TIME: number = 60;
  public static readonly FALL_TIME: number = 60;
  public static readonly LOW_TIME: number = 60;
  
  public static readonly HIGH_ACCELERATION: number = (2 * Rock.HIGH_DISTANCE) / javaFloat((Rock.HIGH_TIME * Rock.HIGH_TIME));
  public static readonly SCALE_ACCLERATION: number = -0.5 / javaFloat((Rock.FALL_TIME * Rock.FALL_TIME));
  
  public static readonly SQRT2: number = javaFloat((Math.sqrt(2)));
  public static readonly ISQRT2: number = javaFloat((1.0 / Math.sqrt(2)));


  public scale: number = 1;

  public state: number = Rock.STATE_RESTING_HIGH;





  
  

  public init(): void {
    super.init();
    
    this.mines = this.gameMode.mines;
    this.player = this.gameMode.player;    
    
    this.layer = 3;
    
    this.bulletHits = 7;
    
    this.hitX1 = -24;
    this.hitY1 = -24;
    this.hitX2 = 24;
    this.hitY2 = 24;
    
    this.mine = true;
    this.mineX1 = -20;
    this.mineY1 = -20;
    this.mineX2 = 20;
    this.mineY2 = 20;
    
    this.solid = true;
    this.solidX1 = -32;
    this.solidY1 = -32;
    this.solidX2 = 32;
    this.solidY2 = 32;
    
    this.points = 800;
  }
  
  private rollOverEnemies(): void {
    for(let i = this.mines.size() - 1; i >= 0; i--) {
      let mineLocal = this.mines.get(i);
      if (mineLocal != this && mineLocal.isMine(this.x + this.mineX1, this.y + this.mineY1, 
          this.x + this.mineX2, this.y + this.mineY2)) {
        mineLocal.flatten();
      }
    }    
  }

  public flatten(): void {
    if (this.state == Rock.STATE_RESTING_LOW) {
      this.explode();
    }
  }

  public update(): void {
    switch(this.state) {
      case Rock.STATE_RESTING_HIGH:
        if (this.player.y - this.y <= Rock.TRIGGER_DISTANCE
            && ((this.rollsRight && this.player.x > 1024) 
                || (!this.rollsRight && this.player.x < 1024))) {
          this.state = Rock.STATE_ROLLING_FOWARD_HIGH;
          this.delay = Rock.HIGH_TIME;
        }
        break;
      case Rock.STATE_ROLLING_FOWARD_HIGH:
        this.vx += Rock.HIGH_ACCELERATION;
        if (this.rollsRight) {
          this.x += this.vx;
          this.angle += 4 * this.vx;
        } else {
          this.x -= this.vx;
          this.angle -= 4 * this.vx;
        }        
        if (--this.delay == 0) {
          this.state = Rock.STATE_ROLLING_DOWN;
          this.vx *= Rock.ISQRT2;
          this.delay = Rock.FALL_TIME;
          this.acceleration = 2 * (Rock.FALL_DISTANCE - this.vx * Rock.FALL_TIME) 
              / javaFloat((Rock.FALL_TIME * Rock.FALL_TIME));
        }
        break;
      case Rock.STATE_ROLLING_DOWN:
        this.vx += this.acceleration;
        if (this.rollsRight) {
          this.x += this.vx;
          this.angle += 4 * this.vx;
        } else {
          this.x -= this.vx;
          this.angle -= 4 * this.vx;
        } 
        this.vScale += Rock.SCALE_ACCLERATION;
        this.scale += this.vScale;
        this.y += this.vx;
        if (--this.delay == 0) {
          this.state = Rock.STATE_ROLLING_FOWARD_LOW;
          this.vx *= Rock.SQRT2;
          this.delay = Rock.LOW_TIME;
          this.acceleration = -this.vx / javaFloat(Rock.LOW_TIME);
        }
        break;
      case Rock.STATE_ROLLING_FOWARD_LOW:
        this.vx += this.acceleration;
        if (this.rollsRight) {
          this.x += this.vx;
          this.angle += 4 * this.vx;
        } else {
          this.x -= this.vx;
          this.angle -= 4 * this.vx;
        } 
        if (--this.delay == 0) {
          this.state = Rock.STATE_RESTING_LOW;
        }
        this.rollOverEnemies();
        break;
    }
  }

  public render(): void {
    this.main.drawRotated(this.main.rock, this.x, this.y, -32, -32, this.angle, this.scale);
  }
}
