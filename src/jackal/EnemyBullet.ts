// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/EnemyBullet.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { BulletHit } from "./BulletHit.js";
import { GameElement } from "./GameElement.js";
export class EnemyBullet extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 5 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number" && typeof args[4] === "number") {
        let x = args[0];
        let y = args[1];
        let dx = args[2];
        let dy = args[3];
        let travelTime = args[4];
            this.x = x;
                this.y = y;
                this.vx = EnemyBullet.SPEED * dx;
                this.vy = EnemyBullet.SPEED * dy;
                this.travelTime = travelTime;
                this.sprite = this.main.cannonball;
    
                this.enemyBullet = true;
        return;
    } else     if (args.length === 6 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number" && typeof args[4] === "number" && typeof args[5] === "boolean") {
        let x = args[0];
        let y = args[1];
        let dx = args[2];
        let dy = args[3];
        let travelTime = args[4];
        let white = args[5];
            this.x = x;
                this.y = y;
                this.vx = EnemyBullet.SPEED * dx;
                this.vy = EnemyBullet.SPEED * dy;
                this.travelTime = travelTime;
                this.sprite = white ? this.main.whiteBullet : this.main.yellowBullet;
    
                this.enemyBullet = true;
        return;
    } else     if (args.length === 7 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number" && typeof args[4] === "number" && typeof args[5] === "boolean" && typeof args[6] === "boolean") {
        let x = args[0];
        let y = args[1];
        let dx = args[2];
        let dy = args[3];
        let travelTime = args[4];
        let white = args[5];
        let multiplySpeed = args[6];
            this.x = x;
                this.y = y;
                if (multiplySpeed) {
                  this.vx = EnemyBullet.SPEED * dx;
                  this.vy = EnemyBullet.SPEED * dy;
                } else {
                  this.vx = dx;
                  this.vy = dy;
                }
                this.travelTime = travelTime;
                this.sprite = white ? this.main.whiteBullet : this.main.yellowBullet;
    
                this.enemyBullet = true;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPEED: number = 2.5;
  
  public static readonly MARGIN: number = 16;
  
  public travelTime: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public sprite: any = null as any;
  public player: any = null as any;
  
  
  
   
  
    

  public init(): void {
    this.layer = 4;
    
    this.player = this.gameMode.player;
  }

  public update(): void {    
    
    this.x += this.vx;
    this.y += this.vy;
    
    if (this.gameMode.isOutsideOfFrame(
        this.x - EnemyBullet.MARGIN, this.y - EnemyBullet.MARGIN, this.x + EnemyBullet.MARGIN, this.y + EnemyBullet.MARGIN)) {
      this.remove();
    } else if (--this.travelTime < 0 || this.gameMode.isSolid(this.x, this.y)
        || this.player.attack(this.x, this.y)) {
      this.remove();
      new BulletHit(this.x, this.y);
    } 
  }

  public render(): void { 
    this.main.drawCentered(this.sprite, this.x, this.y);
  }
}
