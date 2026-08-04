// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/GrayBoat.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
export class GrayBoat extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = x;
                this.y = y;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPRITE_TOGGLE_FRAMES: number = 12;
  public static readonly UPDATE_GUN_FRAMES: number = 4;
  public static readonly BULLET_DELAY: number = 91;
  public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;
  public static readonly SPEED: number = 1.75;
  public static readonly MOVEMENT_TIME: number = 227;
  public static readonly TO_DEGREES: number = 180 / Math.PI;
  
  public player: any = null as any;
  public spriteIndex: number = 0;
  public spriteIndexCounter: number = 0;
  public bulletDelay: number = 0;
  public movementDelay: number = GrayBoat.MOVEMENT_TIME; 
  public gunAngle: number = 0;
  public updateGun: number = 0;
  
  

  public init(): void {
    super.init();
    
    this.player = this.gameMode.player;    
    
    this.layer = 3;
    
    this.bulletHits = 8;
    
    this.hitX1 = 8;
    this.hitY1 = 8;
    this.hitX2 = 56;
    this.hitY2 = 184;    
    
    this.points = 800;
  }

  public update(): void {
    if (this.movementDelay > 0) {
      this.movementDelay--;
      this.y += GrayBoat.SPEED;
    }
    if (--this.spriteIndexCounter < 0) {
      this.spriteIndexCounter = GrayBoat.SPRITE_TOGGLE_FRAMES;
      this.spriteIndex ^= 1;      
    }
    if (--this.updateGun < 0) {
      this.updateGun = GrayBoat.UPDATE_GUN_FRAMES;
      this.gunAngle = GrayBoat.TO_DEGREES * Math.atan2(
          this.player.y - (this.y + 131), this.player.x - (this.x + 32));
    }
    if (--this.bulletDelay < 0) {
      this.bulletDelay = GrayBoat.BULLET_DELAY;
      let X = this.x + 32;
      let Y = this.y + 131;
      let dx = this.player.x - X;
      let dy = this.player.y - Y;
      let imag = 1 / Math.sqrt(dx * dx + dy * dy);
      dx *= imag;
      dy *= imag;
      
      new EnemyBullet(X + 34 * dx, Y + 34 * dy, 
          dx, dy, GrayBoat.BULLET_TRAVEL_TIME, true);
    }
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + 32, this.y + 96);
      this.main.addPoints(this.points);
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.hit(x1, y1, x2, y2)) {       
      if (--this.bulletHits <= 0) {
        this.remove();
        new Explosion(this.x + 32, this.y + 96);
        this.main.addPoints(this.points);
      }      
      return true;
    } else {
      return false;
    }
  }  

  public render(): void {
    this.main.draw(this.main.grayBoats[this.spriteIndex], this.x, this.y);
    this.main.drawRotated(this.main.grayBoats[2], this.x + 32, this.y + 131, -14, -13, this.gunAngle);
  }  
}
