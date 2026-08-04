// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/FireTank.java.
// Original Java imports: java.util.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { Fire } from "./Fire.js";
export class FireTank extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.shootDelay = 0;
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
    this.firstMove = 0;
    this.flamePause = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_FireTank(...args);
  }
  private __construct_FireTank(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            this.x = xLocal;
                this.y = yLocal;
                this.firstMove = 2 * 91;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPEED: number = 1.5;
  public static readonly SENSOR_RADIUS: number = 56;
  public static readonly ANGLE_STEPS: number = 24;
  public static readonly ANGLE_VELOCITY: number = 45 / FireTank.ANGLE_STEPS;  
  public static readonly SHOOT_DELAY: number = 91;
  public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;
  public static readonly BULLET_SPEED: number = 1.4;
  public static readonly FLAME_PAUSE: number = 45;
  
  public static readonly MAX_MOVE_SQUARES: number = 8;
  
  public static readonly DIMENSION_1: number = 52;
  public static readonly DIMENSION_2: number = 40;
  
  public shootDelay: number = FireTank.SHOOT_DELAY;

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
    this.mineX1 = -35;
    this.mineY1 = -35;
    this.mineX2 = 35;
    this.mineY2 = 35;
    
    this.solid = true;
    this.solidX1 = -52;
    this.solidY1 = -52;
    this.solidX2 = 52;
    this.solidY2 = 52;
    
    this.points = 800;
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
    this.sensorX = this.directionX * FireTank.SENSOR_RADIUS;
    this.sensorY = this.directionY * FireTank.SENSOR_RADIUS;
    
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
    
    d += 32 * (1 + this.main.random.nextInt(FireTank.MAX_MOVE_SQUARES));
    
    if (this.firstMove > 0) {      
      this.moveSteps = 16;      
    } else {
      this.moveSteps = javaRoundFloat(d / FireTank.SPEED);
    }
  }
  
  private testCorners(nextX: any, nextY: any): void {
    
    let sx1 = 0;
    let sy1 = 0;
    let sx2 = 0;
    let sy2 = 0;
    
    switch(this.targetAngle) {
      case 0:
        sx1 = nextX + FireTank.DIMENSION_1;
        sy1 = nextY - FireTank.DIMENSION_2;
        sx2 = nextX + FireTank.DIMENSION_1;
        sy2 = nextY + FireTank.DIMENSION_2;        
        break;
      case 90:
        sx1 = nextX + FireTank.DIMENSION_2;
        sy1 = nextY + FireTank.DIMENSION_1;
        sx2 = nextX - FireTank.DIMENSION_2;
        sy2 = nextY + FireTank.DIMENSION_1;
        break;
      case 180:
        sx1 = nextX - FireTank.DIMENSION_1;
        sy1 = nextY + FireTank.DIMENSION_2;
        sx2 = nextX - FireTank.DIMENSION_1;
        sy2 = nextY - FireTank.DIMENSION_2;        
        break;
      case 270:
        sx1 = nextX - FireTank.DIMENSION_2;
        sy1 = nextY - FireTank.DIMENSION_1;
        sx2 = nextX + FireTank.DIMENSION_2;
        sy2 = nextY - FireTank.DIMENSION_1;        
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
    this.sensorX = this.directionX * FireTank.SENSOR_RADIUS;
    this.sensorY = this.directionY * FireTank.SENSOR_RADIUS;
    
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
        
    if (this.displayAngle != this.targetAngle) {
      let deltaAngle = (this.targetAngle - this.displayAngle + 180) % 360;
      if (deltaAngle < 0) {
        deltaAngle += 180;
      } else {
        deltaAngle -= 180;
      }
      if (Math.abs(deltaAngle) < FireTank.ANGLE_VELOCITY) {
        this.displayAngle = this.targetAngle;
      } else {
        if (deltaAngle < 0) {
          this.displayAngle -= FireTank.ANGLE_VELOCITY;
        } else {
          this.displayAngle += FireTank.ANGLE_VELOCITY;
        }
      } 
    } else if (this.flamePause > 0) {
      this.flamePause--;
    } else {
      
      if (this.handlingLoop > 0) {
        this.handlingLoop--;
      }
      
      if (this.firstMove > 0) {
        this.firstMove--;
      }
      
      if (--this.moveSteps <= 0) {        
        let dx = 0;
        let dy = 0;
        if (this.main.random.nextInt(5) == 4) {
          dx = this.main.random.nextInt(512) - 256;
          dy = this.main.random.nextInt(512) - 256;
        }
        let v = null;
        if (this.firstMove > 0) {          
          v = this.main.createUnitVector(90);
          v[2] = 90;
        } else {
          v = this.handlingLoop > 0
              ? this.gameMode.suggestDirection(
                  this.x, this.y, this.loopTargetX + dx, this.loopTargetY + dy, false) 
              : this.gameMode.suggestDirection(
                  this.x, this.y, this.player.x + dx, this.player.y + dy, false);
        }
        this.vx = v[0] * FireTank.SPEED;
        this.vy = v[1] * FireTank.SPEED;
        this.directionX = v[0];
        this.directionY = v[1];
        this.targetAngle = javaInt(v[2]);
        this.sensorX = this.directionX * FireTank.SENSOR_RADIUS;
        this.sensorY = this.directionY * FireTank.SENSOR_RADIUS;
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
          && this.main.random.nextInt(3) != 2
          && this.firstMove == 0) { 
        this.moveSteps = 0;
      }

      this.lastDx = dx;
      this.lastDy = dy;
      
      if (--this.shootDelay <= 0 && this.targetAngle == this.displayAngle) {
        this.shootDelay = FireTank.SHOOT_DELAY;
        let bx = 0;
        let by = 0;
        switch(this.targetAngle) {
          case 0: 
          case 360:
            bx = 48;
            by = -6;
            break;
          case 45: 
            bx = 37; 
            by = 31;
            break;
          case 90: 
            bx = 0; 
            by = 52;
            break;
          case 135:
            bx = -37; 
            by = 31;
            break;
          case 180: 
            bx = -48; 
            by = -6;
            break;
          case 225: 
            bx = -31; 
            by = -37;
            break;
          case 270: 
            bx = 0; 
            by = -52;
            break;
          case 315: 
            bx = 31; 
            by = -37;
            break;
        }
        new Fire(this.x + bx, this.y + by, this.directionX, this.directionY, this.targetAngle, this);
        this.flamePause = FireTank.FLAME_PAUSE;
      }
    }
  }

  public render(): void {
    this.main.drawVehicle(this.main.fireTanks, this.x, this.y, this.displayAngle);    
  }
}
