// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/EnemyHelicopter.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { BossHelicopter } from "./BossHelicopter.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Main } from "./Main.js";
export class EnemyHelicopter extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 1 && typeof args[0] === "boolean") {
        let down = args[0];
            this.x = this.gameMode.player.x 
                    + (this.main.random.nextBoolean() ? -EnemyHelicopter.APPEAR_DISTANCE : EnemyHelicopter.APPEAR_DISTANCE);
                if (this.x - 96 < this.gameMode.cameraX) {
                  this.x = this.gameMode.player.x + EnemyHelicopter.APPEAR_DISTANCE;
                } else if (this.x + 96 > this.gameMode.cameraX + Main.DISPLAY_WIDTH) {
                  this.x = this.gameMode.player.x - EnemyHelicopter.APPEAR_DISTANCE;
                }
    
                if (down) {
                  this.angle = 90; 
                  this.y = this.gameMode.cameraY - 60;
                } else {
                  this.angle = 270;
                  this.y = this.gameMode.cameraY + Main.DISPLAY_HEIGHT + 60;
                }
    
                this.enteringAcceleration = 2 * (this.y - (this.gameMode.cameraY 
                        + 0.5 * Main.DISPLAY_HEIGHT)) 
                    / ((EnemyHelicopter.ENTERING_TIME) * EnemyHelicopter.ENTERING_TIME);    
                this.vy = -this.enteringAcceleration * EnemyHelicopter.ENTERING_TIME;
    
                this.down = down;
                this.player = this.gameMode.player;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly APPEAR_DISTANCE: number = 192;
  
  public static readonly STATE_ENTERING: number = 0;
  public static readonly STATE_PAUSED: number = 1;
  public static readonly STATE_EXITING: number = 2;
  
  public static readonly ENTERING_TIME: number = 2 * 91;  
  public static readonly PAUSED_TIME: number = 45;  
  public static readonly ROTATION_TIME: number = 91;
  
  public static readonly ROTATION_ACCELERATION: number = 90 
      / ((EnemyHelicopter.ROTATION_TIME) *EnemyHelicopter.ROTATION_TIME);  
  public static readonly TO_RADIANS: number = (Math.PI / 180);
  
  public static readonly SHOOT_DELAY: number = 68;
  
  public static readonly BULLET_SPEED: number = 1.75;
  public static readonly BULLET_TRAVEL_TIME: number = 91;  
  
  public angle: number = 0;
  public rotorAngle: number = 0;
  public positionDriftTime: number = 0;
  public positionDriftDx: number = 0;
  public positionDriftDy: number = 0;  
  public state: number = EnemyHelicopter.STATE_ENTERING;
  public enteringAcceleration: number = 0;  
  public vy: number = 0;
  public delay: number = 0;
  public down: boolean = false;
  public player: any = null as any;
  public targetAngle: number = 0;
  public targetHalfAngle: number = 0;
  public positiveAngle: boolean = false;
  public va: number = 0;
  public v: number = 0;
  public shootDelay: number = EnemyHelicopter.SHOOT_DELAY;

  

  public init(): void {
    super.init();
    
    this.layer = 7;

    this.hitX1 = -24;
    this.hitY1 = -71;
    this.hitX2 = 24;
    this.hitY2 = 41;
    
    this.points = 2000;    
  }

  public remove(): void {
    this.removeFlag = true;
    this.main.stopSound(this.main.helicopterSound2);
    if (this.playSoundOnRemove) {
      this.main.playHitExplodeSound(); 
    }
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    return false;
  }  

