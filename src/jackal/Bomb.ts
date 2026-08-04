// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Bomb.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { Main } from "./Main.js";
export class Bomb extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let x = args[0];
        let y = args[1];
        let airplane = args[2];
            this.__construct(x, y, airplane, 0, 0);
        return;
    } else     if (args.length === 5 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean" && typeof args[3] === "number" && typeof args[4] === "number") {
        let x = args[0];
        let y = args[1];
        let airplane = args[2];
        let vx = args[3];
        let vy = args[4];
            this.x = x;
                this.y = y;
                this.airplane = airplane;
    
                this.vx = (this.gameMode.player.x + this.main.random.nextFloat() * Bomb.ERROR - Bomb.ERROR) - x;
                this.vy = (this.gameMode.player.y + this.main.random.nextFloat() * Bomb.ERROR - Bomb.ERROR) - y;
                let imag = (airplane ? Bomb.VELOCITY : 0.75 * Bomb.VELOCITY)
                    / Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                this.vx *= imag;
                this.vy *= imag;
    
                this.vx += vx;
                this.vy += vy;
    
                this.angle = this.main.random.nextInt(4) * 90; 
    
                if (airplane || this.isCloseToFrame()) {
                  this.main.playSound(this.main.throwSound);
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly CLOSE_MARGIN: number = 128;
  public static readonly DISTANCE: number = 160;
  public static readonly MIN_SCALE: number = 32 / 44; 
  public static readonly TRAVEL_TIME: number = 114;
  public static readonly HALF_TIME: number = Bomb.TRAVEL_TIME / 2;
  public static readonly GRAVITY: number = -2 * (1 - Bomb.MIN_SCALE) 
      / (Bomb.HALF_TIME * Bomb.HALF_TIME);
  public static readonly HALF_GRAVITY2: number = (Bomb.MIN_SCALE - 1) 
      / (Bomb.TRAVEL_TIME * Bomb.TRAVEL_TIME);
  public static readonly VELOCITY: number = Bomb.DISTANCE / Bomb.TRAVEL_TIME;  
  public static readonly HALF_GRAVITY: number = Bomb.GRAVITY / 2;
  public static readonly V0: number = -Bomb.GRAVITY * Bomb.HALF_TIME;
  public static readonly ANGULAR_VELOCITY: number = 5;
  public static readonly ERROR: number = 64;
  
  public vx: number = 0;
  public vy: number = 0;
  public scale: number = 0;
  public angle: number = 0;
  public t: number = 0;  
  public airplane: boolean = false;
  
  

  
  
  private isCloseToFrame(): boolean {
    let X = this.x - this.gameMode.cameraX;
    let Y = this.y - this.gameMode.cameraY;
    return X >= -Bomb.CLOSE_MARGIN && X <= Main.DISPLAY_WIDTH + Bomb.CLOSE_MARGIN
        && Y >= -Bomb.CLOSE_MARGIN && Y <= Main.DISPLAY_HEIGHT + Bomb.CLOSE_MARGIN;
  }

  public init(): void {
    super.init();
    
    this.layer = 5;
    
    this.hitX1 = -19;
    this.hitY1 = -19;
    this.hitX2 = 19;
    this.hitY2 = 19;
    
    this.mine = true;
    this.mineX1 = -19;
    this.mineY1 = -19;
    this.mineX2 = 19;
    this.mineY2 = 19;
  }

  public remove(): void {
    this.removeFlag = true;
    if (!this.gameMode.isOutsideOfFrame(this.x, this.y) && this.playSoundOnRemove) {
      this.main.playExplodeSound2();
    }
  }  

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
    if (this.airplane) {
      this.scale = 1 + Bomb.HALF_GRAVITY2 * this.t * this.t;
    } else {
      this.scale = Bomb.MIN_SCALE + this.t * (Bomb.V0 + Bomb.HALF_GRAVITY * this.t);
    }
    this.angle += Bomb.ANGULAR_VELOCITY;
    
    if (++this.t > Bomb.TRAVEL_TIME) {
      this.remove();
      new Explosion(this.x, this.y).setDamagesEnemies(false);
    }
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    return false;
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    return false;
  } 
  
  // returns true if player bumped into the enemy

  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {
    if (this.t < Bomb.TRAVEL_TIME - 2 || invincible) {
      return false;
    }
    if (this.isMine(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x, this.y);
      this.main.addPoints(this.points);
      return true;
    } else {
      return false;
    }
  }  

  public render(): void {
    this.main.draw(this.main.bomb, this.x, this.y, this.angle, this.scale);
  }
  
}
