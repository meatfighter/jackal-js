// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossHelicopter.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
import { Parachute } from "./Parachute.js";
export class BossHelicopter extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.player = null as any;
    this.angle = 0;
    this.rotorAngle = 0;
    this.tailIndexCounter = false;
    this.tailIndex = 0;
    this.positionDriftTime = 0;
    this.positionDriftDx = 0;
    this.positionDriftDy = 0;
    this.delay = 0;
    this.state = 0;
    this.vy = 0;
    this.va = 0;
    this.rotateCW = false;
    this.hits = 0;
    this.tinyExplosions = 0;
    this.tinyExplosionsDelay = 0;
    this.shuttering = 0;
    this.parachutes = 0;
    this.soldiers = 0;
    this.bulletDelay = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_BossHelicopter(...args);
  }
  private __construct_BossHelicopter(...args: any[]): void {
    if (args.length === 0) {
            this.randomizeLocation();
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly STATE_ENTERING: number = 0;
  public static readonly STATE_HOVERING: number = 1;
  public static readonly STATE_RELEASING: number = 2;
  public static readonly STATE_LEAVING: number = 3;
  public static readonly STATE_HIDDEN: number = 4;

  public static readonly HITS: number = 7;
  public static readonly POSITION_DRIFT_TIME: number = (2 * 91) + 1;
  public static readonly POSITION_DRIFT_DISTANCE: number = 32;
  public static readonly PI2: number = javaFloat((2 * Math.PI));
  public static readonly POSITIONS: any[] = javaArray(BossHelicopter.POSITION_DRIFT_TIME, 0);
  public static readonly DRIFT_ANGLES: any[] = javaArray(BossHelicopter.POSITION_DRIFT_TIME, 0);
  public static readonly DRIFT_ANGLE: number = 5;
  public static readonly MIN_Y: number = -96;
  public static readonly MIN_Y2: number = -256;
  public static readonly MAX_Y: number = 480;
  public static readonly ENTERING_TIME: number = 2 * 91;
  public static readonly ENTERINGS: any[] = javaArray(BossHelicopter.ENTERING_TIME, 0);
  public static readonly ENTER_ACCELERATION: number = 0;
  public static readonly HOVER_TIME: number = 45;
  public static readonly RELEASING_TIME_MIN: number = 23;
  public static readonly RELEASING_TIME_MAX: number = 45;
  public static readonly HIDDEN_TIME: number = 91;
  public static readonly ROTATE_TIME: number = 2 * 91;
  public static readonly ROTATE_HALF_TIME: number = BossHelicopter.ROTATE_TIME / 2;
  public static readonly ROTATE_ACCELERATION: number = 180 / (BossHelicopter.ROTATE_HALF_TIME * BossHelicopter.ROTATE_HALF_TIME);
  public static readonly MAX_APPEAR_DISTANCE: number = 128;
  public static readonly TO_RADIANS: number = javaFloat((Math.PI / 180));
  public static readonly SHUTTER_TIME: number = 91;
  public static readonly SHUTTER_AMPLITUDE: number = 8;
  public static readonly SHUTTER_CYCLES: number = 5;
  public static readonly SHUTTERS: any[] = javaArray(BossHelicopter.SHUTTER_TIME, 0);
  public static readonly MAX_SOLDIERS: number = 32;
  public static readonly BULLET_DELAY: number = 68;
  public static readonly BULLET_SPEED: number = 1.75;
  public static readonly BULLET_TRAVEL_TIME: number = 91;  
  
  static {
    let XS = javaArray(BossHelicopter.POSITION_DRIFT_TIME + 1, 0);
    let HALF_TIME = javaIntDiv(BossHelicopter.POSITION_DRIFT_TIME, 2);
    let T = HALF_TIME;
    let a = BossHelicopter.POSITION_DRIFT_DISTANCE / (T * T);
    for(let i = 0; i <= HALF_TIME; i++) {
      XS[i] = 0.5 * a * i * i;
      XS[BossHelicopter.POSITION_DRIFT_TIME - i - 1] 
          = BossHelicopter.POSITION_DRIFT_DISTANCE - XS[i];
    }    
    for(let i = 0; i < BossHelicopter.POSITION_DRIFT_TIME; i++) {
      BossHelicopter.POSITIONS[i] = XS[i + 1] - XS[i]; 
      let ang = 2 * Math.PI * i / javaDouble(BossHelicopter.POSITION_DRIFT_TIME) - Math.PI;
      BossHelicopter.DRIFT_ANGLES[i] = BossHelicopter.DRIFT_ANGLE * javaFloat((0.5 + 0.5 * Math.cos(ang)));
    }
    BossHelicopter.POSITIONS[BossHelicopter.POSITION_DRIFT_TIME - 1] = 0;
    
    XS = javaArray(BossHelicopter.ENTERING_TIME + 1, 0);
    BossHelicopter.ENTER_ACCELERATION = 2 * (BossHelicopter.MAX_Y - BossHelicopter.MIN_Y) / javaFloat((XS.length * XS.length));    
    for(let i = 0; i < XS.length; i++) {
      let t = XS.length - 1 - i;
      XS[i] = BossHelicopter.MAX_Y - 0.5 * BossHelicopter.ENTER_ACCELERATION * t * t;
    }
    for(let i = 0; i < BossHelicopter.ENTERING_TIME; i++) {
      BossHelicopter.ENTERINGS[i] = XS[i + 1] - XS[i];
    }
    XS = javaArray(BossHelicopter.SHUTTER_TIME + 1, 0);
    for(let i = 0; i < XS.length; i++) {
      XS[i] = javaFloat((((XS.length - 1 - i) 
          * BossHelicopter.SHUTTER_AMPLITUDE / javaDouble(XS.length))
              * Math.sin(i * 2 * Math.PI * BossHelicopter.SHUTTER_CYCLES / javaDouble(XS.length))));
    }
    for(let i = 0; i < BossHelicopter.SHUTTER_TIME; i++) {
      BossHelicopter.SHUTTERS[BossHelicopter.SHUTTER_TIME - 1 - i] = XS[i + 1] - XS[i];
    }
  }









  public state: number = BossHelicopter.STATE_ENTERING;










  
  

  public init(): void {
    super.init();
    
    this.player = this.gameMode.player;    
    
    this.layer = 6;
    
    this.hitX1 = -24;
    this.hitY1 = -40;
    this.hitX2 = 24;
    this.hitY2 = 80;
    
    this.points = 5000;
  }  
  
  private randomizeLocation(): void {
    this.y = BossHelicopter.MIN_Y;
    this.x = this.player.x + this.main.random.nextInt(2 * BossHelicopter.MAX_APPEAR_DISTANCE) 
        - BossHelicopter.MAX_APPEAR_DISTANCE;
    if (this.x < 672) {
      this.x = 672;
    } else if (this.x > 1376) {
      this.x = 1376;
    }
    this.hitX1 = -24;
    this.hitY1 = -40;
    this.hitX2 = 24;
    this.hitY2 = 80;    
  }

  public update(): void {
    
    if (this.state != BossHelicopter.STATE_HIDDEN) {
      this.main.playSoundIfNotPlaying(this.main.helicopterSound2);
    }
    
    if (--this.bulletDelay < 0) {
      this.bulletDelay = BossHelicopter.BULLET_DELAY;
      let dx = this.player.x - this.x;
      let dy = this.player.y - this.y;
      let imag = BossHelicopter.BULLET_SPEED / javaFloat(Math.sqrt(dx * dx + dy * dy));
      dx *= imag;
      dy *= imag;
      
      new EnemyBullet(this.x + dx, this.y + dy, dx, dy, BossHelicopter.BULLET_TRAVEL_TIME, true);
    }    
    
    if (this.tinyExplosions > 0) {
      if (--this.tinyExplosionsDelay <= 0) {
        let ang = BossHelicopter.TO_RADIANS * (this.angle + 90 - BossHelicopter.DRIFT_ANGLES[this.positionDriftTime] 
            * this.positionDriftDx);
        let dx = javaFloat(Math.cos(ang));
        let dy = javaFloat(Math.sin(ang));
        let d = this.tinyExplosions * 40 - 232;
        let explosion = new Explosion(this.x + d * dx, this.y + d * dy);
        explosion.setTiny(true);   
        explosion.changeLayer(7);
        explosion.setAlpha(0.5);
        this.tinyExplosionsDelay = 4;
        this.tinyExplosions--;
      }
    } 
    if (this.shuttering > 0) {
      this.shuttering--;
      this.x += BossHelicopter.SHUTTERS[this.shuttering];
    }
    
    if (--this.positionDriftTime <= 0) {
      this.positionDriftTime = BossHelicopter.POSITION_DRIFT_TIME - 1;
      let driftAngle = BossHelicopter.PI2 * this.main.random.nextFloat();
      this.positionDriftDx = javaFloat(Math.cos(driftAngle));
      this.positionDriftDy = javaFloat(Math.sin(driftAngle));
    }
    this.x += this.positionDriftDx * BossHelicopter.POSITIONS[this.positionDriftTime];
    this.y += this.positionDriftDy * BossHelicopter.POSITIONS[this.positionDriftTime];
    
    switch(this.state) {
      case BossHelicopter.STATE_ENTERING:
        this.y += BossHelicopter.ENTERINGS[this.delay];
        if (++this.delay == BossHelicopter.ENTERING_TIME) {
          this.state = BossHelicopter.STATE_HOVERING;
          this.delay = 0;
        }
        break;
      case BossHelicopter.STATE_HOVERING:
        if (++this.delay == BossHelicopter.HOVER_TIME) {
          this.state = BossHelicopter.STATE_RELEASING;
          this.delay = 0;
        }
        break;
      case BossHelicopter.STATE_RELEASING:
        if (--this.delay <= 0) {
          if (this.parachutes++ == 3) {
            this.state = BossHelicopter.STATE_LEAVING;
            this.delay = 0;
            this.vy = 0;
            this.va = 0;
            this.rotateCW = this.main.random.nextBoolean();  
            this.parachutes = 0;
          } else {
            if (this.soldiers < BossHelicopter.MAX_SOLDIERS) {
              new Parachute(this.x, this.y - 32, (1 + this.parachutes) * 64, this.x > 1024, this);
              this.soldiers++;
            }
            this.delay = BossHelicopter.RELEASING_TIME_MIN + this.main.random.nextInt(
                BossHelicopter.RELEASING_TIME_MAX - BossHelicopter.RELEASING_TIME_MIN);            
          }
        }
        break;
      case BossHelicopter.STATE_LEAVING:
        this.vy += BossHelicopter.ENTER_ACCELERATION;
        this.y -= this.vy;
        if (this.y < BossHelicopter.MIN_Y2) {
          this.delay = 0;
          this.state = BossHelicopter.STATE_HIDDEN;
          this.main.stopSound(this.main.helicopterSound2);
        }     
        if (this.rotateCW) {
          if (this.angle > 68 && this.angle < 112) {
            this.hitX1 = -24;
            this.hitY1 = -32;
            this.hitX2 = 24;
            this.hitY2 = 32;
          } else {
            this.hitX1 = -24;
            this.hitY1 = -80;
            this.hitX2 = 24;
            this.hitY2 = 40;
          }
          if (this.angle < 90) {
            this.va += BossHelicopter.ROTATE_ACCELERATION;
            this.angle += this.va;
          } else if (this.angle < 180) {
            this.va -= BossHelicopter.ROTATE_ACCELERATION;
            this.angle += this.va;          
          } else {
            this.angle = 180;            
          }
        } else {
          if (this.angle <-68&&this.angle> -112) {
            this.hitX1 = -24;
            this.hitY1 = -32;
            this.hitX2 = 24;
            this.hitY2 = 32;
          } else {
            this.hitX1 = -24;
            this.hitY1 = -80;
            this.hitX2 = 24;
            this.hitY2 = 40;
          }
          if (this.angle > -90) {
            this.va += BossHelicopter.ROTATE_ACCELERATION;
            this.angle -= this.va;
          } else if (this.angle > -180) {
            this.va -= BossHelicopter.ROTATE_ACCELERATION;
            this.angle -= this.va;          
          } else {
            this.angle = -180;
            this.hitX1 = -24;
            this.hitY1 = -80;
            this.hitX2 = 24;
            this.hitY2 = 40;
          }
        }
        break;
      case BossHelicopter.STATE_HIDDEN:
        if (++this.delay == BossHelicopter.HIDDEN_TIME) {
          this.delay = 0;
          this.state = BossHelicopter.STATE_ENTERING;
          this.randomizeLocation();
          this.angle = 0;
        }
        break;
    }
  }
  
  // returns true if player bumped into the enemy
  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {  
    return false;
  }  
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (this.tinyExplosions == 0 && attackSource == AttackSource.PLAYER_WEAPON
        && this.hit(x1, y1, x2, y2)) { 
      this.main.playHitExplodeSound();
      if (++this.hits == BossHelicopter.HITS) {
        this.main.stopSound(this.main.helicopterSound2);
        this.remove();
        let ang = BossHelicopter.TO_RADIANS * (this.angle + 90 - BossHelicopter.DRIFT_ANGLES[this.positionDriftTime] 
            * this.positionDriftDx);
        let dx = javaFloat(Math.cos(ang));
        let dy = javaFloat(Math.sin(ang));
        for(let i = 0; i < 4; i++) {                  
          let d = i * 80 - 232;
          new Explosion(this.x + d * dx, this.y + d * dy).setDelayed(3 * (3 - i));
        }
        this.main.addPoints(this.points);
        this.gameMode.destroyAll();
        this.gameMode.stageCompleted();
      } 
      this.tinyExplosions = 8;
      this.tinyExplosionsDelay = 0;
      this.shuttering = BossHelicopter.SHUTTER_TIME;
      return true;
    } else {
      return false;
    }
  }
  
  public soldierKilled(): void {
    this.soldiers--;
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    return false;
  }  

  public checkBounds(maxY: any): void {
  }  

  public render(): void {
    
    this.rotorAngle -= 30;
    if (this.rotorAngle == -90) {
      this.rotorAngle = 0;
    }
    this.tailIndexCounter ^= true;
    if (this.tailIndexCounter) {
      this.tailIndex = this.tailIndex == 3 ? 4 : 3;
    }
    
    let ang = this.angle - BossHelicopter.DRIFT_ANGLES[this.positionDriftTime] * this.positionDriftDx;
    
    this.main.drawRotated(this.main.bossHelicopters[5], this.x + 64, this.y + 64, -18, -65, ang);
    this.main.drawRotated(this.main.bossHelicopters[0], this.x, this.y, -64, -232, ang);
    this.main.drawRotated(this.main.bossHelicopters[1], this.x, this.y, 0, -232, ang);
    this.main.drawRotated(this.main.bossHelicopters[this.tailIndex], this.x, this.y, -16, -224, ang);
    for(let i = 0; i < 4; i++) {
      this.main.drawRotated(this.main.bossHelicopters[2], this.x, this.y, 0, -32, 
          90 * i + this.rotorAngle);
    }
  }  
}
