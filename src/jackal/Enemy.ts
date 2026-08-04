// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Enemy.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Explosion } from "./Explosion.js";
import { HitElement } from "./HitElement.js";
export abstract class Enemy extends HitElement {

  public solid: boolean = false; // other enemies will avoid bumping into this one
  public mine: boolean = false;  // player will explode if it hits this enemy
  
  public solidX1: number = 0;
  public solidY1: number = 0;
  public solidX2: number = 0;
  public solidY2: number = 0;
  
  public mineX1: number = 0;
  public mineY1: number = 0;
  public mineX2: number = 0;
  public mineY2: number = 0;
  
  public bulletHits: number = 0;  
  public points: number = 0;
  
  public explosionX: number = 0;
  public explosionY: number = 0;
  
  public playSoundOnRemove: boolean = true;
  
    public isSolid(...args: any[]): any {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
      return this.isSolid__overload0(args[0], args[1]);
    }
    if (args.length === 4 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number") {
      return this.isSolid__overload1(args[0], args[1], args[2], args[3]);
    }
    throw new Error(`No Java method overload matched isSolid: ${args.length}`);
  }
public isSolid__overload0(px: any, py: any): boolean {
    px -= this.x;
    py -= this.y;
    
    return py >= this.solidY1 && py <=this.solidY2&&px>= this.solidX1 && px <= this.solidX2;
  }
  
  public isSolid__overload1(x1: any, y1: any, x2: any, y2: any): boolean {
    
    return this.overlap(x1, y1, x2, y2,   
        this.x + this.solidX1,
        this.y + this.solidY1,
        this.x + this.solidX2,
        this.y + this.solidY2);
  }
  
    public isMine(...args: any[]): any {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
      return this.isMine__overload0(args[0], args[1]);
    }
    if (args.length === 4 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number") {
      return this.isMine__overload1(args[0], args[1], args[2], args[3]);
    }
    throw new Error(`No Java method overload matched isMine: ${args.length}`);
  }
public isMine__overload0(px: any, py: any): boolean {
    px -= this.x;
    py -= this.y;
    
    return py >= this.mineY1 && py <=this.mineY2&&px>= this.mineX1 && px <= this.mineX2;
  }
  
  public isMine__overload1(x1: any, y1: any, x2: any, y2: any): boolean {
    
    return this.overlap(x1, y1, x2, y2,   
        this.x + this.mineX1,
        this.y + this.mineY1,
        this.x + this.mineX2,
        this.y + this.mineY2);
  } 
  
  public flatten(): void {
    this.explode();
  }
  
  public explode(): void {
    if (!this.removeFlag) {
      this.remove();
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
      this.main.addPoints(this.points);
    }
  }
  
  // returns true if player bumped into the enemy
  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {  
    if (invincible) {
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
    if (this.playSoundOnRemove) {
      this.main.playHitExplodeSound(); 
    }
  }
  
  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
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
        new Explosion(this.x + this.explosionX, this.y + this.explosionY);
        this.main.addPoints(this.points);
      } else {
        this.main.playSoundAlways(this.main.bulletHitSound);
      }     
      return true;
    } else {
      return false;
    }
  }  

  public checkBounds(maxY: any): void {
    if (this.solid) {
      if (this.y + this.solidY1 > maxY) {
        this.playSoundOnRemove = false;
        this.remove();
      }      
    } else {
      if (this.y + this.hitY1 > maxY) {
        this.playSoundOnRemove = false;
        this.remove();
      }
    }
  }  
}
