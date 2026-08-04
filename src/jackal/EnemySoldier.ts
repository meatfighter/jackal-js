// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/EnemySoldier.java.
// Original Java imports: java.util.*, org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { DeadEnemySoldier } from "./DeadEnemySoldier.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { EnemySoldierType } from "./EnemySoldierType.js";
import { Explosion } from "./Explosion.js";
import { Fire } from "./Fire.js";
export class EnemySoldier extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
        let type = args[2];
            this.x = x;
                this.y = y;
                this.type = type;
    
                switch(type) {
                  case EnemySoldierType.APPEARING:
                    this.runUpwards();
                    break;
                  case EnemySoldierType.WALKER:
                    this.startSeeking();
                    break;
                  case EnemySoldierType.STATIONARY:
                    this.startAiming();
                    break;
                  case EnemySoldierType.TROOPS_TRUCK:
                    this.runLeft();
                    break;
                  case EnemySoldierType.FIRE:
                    type = EnemySoldierType.STATIONARY;
                    this.startAiming();
                    this.fire = true;
                    break;
                }
    
                if (this.fire) {
                  this.totalShots = 1;
                } else {
                  switch(this.gameMode.stageIndex) {
                    case 0:
                    case 1:
                      this.totalShots = 1;
                      break;
                    case 2:
                    case 3:
                      this.totalShots = 2;
                      break;        
                    case 4:
                    case 5:
                      this.totalShots = 3;
                      break;        
                  }
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly WALK_SPEED: number = 0.5;
  public static readonly MIN_WALK_TIME: number = 1 * 91;
  public static readonly MAX_WALK_TIME: number = 4 * 91;
  public static readonly MAX_WALK_STEPS: number = 5;
  public static readonly LEG_FRAMES: number = 26; 
  public static readonly LEG_AMPLITUDE: number = 2;
  public static readonly AIM_FRAMES: number = 114;
  public static readonly AIM_BLINKING: number = 23;
  public static readonly AIM_RESHOOT: number = 11;
  public static readonly EXTRA_AIMING_TIME: number = 2 * 91;
  public static readonly BULLET_TRAVEL_TIME: number = 1 * 91;  
  public static readonly TO_DEGREES: number = (180 / Math.PI);
  
  public static readonly STATE_SEEKING: number = 0;
  public static readonly STATE_AIMING: number = 1;
  
  public static readonly ORIENTATION_DOWN: number = 0;
  public static readonly ORIENTATION_RIGHT: number = 2;
  public static readonly ORIENTATION_UP: number = 4;
  public static readonly ORIENTATION_LEFT: number = 6;
  
  public static readonly WOBBLES: any[] = javaArray(EnemySoldier.LEG_FRAMES, 0);  
  static {
    for(let i = EnemySoldier.LEG_FRAMES - 1; i >= 0; i--) {
      EnemySoldier.WOBBLES[i] = -EnemySoldier.LEG_AMPLITUDE * Math.sin(
          2.0 * Math.PI * i / EnemySoldier.LEG_FRAMES);      
    }
  }
  
  public type: any = null as any;
  public state: number = EnemySoldier.STATE_SEEKING;
  public solids: any = null as any;
  public player: any = null as any;
  public targetX: number = 0;
  public targetY: number = 0;
  public targetVx: number = 0;
  public targetVy: number = 0;
  public directionX: number = 0;
  public directionY: number = 0;
  public walking: number = 0;
  public aiming: number = 0;
  public orientation: number = 0;
  public legIndex: number = 0;
  public legFrames: number = 0;
  public walkSteps: number = 0;
  public blink: number = 0;
  public wobbleX: number = 0;
  public wobbleY: number = 0;
  public spriteIndex: number = 0;
  public wobbleScaleX: number = 0;
  public wobbleScaleY: number = 0;
  public shots: number = 0;
  public totalShots: number = 0;
  public inSwamp: boolean = false;
  public bossHelicopter: any = null as any;
  public fire: boolean = false;
  
  

  public init(): void {
    super.init();
    
    this.solids = this.gameMode.solids;
    this.player = this.gameMode.player;
    
    this.layer = 3;
    this.bulletHits = 1;
    
    this.hitX1 = -16;
    this.hitY1 = -54;
    this.hitX2 = 16;
    this.hitY2 = 6;
    
    this.mine = true;
    this.mineX1 = -16;
    this.mineY1 = -54;
    this.mineX2 = 16;
    this.mineY2 = 6;
    
    this.solid = true;
    this.solidX1 = -16;
    this.solidY1 = -54;
    this.solidX2 = 16;
    this.solidY2 = 6;
    
    this.points = 100;
  }
  
  public setBossHelicopter(bossHelicopter: any): void {
    this.bossHelicopter = bossHelicopter;
    this.points = 10;
  }
  
  private computeOrientation(): void {
    
    this.wobbleScaleX = Math.abs(this.directionY);
    this.wobbleScaleY = Math.abs(this.directionX);
    
    if (this.wobbleScaleY > this.wobbleScaleX) {
      if (this.directionX > 0) {
        this.orientation = EnemySoldier.ORIENTATION_RIGHT;
      } else {
        this.orientation = EnemySoldier.ORIENTATION_LEFT;
      }
    } else {
      if (this.directionY > 0) {
        this.orientation = EnemySoldier.ORIENTATION_DOWN;
      } else {
        this.orientation = EnemySoldier.ORIENTATION_UP;
      }
    }
  }
  
  public getWalkSpeed(): number {
    return this.inSwamp ? 0.5 * EnemySoldier.WALK_SPEED : EnemySoldier.WALK_SPEED;
  }
  
  private targetPlayer(): void {
        
    let direction = this.gameMode.suggestDirection(
        this.x, this.y, this.player.x, this.player.y, true);
    
    this.directionX = direction[0];
    this.directionY = direction[1];
    this.targetVx = this.getWalkSpeed() * direction[0];
    this.targetVy = this.getWalkSpeed() * direction[1];
    
    this.walking = this.main.random.nextInt(EnemySoldier.MAX_WALK_TIME - EnemySoldier.MIN_WALK_TIME) 
        + EnemySoldier.MIN_WALK_TIME;
    
    this.computeOrientation();
  }
  
  private avoidGettingToCloseToPlayer(): void {
    let dx = this.player.x - this.x;
    let dy = this.player.y - this.y;
    let r2 = dx * dx + dy * dy;
    if (r2 <16384&&dx*this.directionX+dy*this.directionY> 0) {
      let v = this.main.unitVector;
      let ir = 1 /  Math.sqrt(r2);
      v[0] = ir * -dx;
      v[1] = ir * -dy;
      this.gameMode.rotate(v, this.main.random.nextFloat() * 0.3927 - 0.1963);
      this.directionX = v[0];
      this.directionY = v[1];
      this.targetVx = this.getWalkSpeed() * this.directionX;
      this.targetVy = this.getWalkSpeed() * this.directionY;
      this.walking = this.main.random.nextInt(EnemySoldier.MAX_WALK_TIME - EnemySoldier.MIN_WALK_TIME)
              + EnemySoldier.MIN_WALK_TIME;
      this.computeOrientation();
    }
  }
  
  private walkAtRightAngleToBarrier(): void {
    let direction = this.gameMode.suggestDirection(this.directionX, this.directionY);
    this.directionX = direction[0];
    this.directionY = direction[1];
    this.targetVx = this.getWalkSpeed() * direction[0];
    this.targetVy = this.getWalkSpeed() * direction[1];
    this.computeOrientation();
  }
  
  private aim(): void {
    this.directionX = this.player.x - this.x;
    this.directionY = this.player.y - (this.y - 30);
    this.computeOrientation();
    
    if (this.aiming > EnemySoldier.AIM_BLINKING) {
      let r2 = this.directionX * this.directionX + this.directionY * this.directionY;
      if (r2 <= 9216) {
        if (this.type == EnemySoldierType.WALKER) {
          this.startSeeking();
        } else {
          return;
        }
      }
    }
    
    if (--this.aiming <= 0) {
      this.shoot();
      if (++this.shots == this.totalShots) {
        this.shots = 0;
        if (this.type == EnemySoldierType.WALKER) {
          this.startSeeking();
        } else {
          this.startAiming();
        }
      } else {
        this.aiming = EnemySoldier.AIM_RESHOOT;
      }
    }
  }
  
  private shoot(): void {  
    let imag = 1 / Math.sqrt(this.directionX * this.directionX 
        + this.directionY * this.directionY);
    if (this.fire) {      
      new Fire(this.x, this.y - 30, this.directionX * imag, this.directionY * imag,
          EnemySoldier.TO_DEGREES * Math.atan2(this.directionY, this.directionX), this);
    } else {      
      new EnemyBullet(this.x, this.y - 30, this.directionX * imag, this.directionY * imag, 
          EnemySoldier.BULLET_TRAVEL_TIME, true);
    }
  }
  
  private startAiming(): void {
    this.state = EnemySoldier.STATE_AIMING;
    this.aiming = EnemySoldier.AIM_FRAMES;
    if (this.type != EnemySoldierType.WALKER) {
      this.aiming += this.main.random.nextInt(EnemySoldier.EXTRA_AIMING_TIME);
    }
    this.aim();
  }
  
  private runLeft(): void {
    this.state = EnemySoldier.STATE_SEEKING;
    this.type = EnemySoldierType.WALKER;
    
    this.directionX = -1;
    this.directionY = 0;
    this.targetVx = -this.getWalkSpeed();
    this.targetVy = 0;
    
    this.walkSteps = EnemySoldier.MAX_WALK_STEPS;
    this.walking = EnemySoldier.MAX_WALK_TIME;
    
    this.computeOrientation();
  }  
  
  private runUpwards(): void {
    this.state = EnemySoldier.STATE_SEEKING;
    this.type = EnemySoldierType.WALKER;
    
    this.directionX = 0;
    this.directionY = -1;
    this.targetVx = 0;
    this.targetVy = -this.getWalkSpeed();
    
    this.walkSteps = EnemySoldier.MAX_WALK_STEPS;
    this.walking = EnemySoldier.MAX_WALK_TIME;
    
    this.computeOrientation();
  }
  
  private startSeeking(): void {
    this.state = EnemySoldier.STATE_SEEKING;
    this.walkSteps = 1 + this.main.random.nextInt(EnemySoldier.MAX_WALK_STEPS);
    this.targetPlayer();
  }
  
  private seek(): void {
    if (--this.walking <= 0) {
      if (--this.walkSteps <= 0) {
        let dx = this.player.x - this.x;
        let dy = this.player.y - this.y;
        let r2 = dx * dx + dy * dy;
        if (r2 > 9216) {
          this.startAiming();
          return;
        } else {
          this.targetPlayer();
        }
      } else {
        this.targetPlayer();
      }
    }
    
    this.avoidGettingToCloseToPlayer();

    let nextX = this.x + this.targetVx;
    let nextY = this.y + this.targetVy;
    let walkable = true;
    if (this.gameMode.isDriveable(nextX - 16, nextY - 6, nextX + 16, nextY + 6)) {
      
      // avoid bumping into other enemies
      for(let i = this.solids.size() - 1; i >= 0; i--) {
        let solid = this.solids.get(i);
        if (solid != this && solid.isSolid(nextX + this.solidX1, nextY + this.solidY1, 
            nextX + this.solidX2, nextY + this.solidY2) && !solid.isSolid(
                this.x + this.solidX1, this.y + this.solidY1, this.x + this.solidX2, this.y + this.solidY2)) {
          walkable = false;
          break;
        }
      } 
    } else {
      walkable = false;
    }
    
    if (walkable) {
      this.x = nextX;
      this.y = nextY;
                  
      if (this.legFrames == 0) {
        this.legFrames = EnemySoldier.LEG_FRAMES - 1;
        this.legIndex = 1;
      } else if (this.legFrames == 13) {
        this.legIndex = 0;
      }
      this.wobbleX = this.wobbleScaleX * EnemySoldier.WOBBLES[this.legFrames];
      this.wobbleY = this.wobbleScaleY * EnemySoldier.WOBBLES[this.legFrames];
      this.legFrames--;
    } else {
      this.walkAtRightAngleToBarrier();
    }
  }
  
  private convey(): void {   
    if (this.gameMode.conveyorDelta > 0 && this.gameMode.isConveyor(this.x, this.y)) {
   
      let nextY = this.y + this.gameMode.conveyorDelta;
      let walkable = true;
      if (this.gameMode.isDriveable(this.x - 16, nextY - 6, this.x + 16, nextY + 6)) {

        // avoid bumping into other enemies
        for(let i = this.solids.size() - 1; i >= 0; i--) {
          let solid = this.solids.get(i);
          if (solid != this && solid.isSolid(this.x + this.solidX1, nextY + this.solidY1, 
              this.x + this.solidX2, nextY + this.solidY2) && !solid.isSolid(
                  this.x + this.solidX1, this.y + this.solidY1, this.x + this.solidX2, this.y + this.solidY2)) {
            walkable = false;
            break;
          }
        } 
      } else {
        walkable = false;
      }

      if (walkable) {
        this.y = nextY;
      }
    }
  }
  
  private walk(): void {
    
    this.convey();
    
    switch(this.state) {
      case EnemySoldier.STATE_SEEKING:
        this.seek();
        break;
      case EnemySoldier.STATE_AIMING:
        this.aim();
        break;
    }
  }

  public flatten(): void {
    this.remove();
    new DeadEnemySoldier(this.x, this.y);
  }  

  public explode(): void {
    this.remove();
    new DeadEnemySoldier(this.x, this.y);
    new Explosion(this.x, this.y);
  } 

  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {    
    if (this.isMine(x1, y1, x2, y2)) {
      this.remove();
      new DeadEnemySoldier(this.x, this.y);
    } 
    return false;
  }

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (this.hit(x1, y1, x2, y2)) {
      this.remove();
      new DeadEnemySoldier(this.x, this.y);
    }
    return false;
  }

  // returns true if player bullet was absorbed by enemy
  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.hit(x1, y1, x2, y2)) {       
      this.remove();
      new DeadEnemySoldier(this.x, this.y);
      return true;
    } else {
      return false;
    }
  }  

  public remove(): void {
    this.removeFlag = true;    
    if (this.bossHelicopter != null) {
      this.bossHelicopter.soldierKilled();
    }
   if (this.playSoundOnRemove && !this.gameMode.isOutsideOfFrame(
        this.x + this.hitX1, this.y + this.hitY1, this.x + this.hitX2, this.y + this.hitY2)) {
      this.main.playSound(this.main.soldierKilledSound);
    }
  }

  public update(): void {
    this.inSwamp = this.gameMode.isSwamp(this.x, this.y);
    if (this.type == EnemySoldierType.WALKER) {
      this.walk();
    } else {
      this.aim();
    }
  }

  public render(): void {
    if (--this.blink < 0) {
      this.blink = 4;
    }
    if (this.fire) {
      this.main.draw((this.inSwamp ? this.main.swampSoldiers : this.main.enemySoldiers)
          [this.blink < 2 && this.state == EnemySoldier.STATE_AIMING 
              && this.aiming <= EnemySoldier.AIM_BLINKING ? 0 : 1][this.orientation + this.legIndex], 
                  this.x + this.wobbleX - 16, this.y + this.wobbleY - 54);
    } else {
      this.main.draw((this.inSwamp ? this.main.swampSoldiers : this.main.enemySoldiers)
          [this.blink < 2 && this.state == EnemySoldier.STATE_AIMING 
              && this.aiming <= EnemySoldier.AIM_BLINKING ? 1 : 0][this.orientation + this.legIndex], 
                  this.x + this.wobbleX - 16, this.y + this.wobbleY - 54); 
    }
  }  
}
