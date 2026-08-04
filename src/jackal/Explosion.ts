// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Explosion.java.
// Original Java imports: java.util.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { GameElement } from "./GameElement.js";
export class Explosion extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 6 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean" && typeof args[3] === "number" && typeof args[4] === "number") {
        let x = args[0];
        let y = args[1];
        let tiny = args[2];
        let delay = args[3];
        let alpha = args[4];
        let enemy = args[5];
            this.__construct(x, y, tiny, delay, alpha);
                this.enemy = enemy;
                this.enemyX = enemy.x;
                this.enemyY = enemy.y;
        return;
    } else     if (args.length === 5 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean" && typeof args[3] === "number" && typeof args[4] === "number") {
        let x = args[0];
        let y = args[1];
        let tiny = args[2];
        let delay = args[3];
        let alpha = args[4];
            this.__construct(x, y, false);
                this.setTiny(tiny);
                this.setDelayed(delay);
                this.setAlpha(alpha);
        return;
    } else     if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.__construct(x, y, false);
        return;
    } else     if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let x = args[0];
        let y = args[1];
        let playerExplosion = args[2];
            this.x = x;
                this.y = y;
                this.type = playerExplosion 
                    ? AttackSource.PLAYER_EXPLOSION : AttackSource.EXPLOSION;
    
                this.enemies = this.gameMode.enemies;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly GROW_RATE: number = 1.03;
  
  public size: number = 32;
  public spriteIndex: number = 0;
  public scale: number = 0;
  public grenadeExplosion: boolean = false;
  public damagesEnemies: boolean = true;
  public enemies: any = null as any;
  public type: number = 0;
  public tiny: boolean = false;
  public delay: number = 0;
  public alpha: number = 1;
  public enemyX: number = 0;
  public enemyY: number = 0;
  public enemy: any = null as any;
  
    
  
  
  
  
  
  
  
  public setAlpha(alpha: any): void {
    this.alpha = alpha;
  }
  
  public setTiny(tiny: any): void {
    this.tiny = tiny;
    if (tiny) {
      this.setDamagesEnemies(false);
    }
  }
  
  public setDelayed(delay: any): void {    
    this.delay = delay;
  }
  
  public setDamagesEnemies(damagesEnemies: any): void {
    this.damagesEnemies = damagesEnemies;
  }
  
  public setGrenadeExplosion(grenadeExplosion: any): void {
    this.grenadeExplosion = grenadeExplosion;
  }

  public init(): void {
    this.layer = 5;
  }

  public update(): void {
    if (this.delay > 0) {
      if (--this.delay == 0) {
        if (enemy != null) {
          this.x += enemy.x - this.enemyX;
          this.y += enemy.y - this.enemyY;
        }
      } else {
        return;
      }
    }
    
    this.size *= Explosion.GROW_RATE;
    
    if (this.size >= 80) {
      this.spriteIndex = 2;
      this.scale = this.size / 128;
    } else if (this.size >= 56) {
      this.spriteIndex = 1;
      this.scale = this.size / 56;
    } else {
      this.spriteIndex = 0;
      this.scale = this.size / 32;
    }
    
    let margin = this.size * 0.35;
    let x1 = this.x - margin;
    let y1 = this.y - margin;
    let x2 = this.x + margin;
    let y2 = this.y + margin;
    if (this.damagesEnemies && !this.gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
      for(let i = this.enemies.size() - 1; i >= 0; i--) {
        let enemy = this.enemies.get(i);
        if (!enemy.removeFlag) {
          enemy.attack(x1, y1, x2, y2, this.type);
        }
      }
    }
    
    if ((this.tiny && this.size > 68) || this.size > 128) {      
      this.removeFlag = true;
      if (this.grenadeExplosion) {
        this.gameMode.player.setWeaponArmed(true);
      }
    }   
  }

  public render(): void {
    if (this.alpha == 1) {
      this.main.drawScaled(this.main.explosions[this.spriteIndex], this.x, this.y, this.scale);
    } else {
      this.main.drawScaled(this.main.explosions[this.spriteIndex], this.x, this.y, this.scale, this.alpha);
    }
  }
}
