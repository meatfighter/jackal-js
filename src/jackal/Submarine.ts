// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Submarine.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { SubmarineMissile } from "./SubmarineMissile.js";
export class Submarine extends Enemy {  public constructor(...args: any[]) {
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
  
  public static readonly STATE_SUBMERGED: number = 0;
  public static readonly STATE_RISING: number = 1;
  public static readonly STATE_SHOOTING: number = 2;
  public static readonly STATE_LOWERING: number = 3;
  
  public static readonly MINIMUM_ALPHA: number = 0.3;
  public static readonly MAXIMUM_ALPHA: number = 0.6;
  
  public static readonly SUBMERGED_DELAY: number = 2 * 91;
  public static readonly ELEVATION_DELAY: number = 69;
  public static readonly SHOOT_DELAY: number = 91 + 68;
  public static readonly MOVE_SPEED: number = 0.775;
  public static readonly MOVES: number = 3;
  
  public player: any = null as any;
  public state: number = Submarine.STATE_SUBMERGED;
  public delay: number = 91;
  public height: number = 0;
  public alpha: number = Submarine.MINIMUM_ALPHA;
  public moveable: boolean = false;
  public moves: number = Submarine.MOVES;
  
  

  public init(): void {
    super.init();
    
    this.player = this.gameMode.player;    
    
    this.layer = 3;
    
    this.bulletHits = 8;
    
    this.hitX1 = -20;
    this.hitY1 = -60;
    this.hitX2 = 20;
    this.hitY2 = 60;    
    
    this.points = 1000;
  }
  
  private startRising(): void {
    this.state = Submarine.STATE_RISING;
    this.delay = Submarine.ELEVATION_DELAY;
    this.moves--;
  }
  
  private startShooting(): void {
    this.state = Submarine.STATE_SHOOTING;
    this.delay = Submarine.SHOOT_DELAY;
    this.alpha = Submarine.MAXIMUM_ALPHA;
    this.height = 3;    
  }
  
  private startLowering(): void {
    this.state = Submarine.STATE_LOWERING;
    this.delay = Submarine.ELEVATION_DELAY;
  }
  
  private startSubmerging(): void {
    this.state = Submarine.STATE_SUBMERGED;
    this.delay = Submarine.SUBMERGED_DELAY;
    if (this.moves >= 0) {
      this.delay += Submarine.SUBMERGED_DELAY;
    }
    this.height = 0;
    this.alpha = Submarine.MINIMUM_ALPHA;
    this.moveable = true;
  }

  public update(): void {
    
    switch(this.state) {
      case Submarine.STATE_SUBMERGED:
        if (--this.delay <= 0) {
          if (this.gameMode.cameraY < this.y - 64) {
            this.startRising();
          }
        } else if (this.moveable && this.moves >= 0) {
          this.y -= Submarine.MOVE_SPEED;
        }
        break;
      case Submarine.STATE_RISING:
        if (--this.delay <= 0) {
          this.startShooting();
        } else {
          let percent = 1 - this.delay / Submarine.ELEVATION_DELAY;
          this.height = (3 * percent);
          this.alpha = Submarine.MINIMUM_ALPHA + (Submarine.MAXIMUM_ALPHA - Submarine.MINIMUM_ALPHA) * percent;
        }
        break;
      case Submarine.STATE_SHOOTING:
        this.delay--;
        if (this.delay == Submarine.SHOOT_DELAY - 68) {
          new SubmarineMissile(this.x, this.y);
        } else if (this.delay <= 0) {
          this.startLowering();
        }
        break;
      case Submarine.STATE_LOWERING:
        if (--this.delay <= 0) {
          this.startSubmerging();
        } else {
          let percent = this.delay / Submarine.ELEVATION_DELAY;
          this.height = (3 * percent);
          this.alpha = Submarine.MINIMUM_ALPHA + (Submarine.MAXIMUM_ALPHA - Submarine.MINIMUM_ALPHA) * percent;
        }
        break;          
    }
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (this.height > 1
        && attackSource < AttackSource.PLAYER_EXPLOSION
        && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x, this.y);
      this.main.addPoints(this.points);
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.height > 1 && this.hit(x1, y1, x2, y2)) {       
      if (--this.bulletHits <= 0) {
        this.remove();
        new Explosion(this.x, this.y);
        this.main.addPoints(this.points);
      }      
      return true;
    } else {
      return false;
    }
  }  

  public render(): void {
    this.main.draw(this.main.submarines[0], this.x - 20, this.y - 128, this.alpha);
    if (this.height > 0) {
      this.main.drawCentered(this.main.submarines[this.height], this.x, this.y);
    }
  }  
}
