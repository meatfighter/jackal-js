// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Explosion.java.
// Original Java imports: java.util.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { GameElement } from "./GameElement.js";
export class Explosion extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.size = 0;
    this.spriteIndex = 0;
    this.scale = 0;
    this.grenadeExplosion = false;
    this.damagesEnemies = false;
    this.enemies = null as any;
    this.type = 0;
    this.tiny = false;
    this.delay = 0;
    this.alpha = 0;
    this.enemyX = 0;
    this.enemyY = 0;
    this.enemy = null as any;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_Explosion(...args);
  }
  private __construct_Explosion(...args: any[]): void {
    if (args.length === 6 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean" && typeof args[3] === "number" && typeof args[4] === "number") {
        let xLocal4 = args[0];
        let yLocal4 = args[1];
        let tinyLocal2 = args[2];
        let delayLocal2 = args[3];
        let alphaLocal2 = args[4];
        let enemyLocal = args[5];
            this.__construct_Explosion(xLocal4, yLocal4, tinyLocal2, delayLocal2, alphaLocal2);
                this.enemy = enemyLocal;
                this.enemyX = enemyLocal.x;
                this.enemyY = enemyLocal.y;
        return;
    } else     if (args.length === 5 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean" && typeof args[3] === "number" && typeof args[4] === "number") {
        let xLocal3 = args[0];
        let yLocal3 = args[1];
        let tinyLocal = args[2];
        let delayLocal = args[3];
        let alphaLocal = args[4];
            this.__construct_Explosion(xLocal3, yLocal3, false);
                this.setTiny(tinyLocal);
                this.setDelayed(delayLocal);
                this.setAlpha(alphaLocal);
        return;
    } else     if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal2 = args[0];
        let yLocal2 = args[1];
            this.__construct_Explosion(xLocal2, yLocal2, false);
        return;
    } else     if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let xLocal = args[0];
        let yLocal = args[1];
        let playerExplosion = args[2];
            this.x = xLocal;
                this.y = yLocal;
                this.type = playerExplosion 
                    ? AttackSource.PLAYER_EXPLOSION : AttackSource.EXPLOSION;
    
                this.enemies = this.gameMode.enemies;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly GROW_RATE: number = 1.03;
  
  public size: number = 32;



  public damagesEnemies: boolean = true;




  public alpha: number = 1;



  
    
  
  
  
  
  
  
  
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
        if (this.enemy != null) {
          this.x += this.enemy.x - this.enemyX;
          this.y += this.enemy.y - this.enemyY;
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
        let enemyLocal = this.enemies.get(i);
        if (!enemyLocal.removeFlag) {
          enemyLocal.attack(x1, y1, x2, y2, this.type);
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
