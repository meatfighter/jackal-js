// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossBlueTank.java.
// Original Java imports: java.util.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
export class BossBlueTank extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.shootDelay = 0;
    this.shootCount = 0;
    this.moveSteps = 0;
    this.targetAngle = 0;
    this.displayAngle = 0;
    this.directionX = 0;
    this.directionY = 0;
    this.vx = 0;
    this.vy = 0;
    this.sensorX = 0;
    this.sensorY = 0;
    this.lastDx = 0;
    this.lastDy = 0;
    this.solids = null as any;
    this.player = null as any;
    this.handlingLoop = 0;
    this.loopTargetX = 0;
    this.loopTargetY = 0;
    this.recoilOffset = 0;
    this.recoilDelay = 0;
    this.colorOffset = 0;
    this.introVy = 0;
    this.introDelay = 0;
    this.bossBlueTanksManager = null as any;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_BossBlueTank(...args);
  }
  private __construct_BossBlueTank(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
        let bossBlueTanksManagerLocal = args[2];
            this.x = xLocal;
                this.y = yLocal;
                this.bossBlueTanksManager = bossBlueTanksManagerLocal;
                this.directionX = 0;
                this.vx = 0;
                if (yLocal < 0) {
                  this.displayAngle = this.targetAngle = 90;
                  this.directionY = 1;
                  this.vy = this.introVy = BossBlueTank.SPEED;
                  this.introDelay = 128;      
                } else {      
                  this.displayAngle = this.targetAngle = 270;
                  this.directionY = -1;
                  this.vy = this.introVy = -BossBlueTank.SPEED;
                  this.introDelay = 42;
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPEED: number = 2.5;
  public static readonly SENSOR_RADIUS: number = 53;
  public static readonly ANGLE_STEPS: number = 18;
  public static readonly ANGLE_VELOCITY: number = 45 / BossBlueTank.ANGLE_STEPS;  
  public static readonly SHOOT_DELAY: number = 16;
  public static readonly RECOIL_DELAY: number = 12;
  public static readonly SHOOT_LONG_DELAY: number = 91;
  public static readonly SHOOT_COUNT: number = 2;
  public static readonly BULLET_TRAVEL_TIME: number = 5 * 91;  
  
  public static readonly MAX_MOVE_SQUARES: number = 8;
  
  public static readonly DIMENSION_1: number = 48;
  public static readonly DIMENSION_2: number = 40;
  
  public shootDelay: number = BossBlueTank.SHOOT_DELAY;
  public shootCount: number = BossBlueTank.SHOOT_COUNT;

  public targetAngle: number = 90;
  public displayAngle: number = 90;












 






  
  

  public init(): void {
    super.init();
    
    this.solids = this.gameMode.solids;
    this.player = this.gameMode.player;    
    
    this.layer = 3;
    
    this.bulletHits = 5;
    
    this.hitX1 = -50;
    this.hitY1 = -50;
    this.hitX2 = 50;
    this.hitY2 = 50;
    
    this.mine = true;
    this.mineX1 = -40;
    this.mineY1 = -40;
    this.mineX2 = 40;
    this.mineY2 = 40;
    
    this.solid = true;
    this.solidX1 = -54;
    this.solidY1 = -54;
    this.solidX2 = 54;
    this.solidY2 = 54;
  }
  
  private driveAtRightAngleToBarrier(): void {
    let Vx = this.vx;
    let Vy = this.vy;
    let Dx = this.directionX;
    let Dy = this.directionY;
    
    if (this.main.random.nextInt(5) == 4) {      
      this.vx = -this.vx;
      this.vy = -this.vy;
      this.directionX = -this.directionX;
      this.directionY = -this.directionY;
      this.targetAngle += 180;
    } else if (this.main.random.nextInt(3) == 2) {
      this.vx = Vy;
      this.vy = -Vx;
      this.directionX = Dy;
      this.directionY = -Dx;
      this.targetAngle -= 90;
    } else {
      this.vx = -Vy;
      this.vy = Vx;
      this.directionX = -Dy;
      this.directionY = Dx;
      this.targetAngle += 90;
    }    
    if (this.targetAngle >= 360) {
      this.targetAngle -= 360;
    } else if (this.targetAngle < 0) {
      this.targetAngle += 360;
    }
    this.sensorX = this.directionX * BossBlueTank.SENSOR_RADIUS;
    this.sensorY = this.directionY * BossBlueTank.SENSOR_RADIUS;
    
    if (this.main.random.nextInt(5) != 4) {
      this.computeMoveSteps();
    }
  }  
  
  private computeMoveSteps(): void {
    
    let v = 0;
    
    if (this.directionX != 0) {
      v = this.directionX;
    } else {
      v = this.directionY;
    }
    if (v == 0) {
      return;
    }
    
    let d = 0;
    
    if (v > 0) {
      d = 32 - (v % 32);
    } else {
      d = v % 32;
    }
    
    d += 32 * (1 + this.main.random.nextInt(BossBlueTank.MAX_MOVE_SQUARES));
    
    this.moveSteps = javaRoundFloat(d / BossBlueTank.SPEED);
  }
  
  private testCorners(nextX: any, nextY: any): void {
    
    let sx1 = 0;
    let sy1 = 0;
    let sx2 = 0;
    let sy2 = 0;
    
    switch(this.targetAngle) {
      case 0:
        sx1 = nextX + BossBlueTank.DIMENSION_1;
        sy1 = nextY - BossBlueTank.DIMENSION_2;
        sx2 = nextX + BossBlueTank.DIMENSION_1;
        sy2 = nextY + BossBlueTank.DIMENSION_2;        
        break;
      case 90:
        sx1 = nextX + BossBlueTank.DIMENSION_2;
        sy1 = nextY + BossBlueTank.DIMENSION_1;
        sx2 = nextX - BossBlueTank.DIMENSION_2;
        sy2 = nextY + BossBlueTank.DIMENSION_1;
        break;
      case 180:
        sx1 = nextX - BossBlueTank.DIMENSION_1;
        sy1 = nextY + BossBlueTank.DIMENSION_2;
        sx2 = nextX - BossBlueTank.DIMENSION_1;
        sy2 = nextY - BossBlueTank.DIMENSION_2;        
        break;
      case 270:
        sx1 = nextX - BossBlueTank.DIMENSION_2;
        sy1 = nextY - BossBlueTank.DIMENSION_1;
        sx2 = nextX + BossBlueTank.DIMENSION_2;
        sy2 = nextY - BossBlueTank.DIMENSION_1;        
        break;
      default:
        return;
    }
    
    let drive1 = this.gameMode.isDriveable(sx1, sy1);
    let drive2 = this.gameMode.isDriveable(sx2, sy2);
    if (drive1 && drive2) {
      return;
    }
    
    if (!(drive1 || drive2)) {
      this.driveAtRightAngleToBarrier();
      return;
    }
    
    let Vx = this.vx;
    let Vy = this.vy;
    let Dx = this.directionX;
    let Dy = this.directionY;
    
    if (drive2) {
      this.vx = -Vy;
      this.vy = Vx;
      this.directionX = -Dy;
      this.directionY = Dx;
      this.targetAngle += 90;
    } else {
      this.vx = Vy;
      this.vy = -Vx;
      this.directionX = Dy;
      this.directionY = -Dx;
      this.targetAngle -= 90;
    }
    
    if (this.targetAngle >= 360) {
      this.targetAngle -= 360;
    } else if (this.targetAngle < 0) {
      this.targetAngle += 360;
    }
    this.sensorX = this.directionX * BossBlueTank.SENSOR_RADIUS;
    this.sensorY = this.directionY * BossBlueTank.SENSOR_RADIUS;
    
    if (this.main.random.nextInt(5) != 4) {
      this.computeMoveSteps();
    }
  }
  
  private handleLoop(): void {
    if (this.handlingLoop == 0) {
      this.handlingLoop = 91 * (2 + this.main.random.nextInt(5));
      this.loopTargetX = this.main.random.nextFloat() * 2048;
      this.loopTargetY = this.main.random.nextFloat() * this.player.y;
    }
  }

  public update(): void {
    
    if (this.introDelay > 0) {
      
      let nextX = this.x;
      let nextY = this.y + this.introVy;
      
      for(let i = this.solids.size() - 1; i >= 0; i--) {
        let solidLocal2 = this.solids.get(i);
        if (solidLocal2 != this && solidLocal2.isSolid(nextX + this.solidX1, nextY + this.solidY1, 
            nextX + this.solidX2, nextY + this.solidY2) && !solidLocal2.isSolid(
                this.x + this.solidX1, this.y + this.solidY1, this.x + this.solidX2, this.y + this.solidY2)) {
          return;
        }
      }
      
      this.introDelay--;
      this.y = nextY;
      return;
    }
    
    if (this.recoilDelay > 0) {
      if (--this.recoilDelay == 0) {
        this.recoilOffset = 0;
      }
    }
    
    if (this.displayAngle != this.targetAngle) {
      this.shootCount = BossBlueTank.SHOOT_COUNT;
      let deltaAngle = (this.targetAngle - this.displayAngle + 180) % 360;
      if (deltaAngle < 0) {
        deltaAngle += 180;
      } else {
        deltaAngle -= 180;
      }
      if (Math.abs(deltaAngle) < BossBlueTank.ANGLE_VELOCITY) {
        this.displayAngle = this.targetAngle;
      } else {
        if (deltaAngle < 0) {
          this.displayAngle -= BossBlueTank.ANGLE_VELOCITY;
        } else {
          this.displayAngle += BossBlueTank.ANGLE_VELOCITY;
        }
      } 
    } else {
      
      if (this.handlingLoop > 0) {
        this.handlingLoop--;
      }

      if (--this.moveSteps <= 0) {        
        let dx = 0;
        let dy = 0;
        if (this.main.random.nextInt(5) == 4) {
          dx = this.main.random.nextInt(512) - 256;
          dy = this.main.random.nextInt(512) - 256;
        }
        let v = this.handlingLoop > 0
            ? this.gameMode.suggestDirection(
                this.x, this.y, this.loopTargetX + dx, this.loopTargetY + dy, this.targetAngle, false) 
            : this.gameMode.suggestDirection(
                this.x, this.y, this.player.x + dx, this.player.y + dy, this.targetAngle, false);
        this.vx = v[0] * BossBlueTank.SPEED;
        this.vy = v[1] * BossBlueTank.SPEED;
        this.directionX = v[0];
        this.directionY = v[1];
        this.targetAngle = javaInt(v[2]);
        this.sensorX = this.directionX * BossBlueTank.SENSOR_RADIUS;
        this.sensorY = this.directionY * BossBlueTank.SENSOR_RADIUS;
        this.computeMoveSteps();
      }      

      let nextX = this.x + this.vx;
      let nextY = this.y + this.vy;

      this.testCorners(nextX, nextY);

      let driveable = true;

      if (this.gameMode.isDriveable(nextX + this.sensorX, nextY + this.sensorY)) {

        // avoid bumping into other enemies
        for(let i = this.solids.size() - 1; i >= 0; i--) {
          let solidLocal = this.solids.get(i);
          if (solidLocal != this && solidLocal.isSolid(nextX + this.solidX1, nextY + this.solidY1, 
              nextX + this.solidX2, nextY + this.solidY2) && !solidLocal.isSolid(
                  this.x + this.solidX1, this.y + this.solidY1, this.x + this.solidX2, this.y + this.solidY2)) {
            driveable = false;
            break;
          }
        } 
      } else {
        driveable = false;
      }

      if (driveable) {
        this.x = nextX;
        this.y = nextY;
        this.updateTrail();
        if (this.trailContainsLoop()) {
          this.handleLoop();
        }
      } else {
        this.driveAtRightAngleToBarrier();
      }

      let dx = this.player.x - this.x;
      let dy = this.player.y - this.y;

      if (this.moveSteps == 1 && ((this.vy != 0 && (javaInt(this.player.x)) >> 7 == (javaInt(this.x)) >> 7)
          || (this.vx != 0 && (javaInt(this.player.y)) >> 7 == (javaInt(this.y)) >> 7))) {
        this.moveSteps = 2;
      }      
      if ((this.lastDx * dx <= 0 || this.lastDy * dy <= 0) 
          && this.main.random.nextInt(3) != 2) { 
        this.moveSteps = 0;
      }

      this.lastDx = dx;
      this.lastDy = dy;
      
      if (--this.shootDelay <= 0) {
        if (--this.shootCount <= 0) {
          this.shootCount = BossBlueTank.SHOOT_COUNT;
          this.shootDelay = BossBlueTank.SHOOT_LONG_DELAY;
        } else {
          this.shootDelay = BossBlueTank.SHOOT_DELAY;
        }
        let bx = 0;
        let by = 0;
        switch(this.targetAngle) {
          case 0: 
          case 360:
            bx = 49;
            by = -12;
            break;
          case 45: 
            bx = 50; 
            by = 36;
            break;
          case 90: 
            bx = 0; 
            by = 52;
            break;
          case 135:
            bx = -50; 
            by = 36;
            break;
          case 180: 
            bx = -49; 
            by = -12;
            break;
          case 225: 
            bx = -36; 
            by = -50;
            break;
          case 270: 
            bx = 0; 
            by = -52;
            break;
          case 315: 
            bx = 36; 
            by = -50;
            break;
        }
        new EnemyBullet(this.x + bx, this.y + by, 
            this.directionX * 2, this.directionY * 2, BossBlueTank.BULLET_TRAVEL_TIME, false);
        this.recoilDelay = BossBlueTank.RECOIL_DELAY;
        this.recoilOffset = 1;
      }
    }
  }

  public remove(): void {
    this.removeFlag = true;    
    this.main.playHitExplodeSound();    
    this.bossBlueTanksManager.blueTankDestroyed();
  }
  
  private attacked(): void {
    this.bulletHits = 5;
    if (this.colorOffset == 0) {
      this.colorOffset = 2;
    } else {
      this.main.addPoints(800);
      new Explosion(this.x, this.y);
      this.remove();      
    }
  }

  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource == AttackSource.PLAYER_WEAPON && this.hit(x1, y1, x2, y2)) {
      if (this.colorOffset == 0) {
        this.main.playHitExplodeSound();
      }
      this.attacked();
      return true;
    }
    return false;
  }

  // returns true if player bullet was absorbed by enemy
  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.hit(x1, y1, x2, y2)) {       
      if (--this.bulletHits == 0) {        
        this.attacked();
      } else {
        this.main.playSoundAlways(this.main.bulletHitSound);
      }
      return true;
    } else {
      return false;
    }
  }  
  
  // returns true if player bumped into the enemy
  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {  
    if (invincible) {
      return false;
    }
    if (this.isMine(x1, y1, x2, y2)) {
      return true;
    } else {
      return false;
    }
  }  

  public render(): void {
    this.main.drawVehicle(this.main.bossBlueTanks[this.colorOffset + this.recoilOffset], 
        this.x, this.y, this.displayAngle);
  }  
}
