// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/GreenBoat.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
export class GreenBoat extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = x;
                this.y = y;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPRITE_TOGGLE_FRAMES: number = 12;
  public static readonly BULLET_DELAY: number = 91;
  public static readonly BULLET_TRAVEL_TIME: number = 2 * 91;
  public static readonly SPEED: number = 0.75;
  public static readonly MOVEMENT_TIME: number = 181;
  
  public player: any = null as any;
  public spriteIndex: number = 0;
  public spriteIndexCounter: number = 0;
  public bulletDelay: number = 0;
  public movementDelay: number = GreenBoat.MOVEMENT_TIME;
  
  

  public init(): void {
    super.init();
    
    this.player = this.gameMode.player;    
    
    this.layer = 3;
    
    this.bulletHits = 6;
    
    this.hitX1 = -40;
    this.hitY1 = -40;
    this.hitX2 = 40;
    this.hitY2 = 40;    
    
    this.points = 800;
  }

  public update(): void {
    if (this.movementDelay > 0) {
      this.movementDelay--;
      this.x -= GreenBoat.SPEED;
      this.y += GreenBoat.SPEED;
    }
    if (--this.spriteIndexCounter < 0) {
      this.spriteIndexCounter = GreenBoat.SPRITE_TOGGLE_FRAMES;
      this.spriteIndex ^= 1;
    }
    if (--this.bulletDelay < 0) {
      this.bulletDelay = GreenBoat.BULLET_DELAY;
      let X = this.x - 16;
      let Y = this.y + 16;
      let dx = this.player.x - X;
      let dy = this.player.y - Y;
      let imag = 1 / Math.sqrt(dx * dx + dy * dy);
      
      new EnemyBullet(X, Y, dx * imag, dy * imag, GreenBoat.BULLET_TRAVEL_TIME, true);
    }
  }

  public render(): void {
    this.main.draw(this.main.greenBoats[this.spriteIndex], this.x - 58, this.y - 64);
  }
}
