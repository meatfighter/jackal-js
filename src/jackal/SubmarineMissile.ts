// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/SubmarineMissile.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
export class SubmarineMissile extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            y -= 20;
    
                let player = this.gameMode.player;
                let ang = 180 
                    + SubmarineMissile.TO_DEGREES * Math.atan2(y - player.y, x - player.x);
                this.angle = 45 * Math.round(ang / 45);
                let v = this.main.createUnitVector(this.angle);
                this.vx = SubmarineMissile.SPEED * v[0];
                this.vy = SubmarineMissile.SPEED * v[1];
                this.tx = 18 * v[0];
                this.ty = 18 * v[1];
    
                this.x = x + v[0] * 24;
                this.y = y + v[1] * 24;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPEED: number = 8;
  
  public static readonly TO_DEGREES: number = (180.0 / Math.PI);

  public vy: number = 0;
  public vx: number = 0;
  public tx: number = 0;
  public ty: number = 0;
  public angle: number = 0;
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
    this.y += this.vy;
    
    if (this.gameMode.isOutsideOfFrame(this.x - 32, this.y - 32, this.x + 32, this.y + 32)) {
      this.playSoundOnRemove = false;
      this.remove();      
    }
  }

  public render(): void {
    this.main.drawRotated(this.main.statueMissiles[0], this.x, this.y, this.angle);
  }  
}
