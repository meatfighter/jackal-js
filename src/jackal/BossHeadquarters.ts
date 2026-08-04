// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossHeadquarters.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { BossSuperTank } from "./BossSuperTank.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { TileDebris } from "./TileDebris.js";
export class BossHeadquarters extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 1) {
        let bossHeadquartersManager = args[0];
            this.x = 896;
                this.y = 96;
                this.bossHeadquartersManager = bossHeadquartersManager;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly STATE_FLASHING: number = 0;
  public static readonly STATE_EXPLOSIONS: number = 1;
  public static readonly STATE_DEBRIS: number = 2;
  
  public static readonly FLASH_DELAY: number = 68;
  public static readonly FLASH_DURATION: number = 12;  
  
  public static readonly HITS: number = 12;
  
  public static readonly EXPLODE_DELAY: number = 16;
  public static readonly EXPLODE_TIME: number = 5 * 91;
  
  public flashing: boolean = false;
  public flashDelay: number = BossHeadquarters.FLASH_DELAY;
  public flashIndex: number = -1;  
  public state: number = BossHeadquarters.STATE_FLASHING;
  public hits: number = 0;
  public explodeDelay: number = 0;
  public explodeTime: number = BossHeadquarters.EXPLODE_TIME;
  public bossHeadquartersManager: any = null as any;
  public player: any = null as any;
  
  

  public init(): void {
    super.init();
    
    this.player = this.gameMode.player;
    
    this.layer = 0;
    
    this.hitX1 = 8;
    this.hitY1 = 8;
    this.hitX2 = 248;
    this.hitY2 = 152;
    
    this.points = 5000;
  }
  
  private startExploding(): void {
    this.state = BossHeadquarters.STATE_EXPLOSIONS;
    this.main.stopSong();    
    this.explodeDelay = 1;
    this.bossHeadquartersManager.remove();
    this.gameMode.destroyAll(this);
    this.main.playSoundAlways(this.main.headquartersExplodesSound);
  }
  
  private startDebris(): void {
    this.state = BossHeadquarters.STATE_DEBRIS; 
    this.main.requestSong(this.main.superTankSong);
    new BossSuperTank(this.gameMode.player.x - 210, 32);
    let group = this.gameMode.groups[0];
    for(let i = group.length - 1; i >= 0; i--) {
      let g = group[i];      
      new TileDebris(g[0], g[1], g[2], g[3]);
    }
  }

  public update(): void {
    if (this.state == BossHeadquarters.STATE_EXPLOSIONS) {
      if (--this.explodeDelay == 0) {
        this.explodeDelay = BossHeadquarters.EXPLODE_DELAY;
        for(let i = 0; i < 2; i++) {
          new Explosion(this.gameMode.cameraX + this.main.random.nextInt(1280) - 128, 
              224 + this.main.random.nextInt(224)).setDamagesEnemies(false);
        }
        new Explosion(896 + this.main.random.nextInt(256), 
            96 + this.main.random.nextInt(416)).setDamagesEnemies(false);
      }
      if (--this.explodeTime == 0) {
        this.startDebris();
        this.remove();
      }
    } else {
      if (this.main.hasMissiles) {
        this.hitY2 = 152;
      } else {
        this.hitY2 = 192;
      }
    }
  }
  
  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (this.state == BossHeadquarters.STATE_FLASHING
        && attackSource == AttackSource.PLAYER_WEAPON
        && this.hit(x1, y1, x2, y2)) {
      if (++this.hits == BossHeadquarters.HITS) {
        this.startExploding();
      } else {
        this.main.playHitExplodeSound();
        for(let i = 0; i < 7; i++) {
          let Y = this.y + 160 - (i << 5);
          for(let j = 0; j < 4; j++) {
            if ((j == 0 || j == 3) && (i == 0 || i == 6)) {
              continue;
            }
            new Explosion(
                this.x + (j << 6) + 12 + this.main.random.nextInt(32), 
                Y + this.main.random.nextInt(8), true, (i + 1) * 4, 0.5);
          }
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

  public render(): void {
    switch(this.state) {
      case BossHeadquarters.STATE_FLASHING:        
        if (--this.flashDelay == 0) {
          if (this.flashing) {
            this.flashing = false;
            this.flashDelay = BossHeadquarters.FLASH_DELAY;
          } else {
            this.flashing = true;
            this.flashDelay = BossHeadquarters.FLASH_DURATION;
          }
        }
        if (this.flashing) {
          if (++this.flashIndex == 2) {
            this.flashIndex = -1;
          } else {
            this.main.draw(this.main.headquartersLights[this.flashIndex], 932, 188);
            this.main.draw(this.main.headquartersLights[this.flashIndex], 996, 220);
            this.main.draw(this.main.headquartersLights[this.flashIndex], 1028, 220);
            this.main.draw(this.main.headquartersLights[this.flashIndex], 1092, 188);
          }
        }
        break;
    }
  }  
}