  public update(): void {
    
    this.main.playSoundIfNotPlaying(this.main.helicopterSound2);
    
    if (--this.shootDelay < 0) {
      this.shootDelay = EnemyHelicopter.SHOOT_DELAY;
      let dx = this.player.x - this.x;
      let dy = this.player.y - this.y;
      let imag = EnemyHelicopter.BULLET_SPEED / Math.sqrt(dx * dx + dy * dy);
      dx *= imag;
      dy *= imag;
      
      new EnemyBullet(this.x + dx, this.y + dy, dx, dy, EnemyHelicopter.BULLET_TRAVEL_TIME, true);
    }
    
    if (--this.positionDriftTime <= 0) {
      this.positionDriftTime = BossHelicopter.POSITION_DRIFT_TIME - 1;
      let driftAngle = BossHelicopter.PI2 * this.main.random.nextFloat();
      this.positionDriftDx = Math.cos(driftAngle);
      this.positionDriftDy = Math.sin(driftAngle);
    }
    this.x += this.positionDriftDx * BossHelicopter.POSITIONS[this.positionDriftTime];
    this.y += this.positionDriftDy * BossHelicopter.POSITIONS[this.positionDriftTime]; 
    
    switch(this.state) {
      case EnemyHelicopter.STATE_ENTERING: 
        let lastVy = this.vy;
        this.vy += this.enteringAcceleration;
        this.y += this.vy;
        if (lastVy * this.vy <= 0) {
          this.state = EnemyHelicopter.STATE_PAUSED;
          this.delay = EnemyHelicopter.PAUSED_TIME;
        }
        break;
      case EnemyHelicopter.STATE_PAUSED:
        if (--this.delay == 0) {
          this.state = EnemyHelicopter.STATE_EXITING;
          if (this.down) {
            this.enteringAcceleration = -this.enteringAcceleration;
          }
          if (this.down) {
            if (this.x > this.player.x) {
              this.targetAngle = 135;
              this.targetHalfAngle = 112.5;
              this.positiveAngle = true;
            } else {
              this.targetAngle = 45;
              this.targetHalfAngle = 67.5;
              this.positiveAngle = false;
            }
          } else {
            if (this.x > this.player.x) {
              this.targetAngle = 225;
              this.targetHalfAngle = 247.5;
              this.positiveAngle = false;
            } else {
              this.targetAngle = 315;
              this.targetHalfAngle = 292.5;
              this.positiveAngle = true;
            }
          }
        }
        break;
      case EnemyHelicopter.STATE_EXITING:
        if (this.angle != this.targetAngle) {
          this.angle += this.va;
          if (this.positiveAngle) {
            if (this.angle >= this.targetHalfAngle) {
              this.va -= EnemyHelicopter.ROTATION_ACCELERATION;
              if (this.va <= 0) {
                this.angle = this.targetAngle;
              }
            } else {
              this.va += EnemyHelicopter.ROTATION_ACCELERATION;
            }                        
          } else {
            if (this.angle <= this.targetHalfAngle) {
              this.va += EnemyHelicopter.ROTATION_ACCELERATION;
              if (this.va >= 0) {
                this.angle = this.targetAngle;
              }
            } else {
              this.va -= EnemyHelicopter.ROTATION_ACCELERATION;
            }
          } 
        }
        let ang = EnemyHelicopter.TO_RADIANS * this.angle;
        this.v += this.enteringAcceleration;
        this.x += this.v * Math.cos(ang);
        this.y += this.v * Math.sin(ang);
        if (this.gameMode.isOutsideOfFrame(this.x - 96, this.y - 96, this.x + 96, this.y + 96)) {          
          this.playSoundOnRemove = false;
          this.remove();
        }
        break;
    }
  }

  public checkBounds(maxY: any): void {    
  }

  public render(): void {
    this.rotorAngle -= 30;
    if (this.rotorAngle == -90) {
      this.rotorAngle = 0;
    }
    
    let ang = this.angle - BossHelicopter.DRIFT_ANGLES[this.positionDriftTime] 
        * this.positionDriftDx;
    
    this.main.drawRotated(this.main.enemyHelicopters[2], this.x + 32, this.y + 40, -30, -11, ang);
    this.main.drawRotated(this.main.enemyHelicopters[0], this.x, this.y, -74, -28, ang);
    
    for(let i = 0; i < 4; i++) {
      this.main.drawRotated(this.main.enemyHelicopters[1], this.x, this.y, 0, -18, 
          90 * i + this.rotorAngle);
    }
  }  
}
