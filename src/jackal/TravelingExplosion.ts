// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/TravelingExplosion.java.
// Original Java imports: java.util.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { GameElement } from "./GameElement.js";
export class TravelingExplosion extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 5 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number" && typeof args[4] === "boolean") {
        let x = args[0];
        let y = args[1];
        let vx = args[2];
        let vy = args[3];
        let notifier = args[4];
            this.x = x;
                this.y = y;
                this.notifier = notifier;
                this.vx = TravelingExplosion.VELOCITY * vx;
                this.vy = TravelingExplosion.VELOCITY * vy;
    
                this.enemies = this.gameMode.enemies;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly DISTANCE: number = 320;
  public static readonly TRAVEL_TIME: number = 64;
  public static readonly PERIOD0: number = TravelingExplosion.TRAVEL_TIME / 3;
  public static readonly PERIOD1: number = 2 * TravelingExplosion.TRAVEL_TIME / 3;
  public static readonly VELOCITY: number = TravelingExplosion.DISTANCE / TravelingExplosion.TRAVEL_TIME;
  public static readonly ALPHA: number = 0.6;
  
  public static readonly K0: number = 1.25 / TravelingExplosion.PERIOD0;
  public static readonly K1: number = 0.75 / (TravelingExplosion.PERIOD1 - TravelingExplosion.PERIOD0);
  public static readonly K2: number = 0.333 / (TravelingExplosion.TRAVEL_TIME - TravelingExplosion.PERIOD1);
  
  public vx: number = 0;
  public vy: number = 0;
  public notifier: boolean = false;
  public t: number = 0;
  public scale: number = 0;
  public enemies: any = null as any;
  
    
  
  public init(): void {
    this.layer = 4;
  }

  public update(): void {

    this.x += this.vx;
    this.y += this.vy;
    
    if (++this.t > TravelingExplosion.TRAVEL_TIME) {
      this.removeFlag = true;
      if (this.notifier) {
        this.gameMode.player.setWeaponArmed(true);
      }
    } else {
      let margin = 0;
      if (this.t < TravelingExplosion.PERIOD0) {      
        this.scale = 2.25 - this.t * TravelingExplosion.K0;
        margin = 28 * this.scale;
      } else if (this.t < TravelingExplosion.PERIOD1) {
        this.scale = 1.75 - (this.t - TravelingExplosion.PERIOD0) * TravelingExplosion.K1;
        margin = 18 * this.scale;
      } else {
        this.scale = 1.333 - (this.t - TravelingExplosion.PERIOD1) * TravelingExplosion.K2;
        margin = 16 * this.scale;
      }
       
      let x1 = this.x - margin;
      let y1 = this.y - margin;
      let x2 = this.x + margin;
      let y2 = this.y + margin;
      if (!this.gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
        for(let i = this.enemies.size() - 1; i >= 0; i--) {
          let enemy = this.enemies.get(i);
          if (!enemy.removeFlag) {
            enemy.attack(x1, y1, x2, y2, 
                AttackSource.TRAVELING_EXPLOSION);
          }
        }
      }
    }
  }

  public render(): void {
    if (this.t < TravelingExplosion.PERIOD0) {      
      this.main.drawScaled(this.main.explosions[1], this.x, this.y, this.scale, TravelingExplosion.ALPHA);
    } else if (this.t < TravelingExplosion.PERIOD1) {
      this.main.drawScaled(this.main.explosions[0], this.x, this.y, this.scale, TravelingExplosion.ALPHA);
    } else {
      this.main.drawScaled(this.main.explosions[3], this.x, this.y, this.scale, TravelingExplosion.ALPHA);
    }
  }
}
