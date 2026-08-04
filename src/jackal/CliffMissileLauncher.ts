// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/CliffMissileLauncher.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { SwampMissile } from "./SwampMissile.js";
export class CliffMissileLauncher extends Enemy {  public constructor(...args: any[]) {
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
  
  public static readonly LAUNCH_DELAY: number = 3 * 91;
  
  public launchDelay: number = 0;
  public ready: boolean = false;  
  
  

  public init(): void {
    super.init();  
    
    this.layer = 3;
    
    this.bulletHits = 10;
    
    this.hitX1 = 8;
    this.hitY1 = 8;
    this.hitX2 = 88;
    this.hitY2 = 88;
       
    this.points = 2000;
  }  
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if ((attackSource == AttackSource.PLAYER_WEAPON 
          || attackSource == AttackSource.TRAVELING_EXPLOSION)
        && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
      this.main.addPoints(this.points);
      return true;
    } else {
      return false;
    }
  }  

  public update(): void {
    if (this.ready) {
      if (this.launchDelay > 0) {
        this.launchDelay--;
      } else if (!this.gameMode.isOutsideOfFrame(this.x + 48, this.y + 69)) {
        this.launchDelay = CliffMissileLauncher.LAUNCH_DELAY;
        new SwampMissile(this.x + 48, this.y + 69);
      }
    } else {
      if (!this.gameMode.isOutsideOfFrame(this.x + 48, this.y + 69)) {
        this.ready = true;
      }
    }
  }

  public render(): void {
    this.main.draw(this.main.cliffMissileLauncher, this.x, this.y);
  }
}
