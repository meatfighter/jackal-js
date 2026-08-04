// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossShipGun.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
export class BossShipGun extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
        let bossShipManager = args[2];
            this.x = x;
                this.y = y;
                this.bossShipManager = bossShipManager;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly STATE_CLOSED: number = 0;
  public static readonly STATE_OPENING: number = 1;
  public static readonly STATE_AIMING: number = 2;
  public static readonly STATE_SHOOTING: number = 3;
  public static readonly STATE_CLOSING: number = 4;
  
  public static readonly MIN_CLOSED_DELAY: number = 3 * 91; 
  public static readonly MAX_CLOSED_DELAY: number = 6 * 91;
  public static readonly OPEN_DELAY: number = 85;
  public static readonly AIMING_DELAY: number = 40;
  public static readonly SHOOT_DELAY: number = 22;
  
  public static readonly SHOOT_SPREAD_ANGLE: number = ((20) * Math.PI / 180);
  
  public static readonly OPEN_SPEED: number = 32 / BossShipGun.OPEN_DELAY;  
  
  public static readonly BULLET_SPEED: number = 1.625;
  public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;  
  
  public player: any = null as any;
  public state: number = BossShipGun.STATE_CLOSED;
  public delay: number = BossShipGun.MIN_CLOSED_DELAY 
      + this.main.random.nextInt(BossShipGun.MAX_CLOSED_DELAY - BossShipGun.MIN_CLOSED_DELAY);
  public openY: number = 0;
  public angle: number = 0;
  public aimingSpeed: number = 0;
  public colorIndex: number = 0;
  public bossShipManager: any = null as any;
  public hits: number = 2;
  public wasHit: boolean = false;
  public triggered: boolean = false;
  
  

  public init(): void {
    super.init();
    
    this.player = this.gameMode.player;    
    
    this.layer = 3;
    
    this.bulletHits = 6;
    
    this.hitX1 = 4;
    this.hitY1 = 4;
    this.hitX2 = 60;
    this.hitY2 = 60;
    
    this.mine = true;
    this.mineX1 = 8;
    this.mineY1 = 8;
    this.mineX2 = 56;
    this.mineY2 = 56;
    
    this.solid = true;
    this.solidX1 = 0;
    this.solidY1 = 0;
    this.solidX2 = 64;
    this.solidY2 = 64;
    
    this.points = 1000;
    
    this.explosionX = 32;
    this.explosionY = 32;
  }

  public update(): void {
    switch(this.state) {
      case BossShipGun.STATE_CLOSED:
        if (this.triggered && --this.delay == 0) {
          this.triggered = false;
          this.state = BossShipGun.STATE_OPENING;
          this.openY = 0;
          this.delay = BossShipGun.OPEN_DELAY;
          this.wasHit = false;
        }
        break;
      case BossShipGun.STATE_OPENING:
        this.openY += BossShipGun.OPEN_SPEED;
        if (this.openY > 32) {
          this.openY = 32;
        }
        if (--this.delay == 0 || this.openY >= 32) {
          this.state = BossShipGun.STATE_AIMING;
          this.angle = 90;
          this.delay = BossShipGun.AIMING_DELAY;
          
          let targetAngle = ((
              Math.atan2(this.player.y - this.y, this.player.x - this.x) * 180 / Math.PI));
          let deltaAngle = (targetAngle + 90) % 360;
          if (deltaAngle < 0) {
            deltaAngle += 180;
          } else {
            deltaAngle -= 180;
          }
          
          this.aimingSpeed = deltaAngle / BossShipGun.AIMING_DELAY;
        }
        break;
      case BossShipGun.STATE_AIMING:
        this.angle += this.aimingSpeed;
        if (--this.delay == 0) {
          this.state = BossShipGun.STATE_SHOOTING;
          this.delay = BossShipGun.SHOOT_DELAY;
        }
        break;
      case BossShipGun.STATE_SHOOTING:
        if (--this.delay == 0) {
          this.state = BossShipGun.STATE_CLOSING;
          this.delay = BossShipGun.OPEN_DELAY;
          this.openY = 32;
          
          let shootAngle = Math.atan2(
              this.player.y - (this.y + 32), this.player.x - (this.x + 32));
          shootAngle -= 2 * BossShipGun.SHOOT_SPREAD_ANGLE;          
          
          for(let i = 0; i < 5; i++, shootAngle += BossShipGun.SHOOT_SPREAD_ANGLE) {
            let cos = Math.cos(shootAngle);
            let sin = Math.sin(shootAngle);
            new EnemyBullet(this.x + 32 + 13 * cos, this.y + 32 + 13 * sin, 
                BossShipGun.BULLET_SPEED * cos, BossShipGun.BULLET_SPEED * sin, 
                BossShipGun.BULLET_TRAVEL_TIME, false);
          }
        }
        break;
      case BossShipGun.STATE_CLOSING:
        this.openY -= BossShipGun.OPEN_SPEED;
        if (this.openY < 0) {
          this.openY = 0;
        }
        if (--this.delay == 0 || this.openY <= 0) {
          this.state = BossShipGun.STATE_CLOSED;
          this.delay = BossShipGun.MIN_CLOSED_DELAY + this.main.random.nextInt(
              BossShipGun.MAX_CLOSED_DELAY - BossShipGun.MIN_CLOSED_DELAY);
        }
        break;
    }
  }  
  
  public open(delay: any): void {
    if (this.state == BossShipGun.STATE_CLOSED) {
      this.triggered = true;
      if (delay < 1) {
        delay = 1;
      }
      this.delay = delay;      
    }
  }
  
  public isOpenable(): boolean {
    return !(this.removeFlag || this.gameMode.isOutsideOfFrame(this.x + 8, this.y + 8, this.x + 56, this.y + 56));
  }
  
  // returns true if player bumped into the enemy

  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {  
    if (invincible || this.state == BossShipGun.STATE_CLOSED || this.openY < 16) {
      return false;
    }
    if (this.isMine(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
      this.main.addPoints(this.points);
      return true;
    } else {
      return false;
    }
  }

  public remove(): void {
    this.removeFlag = true;
    this.main.addPoints(this.points);
    this.main.playHitExplodeSound(); 
    this.bossShipManager.gunDestroyed(this);
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (this.wasHit || this.state == BossShipGun.STATE_CLOSED || this.openY < 16) {
      return false;
    }
    if (attackSource == AttackSource.PLAYER_WEAPON 
        && this.hit(x1, y1, x2, y2)) {
      this.wasHit = true;
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
      if (--this.hits == 0) {
        this.remove();
      } else {
        this.state = BossShipGun.STATE_CLOSING;
        this.delay = BossShipGun.OPEN_DELAY;
        this.main.playHitExplodeSound();
      }
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.state == BossShipGun.STATE_CLOSED || this.openY < 16) {
      return false;
    }
    if (this.hit(x1, y1, x2, y2)) {       
      if (--this.bulletHits <= 0) {
        this.remove();
        new Explosion(this.x + this.explosionX, this.y + this.explosionY);        
      } else {
        this.main.playSoundAlways(this.main.bulletHitSound);
      }         
      return true;
    } else {
      return false;
    }
  }  

  public render(): void {    
    
    switch(this.state) {
      case BossShipGun.STATE_CLOSED:
        this.main.draw(this.main.shipGuns[1], this.x, this.y);
        this.main.draw(this.main.shipGuns[2], this.x, this.y + 32);
        this.main.draw(this.main.shipGuns[0], this.x, this.y);
        break;
      case BossShipGun.STATE_OPENING:
        this.gameMode.g.setWorldClip(this.x, this.y, 64, 64);                  
        this.main.draw(this.main.floorGuns[4], this.x, this.y);
        this.main.draw(this.main.floorGuns[0], this.x + 3, this.y + 51 - this.openY * 1.5);
        this.main.draw(this.main.shipGuns[1], this.x, this.y - this.openY);
        this.main.draw(this.main.shipGuns[2], this.x, this.y + 32 + this.openY);
        this.main.draw(this.main.shipGuns[0], this.x, this.y);
        this.gameMode.g.clearWorldClip();
        break;
      case BossShipGun.STATE_AIMING:
        this.main.draw(this.main.floorGuns[4], this.x, this.y);        
        this.main.draw(this.main.shipGuns[0], this.x, this.y);
        this.main.drawRotated(this.main.floorGuns[0], 
            this.x + 32, this.y + 32, -29, -29, this.angle - 90);
        break;
      case BossShipGun.STATE_SHOOTING:
        if (++this.colorIndex == 4) {
          this.colorIndex = 0;
        }
        this.main.draw(this.main.floorGuns[this.colorIndex == 1 ? 5 : 4], this.x, this.y);        
        this.main.draw(this.main.shipGuns[0], this.x, this.y);
        this.main.drawRotated(this.main.floorGuns[this.colorIndex], 
            this.x + 32, this.y + 32, -29, -29, this.angle - 90);
        break;
      case BossShipGun.STATE_CLOSING:
        this.gameMode.g.setWorldClip(this.x, this.y, 64, 64);                  
        this.main.draw(this.main.floorGuns[4], this.x, this.y);
        this.main.drawRotated(this.main.floorGuns[0], 
            this.x + 32, this.y + 32 + 48 - this.openY * 1.5, -29, -29, this.angle - 90);
        this.main.draw(this.main.shipGuns[1], this.x, this.y - this.openY);
        this.main.draw(this.main.shipGuns[2], this.x, this.y + 32 + this.openY);
        this.main.draw(this.main.shipGuns[0], this.x, this.y);
        this.gameMode.g.clearWorldClip();
        break;
    }   
  }  
}
