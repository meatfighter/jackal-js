// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/PlayerMissile.java.
// Original Java imports: java.util.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Explosion } from "./Explosion.js";
import { GameElement } from "./GameElement.js";
import { TravelingExplosion } from "./TravelingExplosion.js";
export class PlayerMissile extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 4 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number") {
        let x = args[0];
        let y = args[1];
        let angle = args[2];
        let power = args[3];
            this.x = x;
                this.y = y;
                this.angle = angle;
                this.power = power;
    
                let unit = this.main.createUnitVector(angle);
                if (this.gameMode.player.longRange) {
                  this.vx = unit[0] * PlayerMissile.VELOCITY2;
                  this.vy = unit[1] * PlayerMissile.VELOCITY2;      
                } else {
                  this.vx = unit[0] * PlayerMissile.VELOCITY;
                  this.vy = unit[1] * PlayerMissile.VELOCITY;
                }
    
                this.enemies = this.gameMode.enemies;
    
                this.main.playSound(this.main.missileSound);
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly DISTANCE: number = 360;
  public static readonly DISTANCE2: number = 500;
  public static readonly TRAVEL_TIME: number = 32;
  public static readonly VELOCITY: number = PlayerMissile.DISTANCE / PlayerMissile.TRAVEL_TIME;
  public static readonly VELOCITY2: number = PlayerMissile.DISTANCE2 / PlayerMissile.TRAVEL_TIME;
  public static readonly MARGIN: number = 21;
  
  public vx: number = 0;
  public vy: number = 0;
  public angle: number = 0;
  public t: number = 0;
  public power: number = 0;
  public enemies: any = null as any;
  
    

  public init(): void {
    this.layer = 4;    
  }

  public update(): void {
    
    this.x += this.vx;
    this.y += this.vy;
    
    let x1 = this.x - PlayerMissile.MARGIN;
    let y1 = this.y - PlayerMissile.MARGIN;
    let x2 = this.x + PlayerMissile.MARGIN;
    let y2 = this.y + PlayerMissile.MARGIN;
    let hit = false;
    
    if (!this.gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
      for(let i = this.enemies.size() - 1; i >= 0; i--) {
        let enemy = this.enemies.get(i);
        if (!enemy.removeFlag 
            && enemy.attack(x1, y1, x2, y2, AttackSource.PLAYER_WEAPON)) {
          hit = true;
          break;
        }
      }
    }
    
    if (hit || ++this.t > PlayerMissile.TRAVEL_TIME || this.gameMode.isMissileTarget(this.x, this.y)) {
      this.removeFlag = true;
      if (!hit) {
        this.main.playExplodeSound3();
      }
      let explosion = new Explosion(this.x, this.y);
      if (this.power == 0) {
        explosion.setGrenadeExplosion(true);
      } else {
        new TravelingExplosion(this.x, this.y, -1, 0, true);
        new TravelingExplosion(this.x, this.y, 1, 0, false);
        if (this.power == 2) {
          new TravelingExplosion(this.x, this.y, 0, -1, false);
          new TravelingExplosion(this.x, this.y, 0, 1, false);
        }
      }
    }
  }

  public render(): void {
    this.main.drawRotated(this.main.playerMissile, this.x, this.y, this.angle);
  }  
}
