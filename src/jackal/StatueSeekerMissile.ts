// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/StatueSeekerMissile.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
export class StatueSeekerMissile extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let statueX = args[0];
        let statueY = args[1];
            this.statueX = statueX;
                this.statueY = statueY;
    
                this.player = this.gameMode.player;
    
                this.x = statueX + 48;
                this.y = statueY + 86;  
                this.vx = 0;
                this.vy = StatueSeekerMissile.SPEED;
    
                this.sprite = this.main.statueMissiles[0];
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly ROTATION_SPEED: number = 0.9;
  public static readonly EXPLODE_DELAY: number = 8 * 91;
  public static readonly SPEED: number = 3.5;
  public static readonly TO_RADIANS: number = (Math.PI / 180);
  public static readonly EXPLODE_OFFSET: number = 18 / StatueSeekerMissile.SPEED; 
  public static readonly ENTRY_DELAY: number = 16;
  
  public vx: number = 0;
  public vy: number = 0;
  public angle: number = 90;
  public sprite: any = null as any;
  public statueX: number = 0;
  public statueY: number = 0;
  public clipX: number = 0;
  public explodeDelay: number = 0; 
  public player: any = null as any;
  public entryDelay: number = StatueSeekerMissile.ENTRY_DELAY;
  
  

  public init(): void {
    super.init();
    
    this.layer = 4;
    
    this.bulletHits = 1;
    
    this.hitX1 = -22;
    this.hitY1 = -22;
    this.hitX2 = 22;
    this.hitY2 = 22;
    
    this.mine = true;
    this.mineX1 = -8;
    this.mineY1 = -8;
    this.mineX2 = 8;
    this.mineY2 = 8;    
  }

  public remove(): void {
    this.removeFlag = true;
    if (this.playSoundOnRemove) {
      this.main.playExplodeSound2();
    }
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && this.hit(x1, y1, x2, y2)) {
      this.playSoundOnRemove = false;
      this.remove();
      this.main.playHitExplodeSound();
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
      this.main.addPoints(this.points);
      return true;
    } else {
      return false;
    }
  }  

  public update(): void {
    
    if (this.entryDelay > 0) {
      this.entryDelay--;
      this.y += StatueSeekerMissile.SPEED;
    } else {
      let targetAngle = ((
          Math.atan2(this.player.y - this.y, this.player.x - this.x) * 180 / Math.PI));
      let deltaAngle = (targetAngle - this.angle + 180) % 360;
      if (deltaAngle < 0) {
        deltaAngle += 180;
      } else {
        deltaAngle -= 180;
      }
      if (Math.abs(deltaAngle) < StatueSeekerMissile.ROTATION_SPEED) {
        this.angle = targetAngle;
      } else {
        if (deltaAngle < 0) {
          this.angle -= StatueSeekerMissile.ROTATION_SPEED;
        } else {
          this.angle += StatueSeekerMissile.ROTATION_SPEED;
        }
      }
      
      let ang = StatueSeekerMissile.TO_RADIANS * this.angle;
      this.vx = StatueSeekerMissile.SPEED * Math.cos(ang);
      this.vy = StatueSeekerMissile.SPEED * Math.sin(ang);
      this.x += this.vx;
      this.y += this.vy;
    }
    
    if (++this.explodeDelay == StatueSeekerMissile.EXPLODE_DELAY) {
      this.playSoundOnRemove = false;
      if (!this.gameMode.isOutsideOfFrame(this.x, this.y)) {
        this.main.playExplodeSound2();
      }
      this.remove();            
      new Explosion(this.x + StatueSeekerMissile.EXPLODE_OFFSET * this.vx, this.y + StatueSeekerMissile.EXPLODE_OFFSET * this.vy)
          .setTiny(true);
    }
  }

  public render(): void {    
    if (this.entryDelay > 0) {
      this.gameMode.g.setWorldClip(this.statueX + 24, this.statueY + 100, 48, 96);  
      this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
      this.gameMode.g.clearWorldClip();
    } else {
      this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
    }
  }  
}
