// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossGarage.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { BrownTank } from "./BrownTank.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { GrayTank } from "./GrayTank.js";
export class BossGarage extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.bossGarageManager = null as any;
    this.lightIndex = 0;
    this.state = 0;
    this.doorY = 0;
    this.isBrownTank = false;
    this.vehicle = null as any;
    this.vehicleY = 0;
    this.brownTank = null as any;
    this.grayTank = null as any;
    this.delay = 0;
    this.groupIndex = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_BossGarage(...args);
  }
  private __construct_BossGarage(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
        let bossGarageManagerLocal = args[2];
            this.x = xLocal;
                this.y = yLocal;
                this.bossGarageManager = bossGarageManagerLocal;
    
                let X = (javaInt(xLocal)) >> 5;
                let Y = (javaInt(yLocal)) >> 5;
              
                this.groupIndex = this.gameMode.groupsMap[Y][X];
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly STATE_CLOSED: number = 0;
  public static readonly STATE_OPENING: number = 1;
  public static readonly STATE_CLOSING: number = 2;
  public static readonly STATE_OPEN: number = 3; 
  public static readonly STATE_OPEN_2: number = 4;  
  public static readonly STATE_OPEN_3: number = 5;
  
  public static readonly OPENING_SPEED: number = 2;
  public static readonly OPEN_3_PAUSE: number = 136;

  public lightIndex: number = 3;
  public state: number = BossGarage.STATE_CLOSED;








  
  

  public init(): void {
    super.init();
    
    this.layer = 0;
    
    this.hitX1 = 8;
    this.hitY1 = 8;
    this.hitX2 = 120;
    this.hitY2 = 88;
    
    this.explosionX = 64;
    this.explosionY = 48;
  }

  public update(): void {    
    switch(this.state) {
      case BossGarage.STATE_OPENING:
        this.doorY += BossGarage.OPENING_SPEED;
        if (this.doorY >= 96) {
          if (this.bossGarageManager.full()) {
            this.state = BossGarage.STATE_OPEN_3;
            this.delay = BossGarage.OPEN_3_PAUSE;
          } else {
            this.state = BossGarage.STATE_OPEN;          
          }
        }
        break;
      case BossGarage.STATE_OPEN:
        if (this.isBrownTank) {
          this.vehicleY += BrownTank.SPEED;
          if (this.vehicleY > this.y + 72) {
            this.brownTank = new BrownTank(this.x + 64, this.vehicleY, 125, this.bossGarageManager);            
            this.state = BossGarage.STATE_OPEN_2;
          }
        } else {
          this.vehicleY += GrayTank.SPEED;
          if (this.vehicleY > this.y + 80) {
            this.grayTank = new GrayTank(this.x + 64, this.vehicleY, 125, this.bossGarageManager);            
            this.state = BossGarage.STATE_OPEN_2;
          }
        }
        break;
      case BossGarage.STATE_OPEN_2:
        if (this.isBrownTank) {
          if (this.brownTank.y > this.y + 138 || this.brownTank.removeFlag) {
            this.brownTank = null;
            this.state = BossGarage.STATE_CLOSING;
          }
        } else {
          if (this.grayTank.y > this.y + 148 || this.grayTank.removeFlag) {
            this.grayTank = null;
            this.state = BossGarage.STATE_CLOSING;
          }
        }
        break;
      case BossGarage.STATE_CLOSING:
        this.doorY -= BossGarage.OPENING_SPEED;
        if (this.doorY <= 0) {
          this.state = BossGarage.STATE_CLOSED;          
        }
        break;
      case BossGarage.STATE_OPEN_3:
        if (--this.delay == 0) {
          this.state = BossGarage.STATE_CLOSING;
        }
        break;
    }
  }
  
  public open(): void {
    if (this.state == BossGarage.STATE_CLOSED) {
      this.state = BossGarage.STATE_OPENING;     
      this.isBrownTank = this.main.random.nextBoolean();
      if (this.isBrownTank) {
        this.vehicle = this.main.brownTanks;
        this.vehicleY = this.y - 8;
      } else {
        this.vehicle = this.main.grayTanks;
        this.vehicleY = this.y - 24;
      }      
    }
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (this.state >= BossGarage.STATE_OPEN 
        && attackSource == AttackSource.PLAYER_WEAPON
        && this.hit(x1, y1, x2, y2)) {
      this.remove();
      if (this.state == BossGarage.STATE_OPEN) {
        new Explosion(this.x + 64, this.vehicleY);
      }
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);      
      this.main.addPoints(this.points);
      this.bossGarageManager.garageDestroyed();
      this.gameMode.triggerGroup(this.groupIndex);
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

  public render(): void {   
    
    if (this.state == BossGarage.STATE_CLOSED) {
      this.main.draw(this.main.garages[0], this.x, this.y);
    } else {
    
      if (--this.lightIndex == 0) {
        this.lightIndex = 3;
      }

      this.main.draw(this.main.garages[1], this.x, this.y);
      if (this.state == BossGarage.STATE_OPEN) {
        this.gameMode.g.setWorldClip(this.x - 1, this.y, 130, 256);
        this.main.drawVehicle(this.vehicle, this.x + 64, this.vehicleY, 90, 
            this.isBrownTank ? (this.vehicleY - (this.y - 8)) * 0.0125
                      : (this.vehicleY - (this.y - 24)) * 0.0096154);
        this.gameMode.g.clearWorldClip();
      }
      this.main.draw(this.main.garages[4], this.x, this.y);
      if (this.lightIndex > 1) {
        this.main.draw(this.main.garages[this.lightIndex], this.x + 46, this.y - 4);
      }
      
      if (this.state == BossGarage.STATE_OPENING || this.state == BossGarage.STATE_CLOSING) {
        this.gameMode.g.setWorldClip(this.x - 1, this.y, 130, 256);  
        this.main.draw(this.main.garages[0], this.x, this.y - this.doorY);
        this.gameMode.g.clearWorldClip();
      }
    }
  }  
}
