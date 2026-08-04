// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossSuperTank.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { AttackSource } from "./AttackSource.js";
import { BossSuperTankGun } from "./BossSuperTankGun.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { FlashingSkull } from "./FlashingSkull.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
import { SuperFire } from "./SuperFire.js";
export class BossSuperTank extends Enemy implements ICameraPanListener {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.player = null as any;
    this.colorIndex = 0;
    this.wheelAngle = 0;
    this.treadOffset = 0;
    this.state = 0;
    this.appearingDelay = 0;
    this.vx = 0;
    this.targetX = 0;
    this.ax = 0;
    this.hits = 0;
    this.delay = 0;
    this.smashed = 0;
    this.exploding = 0;
    this.superFire = null as any;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_BossSuperTank(...args);
  }
  private __construct_BossSuperTank(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            this.x = xLocal;
                this.y = yLocal;
                this.player = this.gameMode.player;
    
                this.player.longRange = true;
    
                new BossSuperTankGun(this);
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly STATE_APPEARING: number = 0;
  public static readonly STATE_ACCELERATING: number = 1;
  public static readonly STATE_MOVING: number = 2;
  public static readonly STATE_DECELERATING: number = 3;
  public static readonly STATE_STOPPED: number = 4;
  public static readonly STATE_EXPLODING: number = 5;
  public static readonly STATE_EXPLODING_FINISHING: number = 6;
  public static readonly STATE_EXPLODED: number = 7;
  public static readonly STATE_PANNING: number = 8;
  public static readonly STATE_FLASHING_SKULL: number = 9;
  
  public static readonly ACCELERATION_TIME: number = 23;
  public static readonly MAX_SPEED: number = 2.5;
  public static readonly ACCELERATION: number = BossSuperTank.MAX_SPEED / BossSuperTank.ACCELERATION_TIME;
  public static readonly ACCELERATION_DISTANCE: number = 0;
  
  static {
    let vx = 0;
    let x = 0;
    while(vx < BossSuperTank.MAX_SPEED) {
      vx += BossSuperTank.ACCELERATION;  
      x += vx;          
    }
    BossSuperTank.ACCELERATION_DISTANCE = x;
  }
  
  public static readonly FIRE_PROBABILITY: number = 0.75;
  public static readonly TARGET_PLAYER_PROBABILITY: number = 0.1;

  public static readonly WHEEL_ANGLE_CONST: number = javaFloat((180 / (Math.PI * 32)));
  public static readonly ANGLED_TREAD_ANGLE: number = 30;
  public static readonly ANGLED_TREAD_RADIANS: number = ((BossSuperTank.ANGLED_TREAD_ANGLE) * Math.PI / 180);
  public static readonly ANGLED_TREAD_X: number = javaFloat(Math.cos(BossSuperTank.ANGLED_TREAD_RADIANS));
  public static readonly ANGLED_TREAD_Y: number = javaFloat(Math.sin(BossSuperTank.ANGLED_TREAD_RADIANS));
  public static readonly APPEARING_SCALE: number = 1 / 23; 
    
  public static readonly HITS_ORANGE: number = 5;
  public static readonly HITS_RED: number = 10;
  public static readonly HITS_EXPLODE: number = 15;
  
//  public static final int HITS_ORANGE = 1;
//  public static final int HITS_RED = 2;
//  public static final int HITS_EXPLODE = 3; 
  
  public static readonly EXPLODING_TIME: number = 460;
  public static readonly EXPLODING_FINISHING_TIME: number = 100;
  public static readonly INV_EXPLODING_TIME: number = 1 / javaFloat(BossSuperTank.EXPLODING_TIME); 




  public state: number = BossSuperTank.STATE_APPEARING;
  public appearingDelay: number = 23;




  public delay: number = 1;



  
  

  public init(): void {
    super.init();
    
    this.layer = 2;
    
    this.hitX1 = 0;
    this.hitY1 = 32;
    this.hitX2 = 456;
    this.hitY2 = 198;
    
    this.points = 10000;
  }
  
  private chooseTarget(): void {    
    this.state = BossSuperTank.STATE_ACCELERATING;
    if (this.main.random.nextFloat() <= BossSuperTank.TARGET_PLAYER_PROBABILITY * this.colorIndex) {
      this.targetX = this.player.x;
    } else {
      this.targetX = this.gameMode.cameraX + 48 
          + this.main.random.nextInt(MainConstants.DISPLAY_WIDTH - 96);
    }
    if (this.targetX < 176) {
      this.targetX = 176;
    } else if (this.targetX > 1872) {
      this.targetX = 1872;
    }
    this.targetX -= 210;
    if (Math.abs(this.x - this.targetX) < 3 * BossSuperTank.ACCELERATION_DISTANCE) {
      if (this.targetX + 210 < 1024) {
        this.targetX = this.x + 3 * BossSuperTank.ACCELERATION_DISTANCE;
      } else {
        this.targetX = this.x - 3 * BossSuperTank.ACCELERATION_DISTANCE;
      }
    }
    if (this.targetX < this.x) {
      this.ax = -BossSuperTank.ACCELERATION;
    } else {
      this.ax = BossSuperTank.ACCELERATION;
    }
  }
  
  private move(dx: any): void {
    this.x += dx;
    this.wheelAngle += BossSuperTank.WHEEL_ANGLE_CONST * dx;
    this.treadOffset -= dx;
    while(this.treadOffset < 0) {
      this.treadOffset += 16;
    }
    while(this.treadOffset >= 16) {
      this.treadOffset -= 16;
    }
  }
  
  private stopMoving(): void {
    this.state = BossSuperTank.STATE_STOPPED;
    if (this.main.random.nextFloat() <= BossSuperTank.FIRE_PROBABILITY) {
      this.superFire = new SuperFire(this.x + 210, this.y + 314, this);      
    }
    this.delay = 91;
  }

  public update(): void {
    switch(this.state) {
      case BossSuperTank.STATE_APPEARING:
        if (--this.appearingDelay == 0) {
          this.chooseTarget();
          for(let i = 0; i < 5; i++) {
            this.main.superTanks[0][i].setAlpha(1);
          }
        }
        break;
      case BossSuperTank.STATE_ACCELERATING:
        this.vx += this.ax;
        this.move(this.vx);
        if (this.ax < 0) {
          if (this.vx <= -BossSuperTank.MAX_SPEED) {
            this.state = BossSuperTank.STATE_MOVING;
          }
        } else {
          if (this.vx >= BossSuperTank.MAX_SPEED) {
            this.state = BossSuperTank.STATE_MOVING;
          }
        }
        break;
      case BossSuperTank.STATE_MOVING:
        this.move(this.vx);
        if (Math.abs(this.targetX - this.x) <= BossSuperTank.ACCELERATION_DISTANCE) {
          this.state = BossSuperTank.STATE_DECELERATING;
        }
        break;
      case BossSuperTank.STATE_DECELERATING:
        this.vx -= this.ax;
        this.move(this.vx);
        if (this.ax < 0) {
          if (this.vx >= 0) {
            this.stopMoving();
          }
        } else {
          if (this.vx <= 0) {
            this.stopMoving();
          }
        }
        break;
      case BossSuperTank.STATE_STOPPED:
        if (--this.delay == 0) {
          this.chooseTarget();
        }
        break;
      case BossSuperTank.STATE_EXPLODING:
        if (--this.delay == 0) {
          if (this.exploding + 1 < BossSuperTank.EXPLODING_TIME) {
            new Explosion(this.x + this.main.random.nextInt(456), 
                this.y + 32 + this.main.random.nextInt(230)).setDamagesEnemies(false);
          }
          this.delay = 8;
        }
        this.smashed = this.exploding * BossSuperTank.INV_EXPLODING_TIME;
        if (++this.exploding == BossSuperTank.EXPLODING_TIME) {
          this.state = BossSuperTank.STATE_EXPLODING_FINISHING;
          this.exploding = BossSuperTank.EXPLODING_FINISHING_TIME;          
        }
        break;
      case BossSuperTank.STATE_EXPLODING_FINISHING:
        if (--this.exploding == 0) {
          this.main.requestSong(this.main.cutsceneSong);
          this.state = BossSuperTank.STATE_EXPLODED;  
          this.delay = 91;
        }
        break;
      case BossSuperTank.STATE_EXPLODED:
        if (--this.delay == 0) {
          this.state = BossSuperTank.STATE_PANNING;
          this.gameMode.startEndingCameraPan(this);
        }
        break;
    }
  }
  
  private kaboom(): void {
    this.state = BossSuperTank.STATE_EXPLODING;
    this.main.stopSong();
    this.main.playSoundAlways(this.main.headquartersExplodesSound);
    this.main.addPoints(this.points + 2000 * this.main.friendlySoldiersPickedUp);
    this.gameMode.destroyAll(this);
    this.delay = 1;
    if (this.superFire != null) {
      this.superFire.remove();
    }
  }
  
  private displayHit(hitX: any, hitY: any): void {
    if (hitY > this.y + 230) {
      hitY = this.y + 230;
    }
        
    for(let i = 0; i < 3; i++) {
      let X = hitX;
      let Y = hitY;
      let d = 0;
      do {
        new Explosion(X, Y, true, d, 0.5, this);
        d += 2;
        X += this.main.random.nextInt(128) - 64;
        if (X < this.x) {
          X = this.x + this.main.random.nextInt(128);
        } else if (X > this.x + 456) {
          X = this.x + 456 - this.main.random.nextInt(128);
        }
        Y -= 32;
      } while(Y > this.y + 32);
    }
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (this.state >= BossSuperTank.STATE_EXPLODING) {
      return false;
    }
    if (attackSource == AttackSource.PLAYER_WEAPON 
        && this.hit(x1, y1, x2, y2)) {
      this.hits++;
      this.main.playHitExplodeSound();
      if (this.hits == BossSuperTank.HITS_EXPLODE) {
        this.kaboom();
      } else {
        this.displayHit(0.5 * (x1 + x2), 0.5 * (y1 + y2));
        if (this.hits == BossSuperTank.HITS_ORANGE) {
          this.colorIndex = 1;
        } else if (this.hits == BossSuperTank.HITS_RED) {
          this.colorIndex = 2;
        }
      }          
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.state >= BossSuperTank.STATE_EXPLODING) {
      return false;
    }
    if (this.hit(x1, y1, x2, y2)) {                 
      return true;
    } else {
      return false;
    }
  }

  public panComplete(): void {
    this.state = BossSuperTank.STATE_FLASHING_SKULL;
    new FlashingSkull();
  }  

  public render(): void {
    if (this.state == BossSuperTank.STATE_APPEARING) {
      for(let i = 0; i < 5; i++) {
        this.main.superTanks[0][i].setAlpha(1 - this.appearingDelay * BossSuperTank.APPEARING_SCALE);
      }
    }
    
    this.gameMode.g.setWorldClip(this.x, this.y + 200, 64, 64);
    this.main.drawRotated(this.main.superTanks[this.colorIndex][0], 
        this.x + 48 + BossSuperTank.ANGLED_TREAD_X * this.treadOffset, 
        this.y + 219 + BossSuperTank.ANGLED_TREAD_Y * this.treadOffset, 
        BossSuperTank.ANGLED_TREAD_ANGLE);
    this.gameMode.g.setWorldClip(this.x + 400, this.y + 200, 50, 64);
    this.main.drawRotated(this.main.superTanks[this.colorIndex][0], 
        this.x + 402 + BossSuperTank.ANGLED_TREAD_X * this.treadOffset, 
        this.y + 227 - BossSuperTank.ANGLED_TREAD_Y * this.treadOffset, 
        -BossSuperTank.ANGLED_TREAD_ANGLE);
    this.gameMode.g.setWorldClip(this.x + 64, this.y + 200, 336, 64);    
    for(let i = 0; i < 6; i++) {
      this.main.draw(this.main.superTanks[this.colorIndex][0], 
          this.treadOffset + this.x + 32 + (i << 6), this.y + 200);
    }
    this.gameMode.g.clearWorldClip();
    for(let i = 0; i < 6; i++) {
      this.main.drawRotated(this.main.superTanks[this.colorIndex][1], 
          this.x + 72 + (i << 6), this.y + 216, this.wheelAngle);
    }    
    if (this.state >= BossSuperTank.STATE_EXPLODING_FINISHING) {
      this.main.draw(this.main.superTanks[3][2], this.x + 160, this.y);
      this.main.draw(this.main.superTanks[3][3], this.x, this.y + 32);
      this.main.draw(this.main.superTanks[3][4], this.x + 192, this.y + 232);
    } else if (this.state == BossSuperTank.STATE_EXPLODING) {      
      let alpha = 1 - this.smashed;
      this.main.draw(this.main.superTanks[2][2], this.x + 160, this.y, alpha);
      this.main.draw(this.main.superTanks[2][3], this.x, this.y + 32, alpha);
      this.main.draw(this.main.superTanks[2][4], this.x + 192, this.y + 232, alpha);
      this.main.draw(this.main.superTanks[3][2], this.x + 160, this.y, this.smashed);
      this.main.draw(this.main.superTanks[3][3], this.x, this.y + 32, this.smashed);
      this.main.draw(this.main.superTanks[3][4], this.x + 192, this.y + 232, this.smashed);
    } else {
      this.main.draw(this.main.superTanks[this.colorIndex][2], this.x + 160, this.y);
      this.main.draw(this.main.superTanks[this.colorIndex][3], this.x, this.y + 32);
      this.main.draw(this.main.superTanks[this.colorIndex][4], this.x + 192, this.y + 232);
    }
  }
}
