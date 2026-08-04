// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Statue.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { StatueMissile } from "./StatueMissile.js";
export class Statue extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number") {
        let x = args[0];
        let y = args[1];
        let type = args[2];
            this.x = x;
                this.y = y;
                this.type = type;
    
                let X = (x) >> 5;
                let Y = (y) >> 5; 
    
                if (type == Statue.TYPE_LEFT) {
                  this.delay += 108;
                }
    
                this.groupIndex = this.gameMode.groupsMap[Y + 1][X + 1];
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly PAUSE_TIME: number = 91;
  public static readonly EYES_FLASHING_TIME: number = 45;
  public static readonly MOUTH_OPEN_TIME: number = 45;
  public static readonly MISSILE_TIME: number = 35;
  
  public static readonly TYPE_NONE: number = 0;
  public static readonly TYPE_LEFT: number = 1;
  public static readonly TYPE_RIGHT: number = 2;
  
  public static readonly STATE_PAUSED: number = 0;
  public static readonly STATE_EYES_FLASHING: number = 1;
  public static readonly STATE_MOUTH_OPEN: number = 2;
  
  public type: number = 0;
  public groupIndex: number = 0;
  public state: number = Statue.STATE_PAUSED;
  public delay: number = Statue.PAUSE_TIME;
  public eyesVisible: number = 0;
  
  

  public init(): void {
    super.init();
    
    this.layer = 3;
    
    this.hitX1 = 0;
    this.hitY1 = 0;
    this.hitX2 = 96;
    this.hitY2 = 128;
  }

  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if ((attackSource == AttackSource.PLAYER_WEAPON
        || attackSource == AttackSource.TRAVELING_EXPLOSION)
            && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + 48, this.y + 64);
      this.gameMode.triggerGroup(this.groupIndex);
      this.main.addPoints(800);
      return true;
    } else {
      return false;
    }
  }  
  
  // returns true if player bullet was absorbed by enemy
  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.hit(x1, y1, x2, y2)) {           
      return true;
    } else {
      return false;
    }
  }  

  public update(): void {
    if (this.type == Statue.TYPE_NONE) {
      return;
    }
    switch(this.state) {
      case Statue.STATE_PAUSED:
        if (--this.delay == 0) {
          this.state = Statue.STATE_EYES_FLASHING;
          this.delay = Statue.EYES_FLASHING_TIME;
        }
        break;
      case Statue.STATE_EYES_FLASHING:
        if (--this.delay == 0) {
          this.state = Statue.STATE_MOUTH_OPEN;
          this.delay = Statue.MOUTH_OPEN_TIME;
        }        
        break;
      case Statue.STATE_MOUTH_OPEN:
        if (this.delay == Statue.MISSILE_TIME) {
          new StatueMissile(this.x, this.y, this.type == Statue.TYPE_RIGHT);
        }
        if (--this.delay == 0) {
          this.state = Statue.STATE_PAUSED;
          this.delay = Statue.PAUSE_TIME;
        }        
        break;
    }
  }

  public render(): void {
    
    switch(this.state) {
      case Statue.STATE_EYES_FLASHING:        
        if (this.eyesVisible < 2) {
          this.main.draw(this.main.statueBlueEyes, this.x + 32, this.y + 64); 
        }
        if (++this.eyesVisible == 4) {
          this.eyesVisible = 0;
        }
        break;
      case Statue.STATE_MOUTH_OPEN:
        this.main.draw(this.main.statueBlueMouth, this.x + 32, this.y + 96);
        break;
    }
  }  
}
