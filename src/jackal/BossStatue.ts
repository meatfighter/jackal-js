// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossStatue.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { StatueSeekerMissile } from "./StatueSeekerMissile.js";
export class BossStatue extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 4 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number") {
        let x = args[0];
        let y = args[1];
        let startDelay = args[2];
        let bossStatuesManager = args[3];
            this.x = x;
                this.y = y;
                this.bossStatuesManager = bossStatuesManager;
    
                let X = (x) >> 5;
                let Y = (y) >> 5; 
    
                this.groupIndex = this.gameMode.groupsMap[Y + 1][X + 1];  
    
                this.delay += startDelay;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly PAUSE_TIME: number = 4 * 91;
  public static readonly EYES_FLASHING_TIME: number = 45;
  public static readonly MOUTH_OPEN_TIME: number = 45;
  public static readonly MISSILE_TIME: number = 35;
  
  public static readonly STATE_PAUSED: number = 0;
  public static readonly STATE_EYES_FLASHING: number = 1;
  public static readonly STATE_MOUTH_OPEN: number = 2;
  
  public static readonly HITS: number = 3;
  
  public type: number = 0;
  public groupIndex: number = 0;
  public state: number = BossStatue.STATE_PAUSED;
  public delay: number = 91;
  public eyesVisible: number = 0;
  public hits: number = 0;
  public bossStatuesManager: any = null as any;
  
  

  public init(): void {
    super.init();
    
    this.layer = 3;
    
    this.hitX1 = 8;
    this.hitY1 = 0;
    this.hitX2 = 88;
    this.hitY2 = 128;
  }

  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource == AttackSource.PLAYER_WEAPON
        && this.hit(x1, y1, x2, y2)) {    
      if (++this.hits == BossStatue.HITS) {
        this.remove();
        this.bossStatuesManager.statueDestroyed();        
        new Explosion(this.x + 48, this.y + 64);
        this.gameMode.triggerGroup(this.groupIndex);
        this.main.addPoints(800);
      } else {
        this.main.playHitExplodeSound(); 
        let X = 0.5 * (x1 + x2);  
        if (X < this.x + 32) {
          X = this.x + 32;
        } else if (X > this.x + 64) {
          X = this.x + 64;
        }
        for(let i = 0; i < 5; i++) {
          new Explosion(
              X + this.main.random.nextInt(8) - 4, 
              this.y + 156 + this.main.random.nextInt(8) - (i << 5), 
              true, (i + 1) * 4, 0.5);
        }
      }
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
    switch(this.state) {
      case BossStatue.STATE_PAUSED:
        if (--this.delay == 0) {
          this.state = BossStatue.STATE_EYES_FLASHING;
          this.delay = BossStatue.EYES_FLASHING_TIME;
        }
        break;
      case BossStatue.STATE_EYES_FLASHING:
        if (--this.delay == 0) {
          this.state = BossStatue.STATE_MOUTH_OPEN;
          this.delay = BossStatue.MOUTH_OPEN_TIME;
        }        
        break;
      case BossStatue.STATE_MOUTH_OPEN:
        if (this.delay == BossStatue.MISSILE_TIME) {
          new StatueSeekerMissile(this.x, this.y);
        }
        if (--this.delay == 0) {
          this.state = BossStatue.STATE_PAUSED;
          this.delay = BossStatue.PAUSE_TIME;
        }        
        break;
    }
  }

  public render(): void {
    
    switch(this.state) {
      case BossStatue.STATE_EYES_FLASHING:        
        if (this.eyesVisible < 2) {
          this.main.draw(this.main.statueWhiteEyes, this.x + 32, this.y + 64); 
        }
        if (++this.eyesVisible == 4) {
          this.eyesVisible = 0;
        }
        break;
      case BossStatue.STATE_MOUTH_OPEN:
        this.main.draw(this.main.statueWhiteMouth, this.x + 32, this.y + 96);
        break;
    }
  }  
}
