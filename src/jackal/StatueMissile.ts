// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/StatueMissile.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
export class StatueMissile extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let statueX = args[0];
        let statueY = args[1];
        let right = args[2];
            this.statueX = statueX;
                this.statueY = statueY;
                this.right = right;
    
                this.x = statueX + 48;
                this.y = statueY + 86;
    
                if (right) {
                  this.x -= 26;         
                  this.vx = StatueMissile.SPEED;
                  this.angle = 45;
                  this.sprite = this.main.statueMissiles[0];
                  this.clipX = statueX + 74;
                } else {
                  this.x += 26;
                  this.vx = -StatueMissile.SPEED;
                  this.angle = 315;
                  this.sprite = this.main.statueMissiles[1];
                  this.clipX = statueX - 22;
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly EXPLODE_DELAY: number = 91;
  public static readonly SPEED: number = 3.5;
  
  public vx: number = 0;
  public angle: number = 0;
  public sprite: any = null as any;
  public statueX: number = 0;
  public statueY: number = 0;
  public right: boolean = false;
  public clipX: number = 0;
  public explodeDelay: number = 0;

  

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

  public update(): void {
    this.x += this.vx;
    this.y += StatueMissile.SPEED;
    
    if (++this.explodeDelay == StatueMissile.EXPLODE_DELAY) {      
      this.playSoundOnRemove = false;
      if (!this.gameMode.isOutsideOfFrame(this.x, this.y)) {
        this.main.playExplodeSound2();
      }
      this.remove();      
      new Explosion(this.x + (this.right ? 18 : -18), this.y + 18).setTiny(true);
    }
  }

  public render(): void {
    if (this.right) {
      if (this.x > this.clipX) {
        this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
      } else {        
        this.gameMode.g.setWorldClip(this.statueX + 46, this.statueY, 52, 192);  
        this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
        this.gameMode.g.clearWorldClip();
      }
    } else {
      if (this.x < this.clipX) {
        this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
      } else {
        this.gameMode.g.setWorldClip(this.statueX - 30, this.statueY, 80, 192);  
        this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
        this.gameMode.g.clearWorldClip();
      }
    }
  }  
}
